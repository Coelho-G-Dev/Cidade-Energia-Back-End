import { obterDiagnostico, enviarDiagnostico } from "@/lib/dados/diagnostico";
import { limitarAcoes } from "@/lib/dados/limites";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { exigirSessao } from "@/lib/supabase/servidor";
import { slugSchema } from "@/lib/validacao/conteudo";
import { consultaDiagnosticoSchema, envioDiagnosticoSchema } from "@/lib/validacao/diagnostico";
type Contexto = { params: Promise<{ slug: string }> };
export async function GET(request: Request, contexto: Contexto) {
  let r: Response;
  try {
    const { usuarioId } = await exigirSessao(request);
    const slug = slugSchema.parse((await contexto.params).slug);
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);
    const { momento } = consultaDiagnosticoSchema.parse(url.searchParams.getAll("momento").length > 1 ? { ...query, momento: [] } : query);
    r = Response.json(await obterDiagnostico(clienteAdmin(), usuarioId, slug, momento));
  } catch (e) { r = tratarErro(e); }
  r.headers.set("Cache-Control", "private, no-store"); return r;
}
export async function POST(request: Request, contexto: Contexto) {
  let r: Response;
  try {
    const { usuarioId } = await exigirSessao(request);
    const slug = slugSchema.parse((await contexto.params).slug);
    const envio = envioDiagnosticoSchema.parse(await request.json());
    await limitarAcoes(usuarioId);
    r = Response.json(await enviarDiagnostico(clienteAdmin(), usuarioId, slug, envio), { status: 201 });
  } catch (e) { r = tratarErro(e); }
  r.headers.set("Cache-Control", "private, no-store"); return r;
}
