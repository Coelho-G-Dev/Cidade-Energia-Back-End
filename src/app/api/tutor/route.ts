import { tratarErro } from "@/lib/http/erros";
import { responderTutor } from "@/lib/ia/rag";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { tutorSchema } from "@/lib/validacao/tutor";

export async function POST(request: Request) {
  try {
    const { usuarioId } = await exigirSessao(request);
    const { mensagem, historico } = tutorSchema.parse(await request.json());
    return Response.json(await responderTutor({ admin: clienteAdmin(), usuarioId, mensagem, historico }));
  } catch (e) {
    return tratarErro(e);
  }
}
