import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HORAS_CACHE_CLIMATOLOGIA, HORAS_CACHE_IRRADIACAO, IRRADIACAO_MEDIA_SAO_LUIS } from "@/lib/config";
import { buscarIrradiacaoDiaria, buscarMediaClimatologica, type Buscar } from "@/lib/nasa-power";
import { clienteAdmin } from "@/lib/supabase/admin";

export type FonteIrradiacao = "nasa" | "cache" | "padrao";
export type Irradiacao = { data: string | null; valor: number; fonte: FonteIrradiacao; atualizadoEm: string | null };
export type Dependencias = { supabase?: SupabaseClient; buscar?: Buscar; agora?: Date };

type Tipo = "diaria" | "climatologia";
type LinhaCache = { data: string | null; valor: number | string | null; buscado_em: string; atualizado_em: string | null };
type Leitura = { data: string | null; valor: number };

const MS_POR_HORA = 3_600_000;
const TABELA = "cache_irradiacao";

const VALIDADE_HORAS: Record<Tipo, number> = {
  diaria: HORAS_CACHE_IRRADIACAO,
  climatologia: HORAS_CACHE_CLIMATOLOGIA,
};

const RESERVA: Irradiacao = { data: null, valor: IRRADIACAO_MEDIA_SAO_LUIS, fonte: "padrao", atualizadoEm: null };

async function lerCache(supabase: SupabaseClient, tipo: Tipo): Promise<LinhaCache | null> {
  const { data, error } = await supabase.from(TABELA).select("data, valor, buscado_em, atualizado_em").eq("tipo", tipo).maybeSingle();
  if (error) throw new Error(`cache_irradiacao: ${error.message}`);
  return data;
}

export function cacheFresco(buscadoEm: string, agora: Date, validadeHoras: number): boolean {
  const idade = agora.getTime() - Date.parse(buscadoEm);
  return idade >= 0 && idade < validadeHoras * MS_POR_HORA;
}

async function reservarBusca(supabase: SupabaseClient, tipo: Tipo, linha: LinhaCache | null, agora: Date): Promise<boolean> {
  const buscadoEm = agora.toISOString();
  const { data, error } = linha
    ? await supabase.from(TABELA).update({ buscado_em: buscadoEm }).eq("tipo", tipo).eq("buscado_em", linha.buscado_em).select("tipo")
    : await supabase.from(TABELA).upsert({ tipo, buscado_em: buscadoEm }, { onConflict: "tipo", ignoreDuplicates: true }).select("tipo");
  if (error) throw new Error(`cache_irradiacao: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

async function gravar(supabase: SupabaseClient, tipo: Tipo, leitura: Leitura, agora: Date): Promise<void> {
  const { error } = await supabase
    .from(TABELA)
    .update({ data: leitura.data, valor: leitura.valor, buscado_em: agora.toISOString(), atualizado_em: agora.toISOString() })
    .eq("tipo", tipo);
  if (error) throw new Error(`cache_irradiacao: ${error.message}`);
}

function doCache(linha: LinhaCache | null): Irradiacao | null {
  if (linha?.valor == null) return null;
  return { data: linha.data, valor: Number(linha.valor), fonte: "cache", atualizadoEm: linha.atualizado_em };
}

function maisAntigo(novo: string | null, guardado: string | null): boolean {
  return novo !== null && guardado !== null && novo < guardado;
}

function registrarFalha(tipo: Tipo, e: unknown): void {
  console.error(`Irradiação (${tipo}): ${e instanceof Error ? e.message : "erro desconhecido"}`);
}

async function obter(tipo: Tipo, buscarNaApi: () => Promise<Leitura>, deps: Dependencias): Promise<Irradiacao> {
  const agora = deps.agora ?? new Date();
  let supabase: SupabaseClient;
  let linha: LinhaCache | null = null;

  try {
    supabase = deps.supabase ?? clienteAdmin();
    linha = await lerCache(supabase, tipo);
    if (linha && cacheFresco(linha.buscado_em, agora, VALIDADE_HORAS[tipo])) return doCache(linha) ?? RESERVA;
    if (!(await reservarBusca(supabase, tipo, linha, agora))) return doCache(linha) ?? RESERVA;
  } catch (e) {
    registrarFalha(tipo, e);
    return doCache(linha) ?? RESERVA;
  }

  let leitura: Leitura;
  try {
    leitura = await buscarNaApi();
  } catch (e) {
    registrarFalha(tipo, e);
    return doCache(linha) ?? RESERVA;
  }
  if (maisAntigo(leitura.data, linha?.data ?? null)) return doCache(linha) ?? RESERVA;

  try {
    await gravar(supabase, tipo, leitura, agora);
  } catch (e) {
    registrarFalha(tipo, e);
  }
  return { ...leitura, fonte: "nasa", atualizadoEm: agora.toISOString() };
}

export function irradiacaoDeHoje(deps: Dependencias = {}): Promise<Irradiacao> {
  const agora = deps.agora ?? new Date();
  return obter("diaria", () => buscarIrradiacaoDiaria(agora, deps.buscar), { ...deps, agora });
}

export function irradiacaoMediaAnual(deps: Dependencias = {}): Promise<Irradiacao> {
  return obter("climatologia", async () => ({ data: null, valor: await buscarMediaClimatologica(deps.buscar) }), deps);
}
