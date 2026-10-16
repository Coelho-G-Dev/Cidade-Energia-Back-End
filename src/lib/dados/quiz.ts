import type { SupabaseClient } from "@supabase/supabase-js";
import { HORAS_ENTRE_TENTATIVAS_QUIZ } from "@/lib/config";
import { registrarEvento, SEM_EVENTO, type ResultadoEvento } from "@/lib/dados/pontos";
import { avaliarTentativa, type RespostaAnterior } from "@/lib/gamificacao/regras";
import { ErroApi, erroDoBanco, naoEncontrado } from "@/lib/http/erros";

export type PerguntaDoQuiz = {
  id: string;
  ordem: number;
  enunciado: string;
  opcoes: string[];
  jaRespondida: boolean;
  acertou: boolean | null;
  podePontuar: boolean;
  proximaTentativaEm: string | null;
};

export type Quiz = { licaoId: string; perguntas: PerguntaDoQuiz[] };

type LinhaResposta = { pergunta_id: string; correta: boolean; tentativa_em: string };

const paraAnterior = (r: { correta: boolean; tentativa_em: string } | null | undefined): RespostaAnterior =>
  r ? { correta: r.correta, tentativaEm: new Date(r.tentativa_em) } : null;

export async function obterQuiz(
  supabase: SupabaseClient,
  licaoId: string,
  perfilId: string | null,
  agora: Date,
): Promise<Quiz> {
  const { data: licao, error } = await supabase.from("licoes").select("id").eq("id", licaoId).maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!licao) throw naoEncontrado("LICAO_NAO_ENCONTRADA", "Lição não encontrada.");

  const perguntas = await supabase
    .from("perguntas")
    .select("id, ordem, enunciado, opcoes")
    .eq("licao_id", licaoId)
    .order("ordem");
  if (perguntas.error) throw erroDoBanco(perguntas.error);
  const linhas = perguntas.data as { id: string; ordem: number; enunciado: string; opcoes: string[] }[];

  const respostas = new Map<string, LinhaResposta>();
  if (perfilId && linhas.length > 0) {
    const { data, error: erroRespostas } = await supabase
      .from("respostas")
      .select("pergunta_id, correta, tentativa_em")
      .eq("perfil_id", perfilId)
      .in(
        "pergunta_id",
        linhas.map((p) => p.id),
      );
    if (erroRespostas) throw erroDoBanco(erroRespostas);
    for (const r of data as LinhaResposta[]) respostas.set(r.pergunta_id, r);
  }

  return {
    licaoId,
    perguntas: linhas.map((p) => {
      const resposta = respostas.get(p.id);
      const decisao = avaliarTentativa(paraAnterior(resposta), agora);
      return {
        id: p.id,
        ordem: p.ordem,
        enunciado: p.enunciado,
        opcoes: p.opcoes,
        jaRespondida: Boolean(resposta),
        acertou: resposta ? resposta.correta : null,
        podePontuar: perfilId !== null && decisao.pontuavel,
        proximaTentativaEm: decisao.proximaTentativaEm?.toISOString() ?? null,
      };
    }),
  };
}

export type RespostaDoQuiz = ResultadoEvento & {
  correta: boolean;
  explicacao: string;
  tentativaPontuavel: boolean;
  proximaTentativaEm: string | null;
};

async function gravarTentativa(
  admin: SupabaseClient,
  perfilId: string,
  perguntaId: string,
  opcao: number,
  correta: boolean,
  agora: Date,
  anterior: RespostaAnterior,
): Promise<boolean> {
  const linha = { opcao, correta, tentativa_em: agora.toISOString() };

  if (!anterior) {
    const { data, error } = await admin
      .from("respostas")
      .upsert(
        { perfil_id: perfilId, pergunta_id: perguntaId, ...linha },
        { onConflict: "perfil_id,pergunta_id", ignoreDuplicates: true },
      )
      .select("pergunta_id");
    if (error) throw erroDoBanco(error);
    return (data ?? []).length > 0;
  }

  const limite = new Date(agora.getTime() - HORAS_ENTRE_TENTATIVAS_QUIZ * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("respostas")
    .update(linha)
    .eq("perfil_id", perfilId)
    .eq("pergunta_id", perguntaId)
    .eq("correta", false)
    .lte("tentativa_em", limite)
    .select("pergunta_id");
  if (error) throw erroDoBanco(error);
  return (data ?? []).length > 0;
}

export async function responderPergunta(
  admin: SupabaseClient,
  perfilId: string,
  perguntaId: string,
  opcao: number,
  agora: Date,
): Promise<RespostaDoQuiz> {
  const { data: pergunta, error } = await admin
    .from("perguntas")
    .select("id, opcoes, indice_correto, explicacao")
    .eq("id", perguntaId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!pergunta) throw naoEncontrado("PERGUNTA_NAO_ENCONTRADA", "Pergunta não encontrada.");
  if (opcao >= (pergunta.opcoes as string[]).length) {
    throw new ErroApi(400, "ENTRADA_INVALIDA", "opcao: Escolha uma das opções da pergunta.");
  }

  const correta = opcao === pergunta.indice_correto;

  const existente = await admin
    .from("respostas")
    .select("correta, tentativa_em")
    .eq("perfil_id", perfilId)
    .eq("pergunta_id", perguntaId)
    .maybeSingle();
  if (existente.error) throw erroDoBanco(existente.error);
  const anterior = paraAnterior(existente.data);

  const decisao = avaliarTentativa(anterior, agora);
  const registrada = decisao.pontuavel
    ? await gravarTentativa(admin, perfilId, perguntaId, opcao, correta, agora, anterior)
    : false;

  const estadoFinal: RespostaAnterior = registrada ? { correta, tentativaEm: agora } : anterior;
  const evento = estadoFinal?.correta ? await registrarEvento(admin, perfilId, "resposta_correta", perguntaId) : SEM_EVENTO;

  return {
    correta,
    explicacao: pergunta.explicacao,
    tentativaPontuavel: registrada,
    proximaTentativaEm: avaliarTentativa(estadoFinal, agora).proximaTentativaEm?.toISOString() ?? null,
    ...evento,
  };
}
