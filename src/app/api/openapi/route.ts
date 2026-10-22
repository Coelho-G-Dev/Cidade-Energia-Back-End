import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { especificacaoOpenApi } from "@/lib/openapi";

export function GET() {
  return Response.json(especificacaoOpenApi, { headers: cabecalhoDeCache(CACHE.documentacao) });
}
