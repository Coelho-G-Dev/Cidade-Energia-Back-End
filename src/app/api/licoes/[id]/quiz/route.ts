import { obterQuiz } from "@/lib/dados/quiz";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";
import { idSchema } from "@/lib/validacao/conteudo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await params).id);
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await obterQuiz(supabase, id, usuarioId, new Date()));
  } catch (e) {
    return tratarErro(e);
  }
}
