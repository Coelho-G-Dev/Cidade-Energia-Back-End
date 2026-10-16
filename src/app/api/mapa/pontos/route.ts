import type { NextRequest } from "next/server";
import { listarPontosMapa } from "@/lib/dados/rankings";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";
import { mapaSchema } from "@/lib/validacao/conteudo";

export async function GET(request: NextRequest) {
  try {
    const { tipo } = mapaSchema.parse({ tipo: request.nextUrl.searchParams.get("tipo") ?? undefined });
    return Response.json(await listarPontosMapa(clienteAnonimo(), tipo));
  } catch (e) {
    return tratarErro(e);
  }
}
