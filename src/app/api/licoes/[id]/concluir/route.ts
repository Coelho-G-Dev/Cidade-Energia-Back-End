import { limitarAcoes } from "@/lib/dados/limites";
import { concluirLicao } from "@/lib/dados/trilhas";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { idSchema } from "@/lib/validacao/conteudo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await params).id);
    const { usuarioId } = await exigirSessao(request);
    await limitarAcoes(usuarioId);
    return Response.json(await concluirLicao(clienteAdmin(), usuarioId, id, "texto"));
  } catch (e) {
    return tratarErro(e);
  }
}
