import { CACHE_CONTEUDO_SEGUNDOS, CACHE_DOCUMENTACAO_SEGUNDOS, CACHE_SOL_DE_HOJE_SEGUNDOS } from "@/lib/config";

const SEM_CACHE = "private, no-store";

const publico = (segundos: number) => `public, s-maxage=${segundos}, stale-while-revalidate=${segundos * 12}`;

export const CACHE = {
  conteudo: publico(CACHE_CONTEUDO_SEGUNDOS),
  solDeHoje: publico(CACHE_SOL_DE_HOJE_SEGUNDOS),
  documentacao: publico(CACHE_DOCUMENTACAO_SEGUNDOS),
} as const;

export function temToken(request: Request): boolean {
  return request.headers.has("authorization");
}

export function cabecalhoDeCache(politica: string, request?: Request): { "Cache-Control": string } {
  return { "Cache-Control": request && temToken(request) ? SEM_CACHE : politica };
}
