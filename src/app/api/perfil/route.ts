import { atualizarPerfil, obterPerfil } from "@/lib/dados/perfis";
import { tratarErro } from "@/lib/http/erros";
import { exigirSessao } from "@/lib/supabase/servidor";
import { atualizarPerfilSchema } from "@/lib/validacao/perfil";

export async function GET(request: Request) {
  try {
    const { supabase, usuarioId } = await exigirSessao(request);
    return Response.json(await obterPerfil(supabase, usuarioId));
  } catch (e) {
    return tratarErro(e);
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, usuarioId } = await exigirSessao(request);
    const dados = atualizarPerfilSchema.parse(await request.json());
    return Response.json(await atualizarPerfil(supabase, usuarioId, dados));
  } catch (e) {
    return tratarErro(e);
  }
}
