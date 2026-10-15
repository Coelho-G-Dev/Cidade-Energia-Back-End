import { especificacaoOpenApi } from "@/lib/openapi";

export function GET() {
  return Response.json(especificacaoOpenApi);
}
