export const ORIGENS_PADRAO: readonly string[] = ["http://localhost:5173"];

export const CABECALHOS_CORS = {
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
} as const;

export function lerOrigens(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(",")
    .map((origem) => origem.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function origensConfiguradas(valor: string | undefined = process.env.CORS_ORIGENS): readonly string[] {
  const origens = lerOrigens(valor);
  return origens.length > 0 ? origens : ORIGENS_PADRAO;
}

const escaparRegex = (texto: string) => texto.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

function casaComPadrao(origem: string, padrao: string): boolean {
  if (!padrao.includes("*")) return origem === padrao;
  const regex = new RegExp(`^${padrao.split("*").map(escaparRegex).join("[a-z0-9-]+")}$`);
  return regex.test(origem);
}

export function origemPermitida(origem: string | null, permitidas: readonly string[]): boolean {
  if (!origem) return false;
  return permitidas.some((padrao) => casaComPadrao(origem, padrao));
}
