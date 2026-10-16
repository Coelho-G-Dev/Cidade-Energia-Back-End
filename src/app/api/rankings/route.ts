import type { NextRequest } from "next/server";
import { listarRanking } from "@/lib/dados/rankings";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";
import { rankingSchema } from "@/lib/validacao/conteudo";

export async function GET(request: NextRequest) {
  try {
    const { tipo } = rankingSchema.parse({ tipo: request.nextUrl.searchParams.get("tipo") ?? undefined });
    return Response.json(await listarRanking(clienteAnonimo(), tipo));
  } catch (e) {
    return tratarErro(e);
  }
}
