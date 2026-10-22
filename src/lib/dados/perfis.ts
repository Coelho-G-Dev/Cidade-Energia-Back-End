import type { SupabaseClient } from "@supabase/supabase-js";
import { FUSO_SAO_LUIS } from "@/lib/config";
import { ErroApi, erroDoBanco, naoEncontrado } from "@/lib/http/erros";
import type { AtualizarPerfil } from "@/lib/validacao/perfil";

type LinhaPerfil = {
  id: string;
  primeiro_nome: string | null;
  bairro_id: string | null;
  escola_id: string | null;
  escola_verificada: boolean;
  criado_em: string;
};

type SituacaoTrocas = {
  limite_trocas: number;
  trocas_restantes: number;
  proxima_troca_em: string | null;
};

export type Perfil = LinhaPerfil & SituacaoTrocas & { tem_perfil: boolean };

const colunas = "id, primeiro_nome, bairro_id, escola_id, escola_verificada, criado_em";

async function situacaoTrocas(supabase: SupabaseClient, usuarioId: string): Promise<SituacaoTrocas> {
  const { data, error } = await supabase
    .from("situacao_trocas")
    .select("limite, trocas_restantes, proxima_troca_em")
    .eq("perfil_id", usuarioId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!data) throw new Error("situacao_trocas sem linha para o perfil");
  return {
    limite_trocas: Number(data.limite),
    trocas_restantes: Number(data.trocas_restantes),
    proxima_troca_em: data.proxima_troca_em == null ? null : new Date(data.proxima_troca_em).toISOString(),
  };
}

function montarPerfil(linha: LinhaPerfil, trocas: SituacaoTrocas): Perfil {
  return { ...linha, tem_perfil: linha.primeiro_nome !== null, ...trocas };
}

export async function obterPerfil(supabase: SupabaseClient, usuarioId: string): Promise<Perfil> {
  const [perfil, trocas] = await Promise.all([
    supabase.from("perfis").select(colunas).eq("id", usuarioId).maybeSingle(),
    situacaoTrocas(supabase, usuarioId),
  ]);
  if (perfil.error) throw erroDoBanco(perfil.error);
  if (!perfil.data) throw naoEncontrado("PERFIL_NAO_ENCONTRADO", "Perfil não encontrado.");
  return montarPerfil(perfil.data, trocas);
}

export type PosicaoRanking = { posicao: number | null; pontos: number };

export type ResumoPerfil = {
  pontos: number;
  licoesConcluidas: number;
  trilhasConcluidas: number;
  missoesConcluidas: number;
  conquistas: { slug: string; nome: string; criterio: string; obtida: boolean; obtidaEm: string | null }[];
  escola: PosicaoRanking | null;
  bairro: PosicaoRanking | null;
};

const posicao = (p: unknown, pts: unknown): PosicaoRanking | null =>
  pts == null ? null : { posicao: p == null ? null : Number(p), pontos: Number(pts) };

export async function obterResumo(supabase: SupabaseClient, usuarioId: string): Promise<ResumoPerfil> {
  const [resumo, catalogo, obtidas] = await Promise.all([
    supabase.from("perfil_resumo").select("*").eq("perfil_id", usuarioId).maybeSingle(),
    supabase.from("conquistas").select("slug, nome, criterio").order("ordem"),
    supabase.from("conquistas_usuario").select("conquista_slug, obtida_em").eq("perfil_id", usuarioId),
  ]);
  for (const r of [resumo, catalogo, obtidas]) if (r.error) throw erroDoBanco(r.error);
  if (!resumo.data) throw naoEncontrado("PERFIL_NAO_ENCONTRADO", "Perfil não encontrado.");

  const r = resumo.data;
  const obtidaEm = new Map(
    (obtidas.data as { conquista_slug: string; obtida_em: string }[]).map((c) => [c.conquista_slug, c.obtida_em]),
  );

  return {
    pontos: Number(r.pontos),
    licoesConcluidas: Number(r.licoes_concluidas),
    trilhasConcluidas: Number(r.trilhas_concluidas),
    missoesConcluidas: Number(r.missoes_concluidas),
    conquistas: (catalogo.data as { slug: string; nome: string; criterio: string }[]).map((c) => ({
      ...c,
      obtida: obtidaEm.has(c.slug),
      obtidaEm: obtidaEm.get(c.slug) ?? null,
    })),
    escola: posicao(r.posicao_escola, r.pontos_escola),
    bairro: posicao(r.posicao_bairro, r.pontos_bairro),
  };
}

const CODIGO_LIMITE_TROCAS = "CE001";
const CODIGO_ESCOLA_INATIVA = "CE002";

const formatoLiberacao = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_SAO_LUIS,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function mensagemLimiteTrocas(liberadaEm: Date | null): string {
  const base = "Você atingiu o limite de trocas de bairro ou escola.";
  if (!liberadaEm || Number.isNaN(liberadaEm.getTime())) return `${base} Tente de novo mais tarde.`;
  const p = Object.fromEntries(formatoLiberacao.formatToParts(liberadaEm).map((parte) => [parte.type, parte.value]));
  return `${base} Você poderá trocar de novo a partir de ${p.day}/${p.month} às ${p.hour}:${p.minute}.`;
}

async function resolverEscola(supabase: SupabaseClient, dados: AtualizarPerfil): Promise<string | null> {
  if (dados.codigo_turma) {
    const { data, error } = await supabase.rpc("resolver_codigo_turma", {
      p_codigo: dados.codigo_turma,
    });
    if (error) throw erroDoBanco(error);
    if (!data) throw naoEncontrado("TURMA_NAO_ENCONTRADA", "Não encontramos uma turma com esse código.");
    return data as string;
  }
  return dados.escola_id ?? null;
}

async function confirmarTurma(supabase: SupabaseClient, codigo: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("confirmar_turma", { p_codigo: codigo });
  if (error) throw erroDoBanco(error);
  return data === true;
}

export async function atualizarPerfil(
  supabase: SupabaseClient,
  usuarioId: string,
  dados: AtualizarPerfil,
): Promise<Perfil> {
  const escolaId = await resolverEscola(supabase, dados);

  const { data, error } = await supabase
    .from("perfis")
    .upsert(
      {
        id: usuarioId,
        primeiro_nome: dados.primeiro_nome,
        bairro_id: dados.bairro_id,
        escola_id: escolaId,
      },
      { onConflict: "id" },
    )
    .select(colunas)
    .single();

  if (error) {
    if (error.code === CODIGO_LIMITE_TROCAS) {
      throw new ErroApi(429, "LIMITE_DE_TROCAS", mensagemLimiteTrocas(error.hint ? new Date(error.hint) : null));
    }
    if (error.code === CODIGO_ESCOLA_INATIVA) {
      throw new ErroApi(409, "ESCOLA_INATIVA", "Essa escola não está mais disponível. Escolha outra.");
    }
    const convertido = erroDoBanco(error);
    if (convertido instanceof ErroApi) {
      throw new ErroApi(404, "BAIRRO_OU_ESCOLA_NAO_ENCONTRADO", "Bairro ou escola não encontrado.");
    }
    throw convertido;
  }

  const escolaVerificada = dados.codigo_turma ? await confirmarTurma(supabase, dados.codigo_turma) : data.escola_verificada;
  return montarPerfil({ ...data, escola_verificada: escolaVerificada }, await situacaoTrocas(supabase, usuarioId));
}
