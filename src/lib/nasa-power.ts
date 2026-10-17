import { z } from "zod";
import {
  DIAS_BUSCA_IRRADIACAO,
  IRRADIACAO_MAXIMA_VALIDA,
  LATITUDE_SAO_LUIS,
  LONGITUDE_SAO_LUIS,
  NASA_POWER_URL,
  TIMEOUT_NASA_POWER_MS,
} from "@/lib/config";
import { diaEmSaoLuis } from "@/lib/gamificacao/regras";

export const PARAMETRO_IRRADIACAO = "ALLSKY_SFC_SW_DWN";

export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;
export type IrradiacaoDiaria = { data: string; valor: number };

export class ErroNasaPower extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroNasaPower";
  }
}

const respostaDiaria = z.object({
  properties: z.object({
    parameter: z.object({ [PARAMETRO_IRRADIACAO]: z.record(z.string().regex(/^\d{8}$/), z.number()) }),
  }),
});

const respostaClimatologia = z.object({
  properties: z.object({
    parameter: z.object({ [PARAMETRO_IRRADIACAO]: z.object({ ANN: z.number() }) }),
  }),
});

const MS_POR_DIA = 86_400_000;

export function valorValido(valor: number): boolean {
  return Number.isFinite(valor) && valor >= 0 && valor <= IRRADIACAO_MAXIMA_VALIDA;
}

export function ultimoDiaValido(serie: Record<string, number>): IrradiacaoDiaria | null {
  const dias = Object.keys(serie).sort().reverse();
  for (const dia of dias) {
    const valor = serie[dia];
    if (valor !== undefined && valorValido(valor)) {
      return { data: `${dia.slice(0, 4)}-${dia.slice(4, 6)}-${dia.slice(6, 8)}`, valor };
    }
  }
  return null;
}

export function periodoDeBusca(agora: Date, dias = DIAS_BUSCA_IRRADIACAO): { inicio: string; fim: string } {
  const fim = new Date(`${diaEmSaoLuis(agora)}T00:00:00Z`);
  const inicio = new Date(fim.getTime() - (dias - 1) * MS_POR_DIA);
  const compacto = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  return { inicio: compacto(inicio), fim: compacto(fim) };
}

function parametrosComuns(): URLSearchParams {
  return new URLSearchParams({
    parameters: PARAMETRO_IRRADIACAO,
    community: "RE",
    longitude: String(LONGITUDE_SAO_LUIS),
    latitude: String(LATITUDE_SAO_LUIS),
    format: "JSON",
  });
}

async function buscarJson(url: string, buscar: Buscar): Promise<unknown> {
  let resposta: Response;
  try {
    resposta = await buscar(url, { signal: AbortSignal.timeout(TIMEOUT_NASA_POWER_MS), cache: "no-store" });
  } catch (e) {
    throw new ErroNasaPower(`Falha de rede na NASA POWER: ${e instanceof Error ? e.name : "desconhecida"}`);
  }
  if (!resposta.ok) throw new ErroNasaPower(`NASA POWER respondeu ${resposta.status}`);
  try {
    return await resposta.json();
  } catch {
    throw new ErroNasaPower("NASA POWER devolveu um JSON inválido");
  }
}

export async function buscarIrradiacaoDiaria(agora: Date, buscar: Buscar = fetch): Promise<IrradiacaoDiaria> {
  const { inicio, fim } = periodoDeBusca(agora);
  const parametros = parametrosComuns();
  parametros.set("start", inicio);
  parametros.set("end", fim);

  const corpo = respostaDiaria.safeParse(await buscarJson(`${NASA_POWER_URL}/daily/point?${parametros}`, buscar));
  if (!corpo.success) throw new ErroNasaPower("Formato inesperado na resposta diária da NASA POWER");

  const ultimo = ultimoDiaValido(corpo.data.properties.parameter[PARAMETRO_IRRADIACAO]);
  if (!ultimo) throw new ErroNasaPower(`Nenhum dia válido entre ${inicio} e ${fim}`);
  return ultimo;
}

export async function buscarMediaClimatologica(buscar: Buscar = fetch): Promise<number> {
  const url = `${NASA_POWER_URL}/climatology/point?${parametrosComuns()}`;
  const corpo = respostaClimatologia.safeParse(await buscarJson(url, buscar));
  if (!corpo.success) throw new ErroNasaPower("Formato inesperado na climatologia da NASA POWER");

  const media = corpo.data.properties.parameter[PARAMETRO_IRRADIACAO].ANN;
  if (!valorValido(media)) throw new ErroNasaPower("Média climatológica inválida");
  return media;
}
