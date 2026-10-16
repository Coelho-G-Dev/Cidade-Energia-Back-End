import type { SupabaseClient } from "@supabase/supabase-js";
import { erroDoBanco } from "@/lib/http/erros";

export type ItemRanking = {
  id: string;
  nome: string;
  bairroId?: string;
  pontos: number;
  participantes: number;
  posicao: number;
};

export async function listarRanking(supabase: SupabaseClient, tipo: "bairros" | "escolas"): Promise<ItemRanking[]> {
  const consulta =
    tipo === "bairros"
      ? supabase.from("ranking_bairros").select("bairro_id, nome, pontos, participantes, posicao")
      : supabase.from("ranking_escolas").select("escola_id, bairro_id, nome, pontos, participantes, posicao");
  const { data, error } = await consulta.order("posicao").order("nome");
  if (error) throw erroDoBanco(error);

  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(tipo === "bairros" ? r.bairro_id : r.escola_id),
    nome: String(r.nome),
    ...(tipo === "escolas" ? { bairroId: String(r.bairro_id) } : {}),
    pontos: Number(r.pontos),
    participantes: Number(r.participantes),
    posicao: Number(r.posicao),
  }));
}

export type PontoMapa = {
  id: string;
  nome: string;
  tipo: "solar" | "coleta" | "acao";
  latitude: number;
  longitude: number;
  descricao: string;
};

export async function listarPontosMapa(
  supabase: SupabaseClient,
  tipo?: PontoMapa["tipo"],
): Promise<PontoMapa[]> {
  let consulta = supabase.from("pontos_mapa").select("id, nome, tipo, latitude, longitude, descricao").order("nome");
  if (tipo) consulta = consulta.eq("tipo", tipo);
  const { data, error } = await consulta;
  if (error) throw erroDoBanco(error);

  return (data as Record<string, unknown>[]).map((p) => ({
    id: String(p.id),
    nome: String(p.nome),
    tipo: p.tipo as PontoMapa["tipo"],
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    descricao: String(p.descricao),
  }));
}
