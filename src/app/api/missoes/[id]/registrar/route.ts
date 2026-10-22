import { limitarAcoes } from "@/lib/dados/limites";
import { registrarMissao } from "@/lib/dados/missoes";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { idSchema } from "@/lib/validacao/conteudo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = idSchema.parse((await params).id);
    const { usuarioId } = await exigirSessao(request);
    await limitarAcoes(usuarioId);
    return Response.json(await registrarMissao(clienteAdmin(), usuarioId, id, new Date()));
  } catch (e) {
    return tratarErro(e);
  }
}
