import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarEvento, SEM_EVENTO, type ResultadoEvento } from "@/lib/dados/pontos";
import { tentativaPontuavel, type RespostaAnterior } from "@/lib/gamificacao/regras";
import { ErroApi, erroDoBanco, naoEncontrado } from "@/lib/http/erros";

export type PerguntaDoQuiz = {
  id: string;
  ordem: number;
  enunciado: string;
  opcoes: string[];
  jaRespondida: boolean;
  acertou: boolean | null;
  podePontuar: boolean;
};

export type Quiz = { licaoId: string; licaoConcluida: boolean; perguntas: PerguntaDoQuiz[] };

type LinhaResposta = { pergunta_id: string; correta: boolean };

async function licaoFoiConcluida(supabase: SupabaseClient, perfilId: string, licaoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("progresso_licoes")
    .select("licao_id")
    .eq("perfil_id", perfilId)
    .eq("licao_id", licaoId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  return Boolean(data);
}

const paraAnterior = (r: { correta: boolean } | null | undefined): RespostaAnterior => (r ? { correta: r.correta } : null);

export async function obterQuiz(supabase: SupabaseClient, licaoId: string, perfilId: string | null): Promise<Quiz> {
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

  const licaoConcluida = perfilId !== null && (await licaoFoiConcluida(supabase, perfilId, licaoId));

  const respostas = new Map<string, LinhaResposta>();
  if (perfilId && linhas.length > 0) {
    const { data, error: erroRespostas } = await supabase
      .from("respostas")
      .select("pergunta_id, correta")
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
    licaoConcluida,
    perguntas: linhas.map((p) => {
      const resposta = respostas.get(p.id);
      return {
        id: p.id,
        ordem: p.ordem,
        enunciado: p.enunciado,
        opcoes: p.opcoes,
        jaRespondida: Boolean(resposta),
        acertou: resposta ? resposta.correta : null,
        podePontuar: licaoConcluida && tentativaPontuavel(paraAnterior(resposta)),
      };
    }),
  };
}

export type RespostaDoQuiz = ResultadoEvento & {
  correta: boolean;
  opcaoCorreta: number;
  explicacao: string;
  tentativaPontuavel: boolean;
};

async function gravarPrimeiraTentativa(
  admin: SupabaseClient,
  perfilId: string,
  perguntaId: string,
  opcao: number,
  correta: boolean,
  agora: Date,
): Promise<boolean> {
  const { data, error } = await admin
    .from("respostas")
    .upsert(
      { perfil_id: perfilId, pergunta_id: perguntaId, opcao, correta, tentativa_em: agora.toISOString() },
      { onConflict: "perfil_id,pergunta_id", ignoreDuplicates: true },
    )
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
    .select("id, licao_id, opcoes, indice_correto, explicacao")
    .eq("id", perguntaId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!pergunta) throw naoEncontrado("PERGUNTA_NAO_ENCONTRADA", "Pergunta não encontrada.");
  if (opcao >= (pergunta.opcoes as string[]).length) {
    throw new ErroApi(400, "ENTRADA_INVALIDA", "opcao: Escolha uma das opções da pergunta.");
  }
  if (!(await licaoFoiConcluida(admin, perfilId, pergunta.licao_id))) {
    throw new ErroApi(409, "LICAO_NAO_CONCLUIDA", "Leia a lição antes de responder o quiz.");
  }

  const correta = opcao === pergunta.indice_correto;

  const existente = await admin
    .from("respostas")
    .select("correta")
    .eq("perfil_id", perfilId)
    .eq("pergunta_id", perguntaId)
    .maybeSingle();
  if (existente.error) throw erroDoBanco(existente.error);
  const anterior = paraAnterior(existente.data);

  const registrada = tentativaPontuavel(anterior)
    ? await gravarPrimeiraTentativa(admin, perfilId, perguntaId, opcao, correta, agora)
    : false;

  const acertouNaPrimeira = registrada ? correta : anterior?.correta === true;
  const evento = acertouNaPrimeira ? await registrarEvento(admin, perfilId, "resposta_correta", perguntaId) : SEM_EVENTO;

  return {
    correta,
    opcaoCorreta: pergunta.indice_correto,
    explicacao: pergunta.explicacao,
    tentativaPontuavel: registrada,
    ...evento,
  };
}
