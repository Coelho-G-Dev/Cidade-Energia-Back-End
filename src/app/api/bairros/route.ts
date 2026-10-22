import { listarBairros } from "@/lib/dados/catalogos";
import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";

export async function GET() {
  try {
    return Response.json(await listarBairros(clienteAnonimo()), { headers: cabecalhoDeCache(CACHE.conteudo) });
  } catch (e) {
    return tratarErro(e);
  }
}
