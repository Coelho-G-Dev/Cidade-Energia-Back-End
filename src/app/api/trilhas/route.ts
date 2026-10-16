import { listarTrilhas } from "@/lib/dados/trilhas";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  try {
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await listarTrilhas(supabase, usuarioId));
  } catch (e) {
    return tratarErro(e);
  }
}
