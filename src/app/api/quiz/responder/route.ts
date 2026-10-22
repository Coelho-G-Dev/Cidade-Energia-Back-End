import { limitarAcoes } from "@/lib/dados/limites";
import { responderPergunta } from "@/lib/dados/quiz";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { responderSchema } from "@/lib/validacao/conteudo";

export async function POST(request: Request) {
  try {
    const { usuarioId } = await exigirSessao(request);
    await limitarAcoes(usuarioId);
    const { perguntaId, opcao } = responderSchema.parse(await request.json());
    return Response.json(await responderPergunta(clienteAdmin(), usuarioId, perguntaId, opcao, new Date()));
  } catch (e) {
    return tratarErro(e);
  }
}
