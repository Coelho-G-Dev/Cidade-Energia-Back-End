import type { SupabaseClient } from "@supabase/supabase-js";
import { erroDoBanco } from "@/lib/http/erros";

export type Bairro = { id: string; nome: string };
export type Escola = { id: string; nome: string; bairro_id: string };
export type Aparelho = {
  id: string;
  codigo: string;
  nome: string;
  potencia_w: number;
  horas_padrao: number;
  icone: string | null;
};

export async function listarBairros(supabase: SupabaseClient): Promise<Bairro[]> {
  const { data, error } = await supabase.from("bairros").select("id, nome").order("nome");
  if (error) throw erroDoBanco(error);
  return data;
}

export async function listarEscolas(
  supabase: SupabaseClient,
  bairroId?: string,
): Promise<Escola[]> {
  let consulta = supabase.from("escolas").select("id, nome, bairro_id").order("nome");
  if (bairroId) consulta = consulta.eq("bairro_id", bairroId);
  const { data, error } = await consulta;
  if (error) throw erroDoBanco(error);
  return data;
}

function normalizarAparelho(a: Record<string, unknown>): Aparelho {
  return {
    id: String(a.id),
    codigo: String(a.codigo),
    nome: String(a.nome),
    potencia_w: Number(a.potencia_w),
    horas_padrao: Number(a.horas_padrao),
    icone: a.icone == null ? null : String(a.icone),
  };
}

const colunasAparelho = "id, codigo, nome, potencia_w, horas_padrao, icone";

export async function listarAparelhos(supabase: SupabaseClient): Promise<Aparelho[]> {
  const { data, error } = await supabase.from("aparelhos").select(colunasAparelho).order("nome");
  if (error) throw erroDoBanco(error);
  return data.map(normalizarAparelho);
}

export async function buscarAparelhos(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Aparelho[]> {
  const { data, error } = await supabase.from("aparelhos").select(colunasAparelho).in("id", ids);
  if (error) throw erroDoBanco(error);
  return data.map(normalizarAparelho);
}
