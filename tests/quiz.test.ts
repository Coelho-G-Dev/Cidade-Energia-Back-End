import { describe, expect, it } from "vitest";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { obterQuiz, responderPergunta } from "@/lib/dados/quiz";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const LICAO = "22222222-2222-4222-8222-222222222222";
const PERGUNTA = "44444444-4444-4444-8444-444444444444";
const AGORA = new Date("2026-10-16T12:00:00Z");

const pergunta = {
  id: PERGUNTA,
  licao_id: LICAO,
  opcoes: ["a", "b", "c"],
  indice_correto: 1,
  explicacao: "Porque sim.",
};

type Estado = {
  resposta: { correta: boolean } | null;
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
  it("acerto na primeira tentativa: grava, pontua e devolve a opção certa e a explicação", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toEqual({
      correta: true,
      opcaoCorreta: 1,
      explicacao: "Porque sim.",
      tentativaPontuavel: true,
      pontosGanhos: PONTOS_POR_ORIGEM.resposta_correta,
      conquistasNovas: [],
    });
    expect(escreveuResposta(operacoes)).toBe(true);
  });

  it("erro na primeira tentativa: grava, não pontua e também devolve a opção certa e a explicação", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 0, AGORA);
    expect(r).toEqual({
      correta: false,
      opcaoCorreta: 1,
      explicacao: "Porque sim.",
      tentativaPontuavel: true,
      pontosGanhos: 0,
      conquistasNovas: [],
    });
    expect(escreveuResposta(operacoes)).toBe(true);
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("repetir depois de errar é treino: corrige, não pontua, não responde 429 e não altera o registro", async () => {
    const { cliente, operacoes } = banco({ resposta: { correta: false }, pontosJaDados: false });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({ correta: true, opcaoCorreta: 1, explicacao: "Porque sim.", tentativaPontuavel: false, pontosGanhos: 0 });
    expect(escreveuResposta(operacoes)).toBe(false);
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("repetir uma pergunta já acertada não pontua de novo", async () => {
    const { cliente, operacoes } = banco({ resposta: { correta: true }, pontosJaDados: true });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({ correta: true, tentativaPontuavel: false, pontosGanhos: 0 });
    expect(escreveuResposta(operacoes)).toBe(false);
  });

  it("depois de acertar, escolher outra opção mostra a certa e a explicação, sem pontos", async () => {
    const { cliente } = banco({ resposta: { correta: true }, pontosJaDados: true });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 0, AGORA);
    expect(r).toMatchObject({ correta: false, opcaoCorreta: 1, explicacao: "Porque sim.", tentativaPontuavel: false, pontosGanhos: 0 });
  });

  it("tentativas simultâneas: a que perde a corrida vira treino, sem pontos e sem 429", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false, perdeuCorrida: true });
    const r = await responderPergunta(cliente, PERFIL, PERGUNTA, 1, AGORA);
    expect(r).toMatchObject({ correta: true, tentativaPontuavel: false, pontosGanhos: 0 });
    expect(concedeuPontos(operacoes)).toBe(false);
  });

  it("grava só a primeira tentativa, sem update", async () => {
    const { cliente, operacoes } = banco({ resposta: null, pontosJaDados: false });
    await responderPergunta(cliente, PERFIL, PERGUNTA, 2, AGORA);
    const upsert = operacoes.find((o) => o.tabela === "respostas" && usou(o, "upsert"))!;
    expect(usou(upsert, "upsert")!.args[1]).toEqual({ onConflict: "perfil_id,pergunta_id", ignoreDuplicates: true });
    expect(operacoes.some((o) => o.tabela === "respostas" && usou(o, "update"))).toBe(false);
  });

  it("lição não concluída responde 409 LICAO_NAO_CONCLUIDA sem gravar nem revelar a resposta", async () => {
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

describe("obterQuiz", () => {
  const vazado = { id: PERGUNTA, ordem: 1, enunciado: "P?", opcoes: ["a", "b"], indice_correto: 1, explicacao: "segredo" };

  function bancoQuiz(resposta: { pergunta_id: string; correta: boolean } | null, licaoConcluida = true) {
    return supabaseFalso((op) => {
      if (op.tabela === "licoes") return { data: { id: LICAO } };
      if (op.tabela === "progresso_licoes") return { data: licaoConcluida ? { licao_id: LICAO } : null };
      if (op.tabela === "perguntas") return { data: [vazado] };
      return { data: resposta ? [resposta] : [] };
    });
  }

  it("nunca pede nem devolve o gabarito antes da tentativa, mesmo que o banco o traga", async () => {
    const { cliente, operacoes } = bancoQuiz(null);
    const quiz = await obterQuiz(cliente, LICAO, null);
    const select = usou(operacoes.find((o) => o.tabela === "perguntas")!, "select")!.args[0] as string;
    expect(select).not.toMatch(/indice_correto|explicacao|\*/);
    expect(JSON.stringify(quiz)).not.toMatch(/indice_correto|opcaoCorreta|explicacao|segredo/);
    expect(quiz.licaoConcluida).toBe(false);
    expect(quiz.perguntas[0]).toEqual({
      id: PERGUNTA,
      ordem: 1,
      enunciado: "P?",
      opcoes: ["a", "b"],
      jaRespondida: false,
      acertou: null,
      podePontuar: false,
    });
  });

  it("depois de responder, a pergunta não pode mais pontuar, acertando ou errando", async () => {
    for (const correta of [false, true]) {
      const quiz = await obterQuiz(bancoQuiz({ pergunta_id: PERGUNTA, correta }).cliente, LICAO, PERFIL);
      expect(quiz.perguntas[0]).toMatchObject({ jaRespondida: true, acertou: correta, podePontuar: false });
    }
  });

  it("com a lição concluída e sem resposta, a pergunta pode pontuar", async () => {
    const quiz = await obterQuiz(bancoQuiz(null).cliente, LICAO, PERFIL);
    expect(quiz.licaoConcluida).toBe(true);
    expect(quiz.perguntas[0]!.podePontuar).toBe(true);
  });

  it("com a lição não concluída, nenhuma pergunta pode pontuar", async () => {
    const quiz = await obterQuiz(bancoQuiz(null, false).cliente, LICAO, PERFIL);
    expect(quiz.licaoConcluida).toBe(false);
    expect(quiz.perguntas.every((p) => !p.podePontuar)).toBe(true);
  });
});
