import { concluirLicao } from "@/lib/dados/trilhas";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { pedaleSchema } from "@/lib/validacao/conteudo";

export async function POST(request: Request) {
  try {
    const { usuarioId } = await exigirSessao(request);
    const { licaoId } = pedaleSchema.parse(await request.json());
    return Response.json(await concluirLicao(clienteAdmin(), usuarioId, licaoId, "pedale"));
  } catch (e) {
    return tratarErro(e);
  }
}
