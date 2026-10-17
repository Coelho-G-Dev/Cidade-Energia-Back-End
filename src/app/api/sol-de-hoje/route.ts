import { arredondar } from "@/lib/calculos/simulador";
import { calcularSolDeHoje } from "@/lib/calculos/sol";
import { CODIGO_AR_CONDICIONADO } from "@/lib/config";
import { buscarAparelhoPorCodigo } from "@/lib/dados/catalogos";
import { irradiacaoDeHoje } from "@/lib/dados/irradiacao";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";

export async function GET() {
  try {
    const [sol, ar] = await Promise.all([
      irradiacaoDeHoje(),
      buscarAparelhoPorCodigo(clienteAnonimo(), CODIGO_AR_CONDICIONADO),
    ]);

    return Response.json({
      data: sol.data,
      irradiacao: arredondar(sol.valor, 2),
      ...calcularSolDeHoje(sol.valor, ar.potencia_w),
      estimativa: true,
      fonte: sol.fonte,
    });
  } catch (e) {
    return tratarErro(e);
  }
}
