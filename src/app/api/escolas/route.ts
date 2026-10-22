import type { NextRequest } from "next/server";
import { listarEscolas } from "@/lib/dados/catalogos";
import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";
import { filtroEscolasSchema } from "@/lib/validacao/perfil";

export async function GET(request: NextRequest) {
  try {
    const { bairro } = filtroEscolasSchema.parse({
      bairro: request.nextUrl.searchParams.get("bairro") ?? undefined,
    });
    return Response.json(await listarEscolas(clienteAnonimo(), bairro), { headers: cabecalhoDeCache(CACHE.conteudo) });
  } catch (e) {
    return tratarErro(e);
  }
}
