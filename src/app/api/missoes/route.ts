import { listarMissoes } from "@/lib/dados/missoes";
import { tratarErro } from "@/lib/http/erros";
import { sessaoOpcional } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  try {
    const { supabase, usuarioId } = await sessaoOpcional(request);
    return Response.json(await listarMissoes(supabase, usuarioId, new Date()));
  } catch (e) {
    return tratarErro(e);
  }
}
