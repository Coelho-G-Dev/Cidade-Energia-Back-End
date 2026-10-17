import { PARAMETROS_PADRAO, simular } from "@/lib/calculos/simulador";
import { irradiacaoMediaAnual } from "@/lib/dados/irradiacao";
import { limitarSimulacaoPublica } from "@/lib/dados/limites";
import { SEM_EVENTO } from "@/lib/dados/pontos";
import { montarEntrada } from "@/lib/dados/simulacoes";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo } from "@/lib/supabase/servidor";
import { criarSimulacaoSchema } from "@/lib/validacao/simulacao";

export async function POST(request: Request) {
  try {
    const body = criarSimulacaoSchema.parse(await request.json());
    await limitarSimulacaoPublica(request);

    const [entrada, irradiacao] = await Promise.all([montarEntrada(clienteAnonimo(), body), irradiacaoMediaAnual()]);
    const resultado = simular(entrada, { ...PARAMETROS_PADRAO, irradiacao: irradiacao.valor });

    return Response.json({ ...resultado, simulacaoId: null, ...SEM_EVENTO });
  } catch (e) {
    return tratarErro(e);
  }
}
