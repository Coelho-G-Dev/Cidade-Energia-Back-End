import { simular } from "@/lib/calculos/simulador";
import { montarEntrada, salvarSimulacao } from "@/lib/dados/simulacoes";
import { tratarErro } from "@/lib/http/erros";
import { clienteAnonimo, obterSessao } from "@/lib/supabase/servidor";
import { criarSimulacaoSchema } from "@/lib/validacao/simulacao";

export async function POST(request: Request) {
  try {
    const body = criarSimulacaoSchema.parse(await request.json());
    const sessao = await obterSessao(request);
    const supabase = sessao?.supabase ?? clienteAnonimo();

    const resultado = simular(await montarEntrada(supabase, body));

    const simulacaoId = sessao ? await salvarSimulacao(sessao.supabase, body, resultado) : null;

    return Response.json({ ...resultado, simulacaoId });
  } catch (e) {
    return tratarErro(e);
  }
}
