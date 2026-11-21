import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { FUSO_SAO_LUIS } from "@/lib/config";
import { envImpacto } from "@/lib/env";
import { ErroApi } from "@/lib/http/erros";
import { consultaExportarSchema, consultaImpactoSchema } from "@/lib/validacao/painel";

export function exigirChaveImpacto(request: Request) {
  const configurada = envImpacto().IMPACTO_CHAVE;
  if (!configurada) throw new ErroApi(503, "IMPACTO_DESLIGADO", "O painel de impacto está desligado.");
  const recebida = z.string().safeParse(request.headers.get("X-Chave-Impacto"));
  // Digests de tamanho fixo: compara também chaves ausentes ou com outro comprimento.
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  if (!timingSafeEqual(digest(recebida.success ? recebida.data : ""), digest(configurada))) {
    throw new ErroApi(401, "NAO_AUTENTICADO", "Chave de impacto inválida.");
  }
}

export function diaSaoLuis(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_SAO_LUIS, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(agora);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
}

export function lerPeriodoImpacto(request: Request, exportar = false, agora = new Date()) {
  const parametros: Record<string, string | string[]> = {};
  new URL(request.url).searchParams.forEach((valor, chave) => {
    const anterior = parametros[chave];
    parametros[chave] = anterior === undefined ? valor : [...(Array.isArray(anterior) ? anterior : [anterior]), valor];
  });
  const dados = (exportar ? consultaExportarSchema : consultaImpactoSchema).parse(parametros);
  const ate = dados.ate ?? diaSaoLuis(agora);
  const fim = Date.parse(`${ate}T00:00:00Z`);
  const de = dados.de ?? new Date(fim - 365 * 86400000).toISOString().slice(0, 10);
  const dias = (fim - Date.parse(`${de}T00:00:00Z`)) / 86400000 + 1;
  if (dias < 1 || dias > 366) throw new ErroApi(400, "ENTRADA_INVALIDA", "Informe um período em ordem, com no máximo 366 dias.");
  return { de, ate };
}
