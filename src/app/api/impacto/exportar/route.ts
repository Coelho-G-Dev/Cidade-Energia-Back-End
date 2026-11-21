import { obterImpacto } from "@/lib/dados/impacto";
import { exportarImpactoCsv } from "@/lib/exportacao/csv";
import { tratarErro } from "@/lib/http/erros";
import { diaSaoLuis, exigirChaveImpacto, lerPeriodoImpacto } from "@/lib/http/impacto";
import { clienteAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  let resposta: Response;
  try {
    exigirChaveImpacto(request);
    const periodo = lerPeriodoImpacto(request, true);
    const impacto = await obterImpacto(clienteAdmin(), periodo);
    resposta = new Response(exportarImpactoCsv(impacto), { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cidade-energia-impacto-${diaSaoLuis()}.csv"`,
    } });
  } catch (e) { resposta = tratarErro(e); }
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}
