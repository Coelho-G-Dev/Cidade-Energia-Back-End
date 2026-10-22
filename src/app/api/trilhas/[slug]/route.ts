import { obterTrilha } from "@/lib/dados/trilhas";
import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";
import { slugSchema } from "@/lib/validacao/conteudo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const slug = slugSchema.parse((await params).slug);
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await obterTrilha(supabase, slug, usuarioId), { headers: cabecalhoDeCache(CACHE.conteudo, request) });
  } catch (e) {
    return tratarErro(e);
  }
}
