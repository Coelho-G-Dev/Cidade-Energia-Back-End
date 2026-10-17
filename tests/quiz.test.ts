import { describe, expect, it } from "vitest";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { mensagemNovaTentativa, obterQuiz, responderPergunta } from "@/lib/dados/quiz";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const LICAO = "22222222-2222-4222-8222-222222222222";
const PERGUNTA = "44444444-4444-4444-8444-444444444444";
const AGORA = new Date("2026-10-16T12:00:00Z");
const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000).toISOString();

const pergunta = {
  id: PERGUNTA,
  licao_id: LICAO,
  opcoes: ["a", "b", "c"],
  indice_correto: 1,
  explicacao: "Porque sim.",
};

type Estado = {
  resposta: { correta: boolean; tentativa_em: string } | null;
  pontosJaDados: boolean;
  perdeuCorrida?: boolean;
  licaoConcluida?: boolean;
};

function banco(estado: Estado) {
  return supabaseFalso((op: Operacao) => {
    const metodo = (m: string) => Boolean(usou(op, m));
    switch (op.tabela) {
      case "perguntas":
        return { data: pergunta };
      case "progresso_licoes": {
        const linha = estado.licaoConcluida === false ? null : { licao_id: LICAO };
        if (metodo("maybeSingle")) return { data: linha };
        return { data: linha ? [linha] : [] };
      }
      case "respostas":
        if (metodo("upsert")) return { data: estado.resposta || estado.perdeuCorrida ? [] : [{ pergunta_id: PERGUNTA }] };
        if (metodo("update")) return { data: estado.perdeuCorrida ? [] : [{ pergunta_id: PERGUNTA }] };
        return { data: estado.resposta };
      case "pontos_eventos":
        return { data: estado.pontosJaDados ? [] : [{ pontos: PONTOS_POR_ORIGEM.resposta_correta }] };
      case "simulacoes":
        return { count: 0 };
      case "perfis":
        return { data: { bairro_id: null } };
      default:
        return { data: [] };
    }
  });
}

const escreveuResposta = (ops: Operacao[]) =>
  ops.some((o) => o.tabela === "respostas" && (usou(o, "upsert") || usou(o, "update")));
const concedeuPontos = (ops: Operacao[]) => ops.some((o) => o.tabela === "pontos_eventos" && usou(o, "upsert"));

describe("responderPergunta", () => {
  it("primeira tentativa certa: grava, pontua e devolve a explicação", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({
      correta: true,
      explicacao: "Porque sim.",
      tentativaPontuavel: true,
      proximaTentativaEm: null,
      pontosGanhos: PONTOS_POR_ORIGEM.resposta_correta,
    });
    expect(escreveuResposta(operacoes)).toBe(true);
  });

  it("primeira tentativa errada: grava, não pontua, não revela a explicação e libera nova tentativa em 24 h", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 0, AGORA);
    expect(r).toMatchObject({ correta: false, explicacao: null, tentativaPontuavel: true, pontosGanhos: 0 });
    expect(r.proximaTentativaEm).toBe("2026-10-17T12:00:00.000Z");
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("responder dentro das 24 h depois de um erro responde 429 sem corrigir nem alterar o registro", async () => {
    const { cliente, operacoes } = banco({ resposta: { correta: false, tentativa_em: horasAtras(2) }, pontosJaDados: false });
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA)).rejects.toMatchObject({
      status: 429,
      codigo: "AGUARDE_NOVA_TENTATIVA",
      message: "Você já respondeu esta pergunta. Uma nova tentativa será liberada em 17/10 às 07:00.",
    });
    expect(escreveuResposta(operacoes)).toBe(false);
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("tentativas simultâneas: a que perde a corrida responde 429 sem revelar a correção", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false, perdeuCorrida: true });
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA)).rejects.toMatchObject({
      status: 429,
      codigo: "AGUARDE_NOVA_TENTATIVA",
      message: mensagemNovaTentativa(null),
    });
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("nova tentativa depois de 24 h que perde a corrida também responde 429", async () => {
    const { cliente } = banco({ resposta: { correta: false, tentativa_em: horasAtras(25) }, pontosJaDados: false, perdeuCorrida: true });
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA)).rejects.toMatchObject({
      status: 429,
      codigo: "AGUARDE_NOVA_TENTATIVA",
    });
  });

  it("depois de 24 h a nova tentativa pontua, com update protegido contra corrida", async () => {
    const { cliente, operacoes } = banco({ resposta: { correta: false, tentativa_em: horasAtras(25) }, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({ correta: true, tentativaPontuavel: true, pontosGanhos: PONTOS_POR_ORIGEM.resposta_correta });
    const update = operacoes.find((o) => o.tabela === "respostas" && usou(o, "update"))!;
    expect(update.chamadas).toContainEqual({ metodo: "eq", args: ["correta", false] });
    expect(update.chamadas).toContainEqual({ metodo: "lte", args: ["tentativa_em", horasAtras(24)] });
  });

  it("responder de novo uma pergunta já acertada não duplica os pontos", async () => {
    const { cliente, operacoes } = banco({ resposta: { correta: true, tentativa_em: horasAtras(1) }, pontosJaDados: true });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({ correta: true, tentativaPontuavel: false, pontosGanhos: 0, proximaTentativaEm: null });
    expect(escreveuResposta(operacoes)).toBe(false);
  });

  it("depois de acertar, escolher outra opção só diz que está errada, sem explicação", async () => {
    const { cliente } = banco({ resposta: { correta: true, tentativa_em: horasAtras(1) }, pontosJaDados: true });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 0, AGORA);
    expect(r).toMatchObject({ correta: false, explicacao: null, tentativaPontuavel: false, pontosGanhos: 0 });
  });

  it("lição não concluída responde 409 LICAO_NAO_CONCLUIDA sem gravar nem iniciar a espera", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false, licaoConcluida: false });
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA)).rejects.toMatchObject({
      status: 409,
      codigo: "LICAO_NAO_CONCLUIDA",
      message: "Leia a lição antes de responder o quiz.",
    });
    expect(operacoes.some((o) => o.tabela === "respostas")).toBe(false);
    expect(concedeuPontos(operacoes)).toBe(false);
    const progresso = operacoes.find((o) => o.tabela === "progresso_licoes")!;
    expect(progresso.chamadas).toContainEqual({ metodo: "eq", args: ["licao_id", LICAO] });
  });

  it("opção fora da lista responde 400", async () => {
    const { cliente } = banco({ resposta: null, pontosJaDados: false });
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 3, AGORA)).rejects.toMatchObject({
      status: 400,
      codigo: "ENTRADA_INVALIDA",
    });
  });

  it("pergunta inexistente responde 404", async () => {
    const { cliente } = supabaseFalso(() => ({ data: null }));
    await expect(responderPergunta(cliente, PERFIL, PERGUNTA, 0, AGORA)).rejects.toMatchObject({
      status: 404,
      codigo: "PERGUNTA_NAO_ENCONTRADA",
    });
  });
});

describe("mensagemNovaTentativa", () => {
  it("mostra o dia e a hora de São Luís", () => {
    expect(mensagemNovaTentativa(new Date("2026-10-17T12:00:00Z"))).toBe(
      "Você já respondeu esta pergunta. Uma nova tentativa será liberada em 17/10 às 09:00.",
    );
  });

  it("sem data, pede para tentar mais tarde", () => {
    expect(mensagemNovaTentativa(null)).toBe("Você já respondeu esta pergunta. Tente de novo mais tarde.");
  });
});

describe("obterQuiz", () => {
  const vazado = { id: PERGUNTA, ordem: 1, enunciado: "P?", opcoes: ["a", "b"], indice_correto: 1, explicacao: "segredo" };

  function bancoQuiz(resposta: { pergunta_id: string; correta: boolean; tentativa_em: string } | null, licaoConcluida = true) {
    return supabaseFalso((op) => {
      if (op.tabela === "licoes") return { data: { id: LICAO } };
      if (op.tabela === "progresso_licoes") return { data: licaoConcluida ? { licao_id: LICAO } : null };
      if (op.tabela === "perguntas") return { data: [vazado] };
      return { data: resposta ? [resposta] : [] };
    });
  }

  it("nunca pede nem devolve o gabarito, mesmo que o banco o traga", async () => {
    const { cliente, operacoes } = bancoQuiz(null);
    const quiz = await obterQuiz(cliente, LICAO, null, AGORA);
    const select = usou(operacoes.find((o) => o.tabela === "perguntas")!, "select")!.args[0] as string;
    expect(select).not.toMatch(/indice_correto|explicacao|\*/);
    expect(JSON.stringify(quiz)).not.toMatch(/indice_correto|explicacao|segredo/);
    expect(quiz.licaoConcluida).toBe(false);
    expect(quiz.perguntas[0]).toEqual({
      id: PERGUNTA,
      ordem: 1,
      enunciado: "P?",
      opcoes: ["a", "b"],
      jaRespondida: false,
      acertou: null,
      podePontuar: false,
      proximaTentativaEm: null,
    });
  });

  it("com login mostra o estado da resposta sem revelar a opção certa", async () => {
    const { cliente } = bancoQuiz({ pergunta_id: PERGUNTA, correta: false, tentativa_em: horasAtras(1) });
    const quiz = await obterQuiz(cliente, LICAO, PERFIL, AGORA);
    expect(quiz.perguntas[0]).toMatchObject({
      jaRespondida: true,
      acertou: false,
      podePontuar: false,
      proximaTentativaEm: "2026-10-17T11:00:00.000Z",
    });
  });

  it("com a lição concluída e sem resposta, a pergunta pode pontuar", async () => {
    const quiz = await obterQuiz(bancoQuiz(null).cliente, LICAO, PERFIL, AGORA);
    expect(quiz.licaoConcluida).toBe(true);
    expect(quiz.perguntas[0]!.podePontuar).toBe(true);
  });

  it("com a lição não concluída, nenhuma pergunta pode pontuar", async () => {
    const quiz = await obterQuiz(bancoQuiz(null, false).cliente, LICAO, PERFIL, AGORA);
    expect(quiz.licaoConcluida).toBe(false);
    expect(quiz.perguntas.every((p) => !p.podePontuar)).toBe(true);
  });
});
