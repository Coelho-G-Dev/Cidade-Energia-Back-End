import { obterResumo } from "@/lib/dados/perfis";
import { tratarErro } from "@/lib/http/erros";
import { exigirSessao } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  try {
    const { supabase, usuarioId } = await exigirSessao(request);
    return Response.json(await obterResumo(supabase, usuarioId));
  } catch (e) {
    return tratarErro(e);
  }
}
