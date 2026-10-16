import type { SupabaseClient } from "@supabase/supabase-js";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { conquistasMerecidas, trilhasConcluidas, type Origem, type RetratoUsuario } from "@/lib/gamificacao/regras";
import { erroDoBanco, naoEncontrado } from "@/lib/http/erros";

export type ConquistaNova = { slug: string; nome: string };
export type ResultadoEvento = { pontosGanhos: number; conquistasNovas: ConquistaNova[] };

export const SEM_EVENTO: ResultadoEvento = { pontosGanhos: 0, conquistasNovas: [] };

async function pontosDaMissao(admin: SupabaseClient, missaoId: string): Promise<number> {
  const { data, error } = await admin.from("missoes").select("pontos").eq("id", missaoId).maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!data) throw naoEncontrado("MISSAO_NAO_ENCONTRADA", "Missão não encontrada.");
  return data.pontos;
}

export async function concederPontos(
  admin: SupabaseClient,
  perfilId: string,
  origem: Origem,
  referenciaId: string,
): Promise<number> {
  const pontos = origem === "missao_concluida" ? await pontosDaMissao(admin, referenciaId) : PONTOS_POR_ORIGEM[origem];
  const { data, error } = await admin
    .from("pontos_eventos")
    .upsert(
      { perfil_id: perfilId, origem, referencia_id: referenciaId, pontos },
      { onConflict: "perfil_id,origem,referencia_id", ignoreDuplicates: true },
    )
    .select("pontos");
  if (error) throw erroDoBanco(error);
  return (data ?? []).reduce((soma: number, linha: { pontos: number }) => soma + linha.pontos, 0);
}

async function carregarRetrato(admin: SupabaseClient, perfilId: string): Promise<RetratoUsuario> {
  const [simulacoes, trilhas, licoes, progresso, missoesFeitas, missoes, perfil] = await Promise.all([
    admin.from("simulacoes").select("id", { count: "exact", head: true }).eq("perfil_id", perfilId),
    admin.from("trilhas").select("id, slug"),
    admin.from("licoes").select("id, trilha_id"),
    admin.from("progresso_licoes").select("licao_id").eq("perfil_id", perfilId),
    admin.from("pontos_eventos").select("referencia_id").eq("perfil_id", perfilId).eq("origem", "missao_concluida"),
    admin.from("missoes").select("id, slug"),
    admin.from("perfis").select("bairro_id").eq("id", perfilId).maybeSingle(),
  ]);
  for (const r of [simulacoes, trilhas, licoes, progresso, missoesFeitas, missoes, perfil]) {
    if (r.error) throw erroDoBanco(r.error);
  }

  let pontosBairro = 0;
  const bairroId: string | null = perfil.data?.bairro_id ?? null;
  if (bairroId) {
    const { data, error } = await admin.from("ranking_bairros").select("pontos").eq("bairro_id", bairroId).maybeSingle();
    if (error) throw erroDoBanco(error);
    pontosBairro = Number(data?.pontos ?? 0);
  }

  const slugPorMissao = new Map((missoes.data ?? []).map((m: { id: string; slug: string }) => [m.id, m.slug]));
  const slugPorTrilha = new Map((trilhas.data ?? []).map((t: { id: string; slug: string }) => [t.id, t.slug]));
  const licoesDaTrilha = (licoes.data ?? []).map((l: { id: string; trilha_id: string }) => ({
    licaoId: l.id,
    trilhaSlug: slugPorTrilha.get(l.trilha_id) ?? l.trilha_id,
  }));
  const concluidas = new Set((progresso.data ?? []).map((p: { licao_id: string }) => p.licao_id));

  return {
    temSimulacao: (simulacoes.count ?? 0) > 0,
    trilhasConcluidas: trilhasConcluidas(licoesDaTrilha, concluidas),
    missoesConcluidas: (missoesFeitas.data ?? [])
      .map((e: { referencia_id: string }) => slugPorMissao.get(e.referencia_id))
      .filter((s): s is string => Boolean(s)),
    pontosBairro,
  };
}

export async function avaliarConquistas(admin: SupabaseClient, perfilId: string): Promise<ConquistaNova[]> {
  const [retrato, catalogo] = await Promise.all([
    carregarRetrato(admin, perfilId),
    admin.from("conquistas").select("slug, nome"),
  ]);
  if (catalogo.error) throw erroDoBanco(catalogo.error);

  const nomePorSlug = new Map((catalogo.data ?? []).map((c: ConquistaNova) => [c.slug, c.nome]));
  const merecidas = conquistasMerecidas(retrato).filter((slug) => nomePorSlug.has(slug));
  if (merecidas.length === 0) return [];

  const { data, error } = await admin
    .from("conquistas_usuario")
    .upsert(
      merecidas.map((slug) => ({ perfil_id: perfilId, conquista_slug: slug })),
      { onConflict: "perfil_id,conquista_slug", ignoreDuplicates: true },
    )
    .select("conquista_slug");
  if (error) throw erroDoBanco(error);

  return (data ?? []).map((c: { conquista_slug: string }) => ({
    slug: c.conquista_slug,
    nome: nomePorSlug.get(c.conquista_slug) ?? c.conquista_slug,
  }));
}

export async function registrarEvento(
  admin: SupabaseClient,
  perfilId: string,
  origem: Origem,
  referenciaId: string,
): Promise<ResultadoEvento> {
  const pontosGanhos = await concederPontos(admin, perfilId, origem, referenciaId);
  const conquistasNovas = await avaliarConquistas(admin, perfilId);
  return { pontosGanhos, conquistasNovas };
}
