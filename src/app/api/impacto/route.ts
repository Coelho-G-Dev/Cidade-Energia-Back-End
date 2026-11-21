import { obterImpacto } from "@/lib/dados/impacto";
import { tratarErro } from "@/lib/http/erros";
import { exigirChaveImpacto, lerPeriodoImpacto } from "@/lib/http/impacto";
import { clienteAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  let resposta: Response;
  try {
    exigirChaveImpacto(request);
    const periodo = lerPeriodoImpacto(request);
    resposta = Response.json(await obterImpacto(clienteAdmin(), periodo));
  } catch (e) { resposta = tratarErro(e); }
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}
