import { obterQuiz } from "@/lib/dados/quiz";
import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";
import { idSchema } from "@/lib/validacao/conteudo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await params).id);
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await obterQuiz(supabase, id, usuarioId), { headers: cabecalhoDeCache(CACHE.conteudo, request) });
  } catch (e) {
    return tratarErro(e);
  }
}
