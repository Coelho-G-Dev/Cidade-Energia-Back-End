import { registrarAvaliacaoTutor } from "@/lib/dados/avaliacao-tutor";
import { limitarAcoes } from "@/lib/dados/limites";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { avaliacaoTutorSchema } from "@/lib/validacao/avaliacao-tutor";
export async function POST(request: Request) {
  let r: Response;
  try {
    const { usuarioId } = await exigirSessao(request);
    const avaliacao = avaliacaoTutorSchema.parse(await request.json());
    await limitarAcoes(usuarioId);
    r = Response.json(await registrarAvaliacaoTutor(clienteAdmin(), usuarioId, avaliacao), { status: 201 });
  } catch (e) { r = tratarErro(e); }
  r.headers.set("Cache-Control", "private, no-store"); return r;
}
