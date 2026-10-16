import { simular } from "@/lib/calculos/simulador";
import { registrarEvento, SEM_EVENTO } from "@/lib/dados/pontos";
import { montarEntrada, salvarSimulacao } from "@/lib/dados/simulacoes";
import { tratarErro } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteAnonimo, obterSessao } from "@/lib/supabase/servidor";
import { criarSimulacaoSchema } from "@/lib/validacao/simulacao";

export async function POST(request: Request) {
  try {
    const body = criarSimulacaoSchema.parse(await request.json());
    const sessao = await obterSessao(request);
    const supabase = sessao?.supabase ?? clienteAnonimo();

    const resultado = simular(await montarEntrada(supabase, body));

    if (!sessao) return Response.json({ ...resultado, simulacaoId: null, ...SEM_EVENTO });

    const simulacaoId = await salvarSimulacao(sessao.supabase, body, resultado);
    const evento = await registrarEvento(clienteAdmin(), sessao.usuarioId, "primeira_simulacao", sessao.usuarioId);

    return Response.json({ ...resultado, simulacaoId, ...evento });
  } catch (e) {
    return tratarErro(e);
  }
}
