import { especificacaoOpenApi } from "@/lib/openapi";

const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const ROTAS_DE_DOCUMENTACAO: Record<string, string[]> = { "/api/docs": ["GET"], "/api/openapi": ["GET"] };

type Rota = { padrao: RegExp; metodos: string[] };

function compilar(caminho: string): RegExp {
  const partes = caminho.split("/").map((parte) => (/^\{\w+\}$/.test(parte) ? "[^/]+" : parte.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  return new RegExp(`^${partes.join("/")}/?$`);
}

const caminhos: Record<string, Record<string, unknown>> = especificacaoOpenApi.paths;

export const ROTAS: Rota[] = [
  ...Object.entries(caminhos).map(([caminho, operacoes]) => ({
    padrao: compilar(caminho),
    metodos: METODOS.filter((m) => m.toLowerCase() in operacoes),
  })),
  ...Object.entries(ROTAS_DE_DOCUMENTACAO).map(([caminho, metodos]) => ({ padrao: compilar(caminho), metodos })),
];

export function metodosDaRota(caminho: string): string[] | null {
  const encontrados = ROTAS.filter((r) => r.padrao.test(caminho)).flatMap((r) => r.metodos);
  if (encontrados.length === 0) return null;
  const metodos = new Set(encontrados);
  if (metodos.has("GET")) metodos.add("HEAD");
  metodos.add("OPTIONS");
  return [...metodos];
}
