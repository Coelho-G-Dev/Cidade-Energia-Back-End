import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntradaSimulacao, ResultadoSimulacao } from "@/lib/calculos/simulador";
import { buscarAparelhos } from "@/lib/dados/catalogos";
import { erroDoBanco, naoEncontrado } from "@/lib/http/erros";
import type { CriarSimulacao } from "@/lib/validacao/simulacao";

export async function montarEntrada(supabase: SupabaseClient, body: CriarSimulacao): Promise<EntradaSimulacao> {
  if (body.modo === "conta") return body;

  const aparelhos = await buscarAparelhos(supabase, body.itens.map((i) => i.aparelhoId));
  const porId = new Map(aparelhos.map((a) => [a.id, a]));

  const itens = body.itens.map((i) => {
    const aparelho = porId.get(i.aparelhoId);
    if (!aparelho) throw naoEncontrado("APARELHO_NAO_ENCONTRADO", `Aparelho ${i.aparelhoId} não existe.`);
    return {
      codigo: aparelho.codigo,
      nome: aparelho.nome,
      potenciaW: aparelho.potencia_w,
      quantidade: i.quantidade,
      horasDia: i.horasDia,
    };
  });

  return { modo: "aparelhos", itens };
}

export async function salvarSimulacao(
  supabase: SupabaseClient,
  body: CriarSimulacao,
  resultado: ResultadoSimulacao,
): Promise<string> {
  const itens =
    body.modo === "aparelhos"
      ? body.itens.map((i) => ({ aparelho_id: i.aparelhoId, quantidade: i.quantidade, horas_dia: i.horasDia }))
      : [];

  const { data, error } = await supabase.rpc("salvar_simulacao", {
    p_modo: body.modo,
    p_consumo_kwh: resultado.consumoKwh,
    p_valor_conta: body.modo === "conta" ? (body.valorConta ?? null) : null,
    p_resultado: resultado,
    p_itens: itens,
  });
  if (error) throw erroDoBanco(error);
  return data as string;
}

export type SimulacaoSalva = {
  id: string;
  modo: "conta" | "aparelhos";
  consumoKwh: number;
  valorConta: number | null;
  criadoEm: string;
  resultado: ResultadoSimulacao;
};

export async function ultimaSimulacao(supabase: SupabaseClient, usuarioId: string): Promise<SimulacaoSalva> {
  const { data, error } = await supabase
    .from("simulacoes")
    .select("id, modo, consumo_kwh, valor_conta, resultado, criado_em")
    .eq("perfil_id", usuarioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!data) throw naoEncontrado("NENHUMA_SIMULACAO", "Você ainda não fez nenhuma simulação.");

  return {
    id: data.id,
    modo: data.modo,
    consumoKwh: Number(data.consumo_kwh),
    valorConta: data.valor_conta == null ? null : Number(data.valor_conta),
    criadoEm: data.criado_em,
    resultado: data.resultado,
  };
}
