import { obterLicao } from "@/lib/dados/trilhas";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";
import { idSchema } from "@/lib/validacao/conteudo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await params).id);
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await obterLicao(supabase, id, usuarioId));
  } catch (e) {
    return tratarErro(e);
  }
}
