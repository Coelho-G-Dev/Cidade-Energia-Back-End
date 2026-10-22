import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarEvento, type ResultadoEvento } from "@/lib/dados/pontos";
import { licaoPendenteAntes, type LicaoPendente } from "@/lib/gamificacao/regras";
import { ErroApi, erroDoBanco, naoEncontrado } from "@/lib/http/erros";

type TipoLicao = "texto" | "pedale";

type LinhaTrilha = { id: string; slug: string; titulo: string; descricao: string; tema: string; minutos: number };
type LinhaLicao = { id: string; trilha_id: string; ordem: number; titulo: string; tipo: TipoLicao };

export type ResumoTrilha = Omit<LinhaTrilha, "id"> & {
  id: string;
  totalLicoes: number;
  licoesConcluidas: number;
  concluida: boolean;
};

export type TrilhaDetalhada = ResumoTrilha & {
  licoes: { id: string; ordem: number; titulo: string; tipo: TipoLicao; concluida: boolean; liberada: boolean }[];
};

export type LicaoDetalhada = {
  id: string;
  trilha: { slug: string; titulo: string };
  ordem: number;
  titulo: string;
  conteudo: string;
  tipo: TipoLicao;
  totalPerguntas: number;
  concluida: boolean;
  liberada: boolean;
  licaoPendente: LicaoPendente | null;
  proximaLicaoId: string | null;
};

const colunasTrilha = "id, slug, titulo, descricao, tema, minutos";
const colunasLicao = "id, trilha_id, ordem, titulo, tipo";

async function licoesConcluidas(supabase: SupabaseClient, perfilId: string | null): Promise<Set<string>> {
  if (!perfilId) return new Set();
  const { data, error } = await supabase.from("progresso_licoes").select("licao_id").eq("perfil_id", perfilId);
  if (error) throw erroDoBanco(error);
  return new Set(data.map((p: { licao_id: string }) => p.licao_id));
}

function resumir(trilha: LinhaTrilha, licoes: LinhaLicao[], concluidas: Set<string>): ResumoTrilha {
  const feitas = licoes.filter((l) => concluidas.has(l.id)).length;
  return {
    ...trilha,
    totalLicoes: licoes.length,
    licoesConcluidas: feitas,
    concluida: licoes.length > 0 && feitas === licoes.length,
  };
}

export async function listarTrilhas(supabase: SupabaseClient, perfilId: string | null): Promise<ResumoTrilha[]> {
  const [trilhas, licoes, concluidas] = await Promise.all([
    supabase.from("trilhas").select(colunasTrilha).order("ordem"),
    supabase.from("licoes").select(colunasLicao),
    licoesConcluidas(supabase, perfilId),
  ]);
  if (trilhas.error) throw erroDoBanco(trilhas.error);
  if (licoes.error) throw erroDoBanco(licoes.error);

  return (trilhas.data as LinhaTrilha[]).map((t) =>
    resumir(t, (licoes.data as LinhaLicao[]).filter((l) => l.trilha_id === t.id), concluidas),
  );
}

type Relacao<T> = T | T[] | null;
const umSo = <T>(r: Relacao<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);
const porOrdem = <T extends { ordem: number }>(linhas: T[]) => [...linhas].sort((a, b) => a.ordem - b.ordem);

export async function obterTrilha(
  supabase: SupabaseClient,
  slug: string,
  perfilId: string | null,
): Promise<TrilhaDetalhada> {
  const [consulta, concluidas] = await Promise.all([
    supabase
      .from("trilhas")
      .select(`${colunasTrilha}, licoes(${colunasLicao})`)
      .eq("slug", slug)
      .maybeSingle<LinhaTrilha & { licoes: LinhaLicao[] }>(),
    licoesConcluidas(supabase, perfilId),
  ]);
  if (consulta.error) throw erroDoBanco(consulta.error);
  if (!consulta.data) throw naoEncontrado("TRILHA_NAO_ENCONTRADA", "Trilha não encontrada.");
  const { licoes, ...trilha } = consulta.data;
  const linhas = porOrdem(licoes);

  return {
    ...resumir(trilha, linhas, concluidas),
    licoes: linhas.map((l) => ({
      id: l.id,
      ordem: l.ordem,
      titulo: l.titulo,
      tipo: l.tipo,
      concluida: concluidas.has(l.id),
      liberada: licaoPendenteAntes(linhas, l, concluidas) === null,
    })),
  };
}

export async function obterLicao(
  supabase: SupabaseClient,
  licaoId: string,
  perfilId: string | null,
): Promise<LicaoDetalhada> {
  type Irma = { id: string; ordem: number; titulo: string };
  type LinhaLicaoDetalhada = {
    id: string;
    ordem: number;
    titulo: string;
    conteudo: string;
    tipo: TipoLicao;
    trilhas: Relacao<{ slug: string; titulo: string; licoes: Irma[] }>;
    perguntas: { id: string }[];
  };

  const [consulta, concluidas] = await Promise.all([
    supabase
      .from("licoes")
      .select("id, ordem, titulo, conteudo, tipo, trilhas(slug, titulo, licoes(id, ordem, titulo)), perguntas(id)")
      .eq("id", licaoId)
      .maybeSingle<LinhaLicaoDetalhada>(),
    licoesConcluidas(supabase, perfilId),
  ]);
  if (consulta.error) throw erroDoBanco(consulta.error);
  const licao = consulta.data;
  if (!licao) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");
  const trilha = umSo(licao.trilhas);
  if (!trilha) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");

  const licoesDaTrilha = porOrdem(trilha.licoes);
  const proxima = licoesDaTrilha.find((l) => l.ordem > licao.ordem);
  const pendente = licaoPendenteAntes(licoesDaTrilha, licao, concluidas);

  return {
    id: licao.id,
    trilha: { slug: trilha.slug, titulo: trilha.titulo },
    ordem: licao.ordem,
    titulo: licao.titulo,
    conteudo: licao.conteudo,
    tipo: licao.tipo,
    totalPerguntas: licao.perguntas.length,
    concluida: concluidas.has(licao.id),
    liberada: pendente === null,
    licaoPendente: pendente,
    proximaLicaoId: proxima?.id ?? null,
  };
}

export type LicaoConcluida = ResultadoEvento & { licaoId: string; concluida: true };

export async function concluirLicao(
  admin: SupabaseClient,
  perfilId: string,
  licaoId: string,
  tipoEsperado: TipoLicao,
): Promise<LicaoConcluida> {
  const { data: licao, error } = await admin
    .from("licoes")
    .select("id, trilha_id, ordem, tipo")
    .eq("id", licaoId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!licao) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");

  if (licao.tipo !== tipoEsperado) {
    throw tipoEsperado === "texto"
      ? new ErroApi(400, "LICAO_E_PEDALE", "Esta lição é do Pedale e veja: conclua pelo POST /api/pedale/concluir.")
      : new ErroApi(400, "LICAO_NAO_E_PEDALE", "Esta lição não é do Pedale e veja.");
  }

  const [irmas, concluidas] = await Promise.all([
    admin.from("licoes").select("id, ordem, titulo").eq("trilha_id", licao.trilha_id).order("ordem"),
    licoesConcluidas(admin, perfilId),
  ]);
  if (irmas.error) throw erroDoBanco(irmas.error);
  const pendente = licaoPendenteAntes(irmas.data as { id: string; ordem: number; titulo: string }[], licao, concluidas);
  if (pendente) throw new ErroApi(409, "LICAO_BLOQUEADA", `Conclua antes a lição "${pendente.titulo}".`);

  const progresso = await admin
    .from("progresso_licoes")
    .upsert({ perfil_id: perfilId, licao_id: licaoId }, { onConflict: "perfil_id,licao_id", ignoreDuplicates: true });
  if (progresso.error) throw erroDoBanco(progresso.error);

  const origem = tipoEsperado === "texto" ? "licao_concluida" : "pedale_concluido";
  const evento = await registrarEvento(admin, perfilId, origem, licaoId);
  return { licaoId, concluida: true, ...evento };
}
