import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarEvento, type ResultadoEvento } from "@/lib/dados/pontos";
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
  licoes: { id: string; ordem: number; titulo: string; tipo: TipoLicao; concluida: boolean }[];
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

export async function obterTrilha(
  supabase: SupabaseClient,
  slug: string,
  perfilId: string | null,
): Promise<TrilhaDetalhada> {
  const { data: trilha, error } = await supabase.from("trilhas").select(colunasTrilha).eq("slug", slug).maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!trilha) throw naoEncontrado("TRILHA_NAO_ENCONTRADA", "Trilha não encontrada.");

  const [licoes, concluidas] = await Promise.all([
    supabase.from("licoes").select(colunasLicao).eq("trilha_id", trilha.id).order("ordem"),
    licoesConcluidas(supabase, perfilId),
  ]);
  if (licoes.error) throw erroDoBanco(licoes.error);
  const linhas = licoes.data as LinhaLicao[];

  return {
    ...resumir(trilha as LinhaTrilha, linhas, concluidas),
    licoes: linhas.map((l) => ({
      id: l.id,
      ordem: l.ordem,
      titulo: l.titulo,
      tipo: l.tipo,
      concluida: concluidas.has(l.id),
    })),
  };
}

export async function obterLicao(
  supabase: SupabaseClient,
  licaoId: string,
  perfilId: string | null,
): Promise<LicaoDetalhada> {
  const { data: licao, error } = await supabase
    .from("licoes")
    .select("id, trilha_id, ordem, titulo, conteudo, tipo")
    .eq("id", licaoId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!licao) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");

  const [trilha, irmas, perguntas, concluidas] = await Promise.all([
    supabase.from("trilhas").select("slug, titulo").eq("id", licao.trilha_id).single(),
    supabase.from("licoes").select("id, ordem").eq("trilha_id", licao.trilha_id).order("ordem"),
    supabase.from("perguntas").select("id", { count: "exact", head: true }).eq("licao_id", licaoId),
    licoesConcluidas(supabase, perfilId),
  ]);
  for (const r of [trilha, irmas, perguntas]) if (r.error) throw erroDoBanco(r.error);

  const proxima = (irmas.data as { id: string; ordem: number }[]).find((l) => l.ordem > licao.ordem);

  return {
    id: licao.id,
    trilha: trilha.data as { slug: string; titulo: string },
    ordem: licao.ordem,
    titulo: licao.titulo,
    conteudo: licao.conteudo,
    tipo: licao.tipo,
    totalPerguntas: perguntas.count ?? 0,
    concluida: concluidas.has(licao.id),
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
  const { data: licao, error } = await admin.from("licoes").select("id, tipo").eq("id", licaoId).maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!licao) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");

  if (licao.tipo !== tipoEsperado) {
    throw tipoEsperado === "texto"
      ? new ErroApi(400, "LICAO_E_PEDALE", "Esta lição é do Pedale e veja: conclua pelo POST /api/pedale/concluir.")
      : new ErroApi(400, "LICAO_NAO_E_PEDALE", "Esta lição não é do Pedale e veja.");
  }

  const progresso = await admin
    .from("progresso_licoes")
    .upsert({ perfil_id: perfilId, licao_id: licaoId }, { onConflict: "perfil_id,licao_id", ignoreDuplicates: true });
  if (progresso.error) throw erroDoBanco(progresso.error);

  const origem = tipoEsperado === "texto" ? "licao_concluida" : "pedale_concluido";
  const evento = await registrarEvento(admin, perfilId, origem, licaoId);
  return { licaoId, concluida: true, ...evento };
}
