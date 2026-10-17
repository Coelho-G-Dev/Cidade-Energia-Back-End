import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarEvento, SEM_EVENTO, type ResultadoEvento } from "@/lib/dados/pontos";
import { diaEmSaoLuis, missaoCompleta } from "@/lib/gamificacao/regras";
import { erroDoBanco, naoEncontrado } from "@/lib/http/erros";

export type Missao = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  trilhaSlug: string | null;
  pontos: number;
  diasNecessarios: number;
  diasRegistrados: number;
  diasMarcados: string[];
  registradaHoje: boolean;
  concluida: boolean;
};

type LinhaMissao = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string;
  pontos: number;
  dias_necessarios: number;
  trilha: { slug: string } | null;
};

export async function listarMissoes(supabase: SupabaseClient, perfilId: string | null, agora: Date): Promise<Missao[]> {
  const { data, error } = await supabase
    .from("missoes")
    .select("id, slug, titulo, descricao, pontos, dias_necessarios, trilha:trilhas(slug)")
    .order("ordem");
  if (error) throw erroDoBanco(error);

  let registros: { missao_id: string; dia: string }[] = [];
  if (perfilId) {
    const r = await supabase.from("missoes_registros").select("missao_id, dia").eq("perfil_id", perfilId);
    if (r.error) throw erroDoBanco(r.error);
    registros = r.data;
  }

  const hoje = diaEmSaoLuis(agora);
  return (data as unknown as LinhaMissao[]).map((m) => {
    const dias = registros.filter((r) => r.missao_id === m.id);
    const diasMarcados = dias.map((r) => r.dia).sort();
    return {
      id: m.id,
      slug: m.slug,
      titulo: m.titulo,
      descricao: m.descricao,
      trilhaSlug: m.trilha?.slug ?? null,
      pontos: m.pontos,
      diasNecessarios: m.dias_necessarios,
      diasRegistrados: dias.length,
      diasMarcados,
      registradaHoje: diasMarcados.includes(hoje),
      concluida: missaoCompleta(dias.length, m.dias_necessarios),
    };
  });
}

export type RegistroMissao = ResultadoEvento & {
  missaoId: string;
  dia: string;
  novoRegistro: boolean;
  diasRegistrados: number;
  diasNecessarios: number;
  concluida: boolean;
};

export async function registrarMissao(
  admin: SupabaseClient,
  perfilId: string,
  missaoId: string,
  agora: Date,
): Promise<RegistroMissao> {
  const { data: missao, error } = await admin
    .from("missoes")
    .select("id, dias_necessarios")
    .eq("id", missaoId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!missao) throw naoEncontrado("MISSAO_NAO_ENCONTRADA", "Missão não encontrada.");

  const dia = diaEmSaoLuis(agora);
  const insercao = await admin
    .from("missoes_registros")
    .upsert(
      { perfil_id: perfilId, missao_id: missaoId, dia },
      { onConflict: "perfil_id,missao_id,dia", ignoreDuplicates: true },
    )
    .select("dia");
  if (insercao.error) throw erroDoBanco(insercao.error);

  const contagem = await admin
    .from("missoes_registros")
    .select("dia", { count: "exact", head: true })
    .eq("perfil_id", perfilId)
    .eq("missao_id", missaoId);
  if (contagem.error) throw erroDoBanco(contagem.error);

  const diasRegistrados = contagem.count ?? 0;
  const concluida = missaoCompleta(diasRegistrados, missao.dias_necessarios);
  const evento = concluida ? await registrarEvento(admin, perfilId, "missao_concluida", missaoId) : SEM_EVENTO;

  return {
    missaoId,
    dia,
    novoRegistro: (insercao.data ?? []).length > 0,
    diasRegistrados,
    diasNecessarios: missao.dias_necessarios,
    concluida,
    ...evento,
  };
}
