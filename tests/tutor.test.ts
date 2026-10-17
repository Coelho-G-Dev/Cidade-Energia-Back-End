import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ErroGemini, gerarEmbeddings, gerarResposta, textoDeConsulta, textoDeDocumento, type Buscar } from "@/lib/ia/gemini";
import { responderTutor, type ConfigTutor } from "@/lib/ia/rag";
import {
  limitarResposta,
  mensagemLimiteTutor,
  montarInstrucoes,
  RESPOSTA_BLOQUEADA,
  selecionarRelevantes,
} from "@/lib/ia/tutor";
import { tutorSchema } from "@/lib/validacao/tutor";
import { POST } from "@/app/api/tutor/route";
import { supabaseFalso, type Operacao } from "./apoio/supabase-falso";

const VETOR = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
const LICAO_SOL = "11111111-1111-4111-8111-111111111111";
const LICAO_PLACA = "22222222-2222-4222-8222-222222222222";

type Chamada = { url: string; corpo: Record<string, unknown>; chave: string | null };

function geminiFalso(resposta: unknown = { candidates: [{ content: { parts: [{ text: "O sol é forte aqui!" }] }, finishReason: "STOP" }] }) {
  const chamadas: Chamada[] = [];
  const buscar = vi.fn<Buscar>(async (url, init) => {
    const corpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
    chamadas.push({ url, corpo, chave: new Headers(init?.headers).get("x-goog-api-key") });
    if (url.endsWith(":batchEmbedContents")) {
      const pedidos = corpo.requests as unknown[];
      return Response.json({ embeddings: pedidos.map(() => ({ values: VETOR })) });
    }
    return Response.json(resposta);
  });
  return { buscar, chamadas };
}

const config = (buscar: Buscar): ConfigTutor => ({ apiKey: "chave-de-teste", modelo: "gemini-teste", buscar });

function bancoFalso({ permitido = true, trechos = [] as { licao_id: string; trecho: string; similaridade: number }[] } = {}) {
  return supabaseFalso((op: Operacao) => {
    if (op.tabela === "rpc:registrar_uso_tutor") {
      return { data: { permitido, liberado_em: permitido ? null : "2026-10-16T16:30:00Z" } };
    }
    if (op.tabela === "rpc:match_documentos") return { data: trechos };
    if (op.tabela === "licoes") {
      return {
        data: [
          { id: LICAO_SOL, titulo: "O sol de São Luís", trilhas: { slug: "energia-solar-em-sao-luis" } },
          { id: LICAO_PLACA, titulo: "Como a placa solar funciona", trilhas: { slug: "energia-solar-em-sao-luis" } },
        ],
      };
    }
    return { error: { message: `tabela inesperada ${op.tabela}` } };
  });
}

let erroConsole: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  erroConsole = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  erroConsole.mockRestore();
});

describe("regras puras do tutor", () => {
  it("formata documentos e consultas como pede o gemini-embedding-2", () => {
    expect(textoDeDocumento("O sol", "texto")).toBe("title: O sol | text: texto");
    expect(textoDeConsulta("Por que o sol é forte?")).toBe("task: question answering | query: Por que o sol é forte?");
  });

  it("descarta trechos abaixo da similaridade mínima e ordena", () => {
    const r = selecionarRelevantes([
      { licaoId: "a", trecho: "a", similaridade: 0.63 },
      { licaoId: "b", trecho: "b", similaridade: 0.4 },
      { licaoId: "c", trecho: "c", similaridade: 0.65 },
    ]);
    expect(r.map((t) => t.licaoId)).toEqual(["c", "a"]);
  });

  it("descarta trechos muito abaixo do mais parecido", () => {
    const r = selecionarRelevantes([
      { licaoId: "sol", trecho: "a", similaridade: 0.808 },
      { licaoId: "mares", trecho: "b", similaridade: 0.684 },
      { licaoId: "placas", trecho: "c", similaridade: 0.678 },
    ]);
    expect(r.map((t) => t.licaoId)).toEqual(["sol"]);
  });

  it("pergunta fora do tema não tem trecho relevante", () => {
    expect(selecionarRelevantes([{ licaoId: "a", trecho: "a", similaridade: 0.607 }])).toEqual([]);
    expect(selecionarRelevantes([])).toEqual([]);
  });

  it("as instruções trazem as regras e o contexto recuperado", () => {
    const instrucoes = montarInstrucoes([{ licaoId: "a", trecho: "Lição: O sol. Texto.", similaridade: 0.8 }]);
    expect(instrucoes).toContain("Energinho");
    expect(instrucoes).toContain("Não invente números");
    expect(instrucoes).toContain("só sobre energia, conta de luz");
    expect(instrucoes).toContain("diga que não sabe");
    expect(instrucoes).toContain("veja a lição");
    expect(instrucoes).toContain("[Trecho 1]\nLição: O sol. Texto.");
  });

  it("sem contexto, as instruções avisam que nenhuma lição trata do assunto", () => {
    expect(montarInstrucoes([])).toContain("Nenhuma lição do app trata desse assunto");
  });

  it("corta respostas longas numa palavra inteira", () => {
    const r = limitarResposta("palavra ".repeat(400), 100);
    expect(r.length).toBeLessThanOrEqual(100);
    expect(r.endsWith("palavra…")).toBe(true);
    expect(limitarResposta("curta", 100)).toBe("curta");
  });

  it("mensagem do limite mostra o horário de São Luís", () => {
    expect(mensagemLimiteTutor(20, new Date("2026-10-16T16:30:00Z"))).toBe(
      "Você já mandou 20 mensagens ao Energinho na última hora. Tente de novo a partir das 13:30.",
    );
  });
});

describe("cliente do Gemini", () => {
  it("pede embeddings de 768 dimensões ao gemini-embedding-2 com a chave no cabeçalho", async () => {
    const { buscar, chamadas } = geminiFalso();
    const vetores = await gerarEmbeddings(["a", "b"], { apiKey: "chave-de-teste", buscar });

    expect(vetores).toHaveLength(2);
    expect(chamadas[0]?.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents",
    );
    expect(chamadas[0]?.chave).toBe("chave-de-teste");
    expect(chamadas[0]?.url).not.toContain("chave-de-teste");
    expect(chamadas[0]?.corpo.requests).toEqual([
      { model: "models/gemini-embedding-2", content: { parts: [{ text: "a" }] }, outputDimensionality: 768 },
      { model: "models/gemini-embedding-2", content: { parts: [{ text: "b" }] }, outputDimensionality: 768 },
    ]);
  });

  it("divide os embeddings em lotes", async () => {
    const { buscar, chamadas } = geminiFalso();
    const vetores = await gerarEmbeddings(Array.from({ length: 120 }, (_, i) => `t${i}`), { apiKey: "k", buscar });
    expect(vetores).toHaveLength(120);
    expect(chamadas).toHaveLength(3);
  });

  it("recusa embedding com dimensão errada", async () => {
    const buscar: Buscar = async () => Response.json({ embeddings: [{ values: [1, 2, 3] }] });
    await expect(gerarEmbeddings(["a"], { apiKey: "k", buscar })).rejects.toThrow(ErroGemini);
  });

  it("monta a geração com instruções de sistema, histórico e limite de tokens", async () => {
    const { buscar, chamadas } = geminiFalso();
    const texto = await gerarResposta(
      {
        modelo: "gemini-teste",
        instrucoes: "REGRAS",
        historico: [
          { papel: "usuario", texto: "Oi" },
          { papel: "energinho", texto: "Olá!" },
        ],
        mensagem: "O que é kWh?",
      },
      { apiKey: "k", buscar },
    );

    expect(texto).toBe("O sol é forte aqui!");
    expect(chamadas[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-teste:generateContent");
    expect(chamadas[0]?.corpo).toEqual({
      systemInstruction: { parts: [{ text: "REGRAS" }] },
      contents: [
        { role: "user", parts: [{ text: "Oi" }] },
        { role: "model", parts: [{ text: "Olá!" }] },
        { role: "user", parts: [{ text: "O que é kWh?" }] },
      ],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
    });
  });

  it("ignora partes de raciocínio", async () => {
    const { buscar } = geminiFalso({
      candidates: [{ content: { parts: [{ text: "pensando...", thought: true }, { text: "Resposta." }] } }],
    });
    expect(await gerarResposta({ modelo: "m", instrucoes: "", historico: [], mensagem: "x" }, { apiKey: "k", buscar })).toBe(
      "Resposta.",
    );
  });

  it("devolve null quando o conteúdo é bloqueado", async () => {
    const { buscar } = geminiFalso({ promptFeedback: { blockReason: "SAFETY" } });
    expect(await gerarResposta({ modelo: "m", instrucoes: "", historico: [], mensagem: "x" }, { apiKey: "k", buscar })).toBeNull();
  });

  it("erro HTTP vira ErroGemini sem o corpo da resposta", async () => {
    const buscar: Buscar = async () => new Response("detalhe com a pergunta do aluno", { status: 500 });
    const erro = await gerarResposta({ modelo: "m", instrucoes: "", historico: [], mensagem: "x" }, { apiKey: "k", buscar }).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ErroGemini);
    expect((erro as Error).message).toBe("Gemini respondeu 500");
  });
});

describe("responderTutor", () => {
  const trechos = [
    { licao_id: LICAO_SOL, trecho: "Lição: O sol de São Luís. O sol passa alto.", similaridade: 0.82 },
    { licao_id: LICAO_PLACA, trecho: "Lição: Como a placa solar funciona.", similaridade: 0.78 },
    { licao_id: LICAO_SOL, trecho: "Lição: O sol de São Luís. Dias de 12 horas.", similaridade: 0.76 },
    { licao_id: "33333333-3333-4333-8333-333333333333", trecho: "Lixo eletrônico.", similaridade: 0.3 },
  ];

  it("busca 4 trechos, usa os relevantes no contexto e devolve as lições relacionadas sem repetir", async () => {
    const banco = bancoFalso({ trechos });
    const { buscar, chamadas } = geminiFalso();

    const r = await responderTutor({
      admin: banco.cliente,
      usuarioId: "u1",
      mensagem: "Por que o sol é forte em São Luís?",
      historico: [],
      gemini: config(buscar),
    });

    expect(r).toEqual({
      resposta: "O sol é forte aqui!",
      licoesRelacionadas: [
        { id: LICAO_SOL, titulo: "O sol de São Luís", trilhaSlug: "energia-solar-em-sao-luis" },
        { id: LICAO_PLACA, titulo: "Como a placa solar funciona", trilhaSlug: "energia-solar-em-sao-luis" },
      ],
    });

    const match = banco.operacoes.find((o) => o.tabela === "rpc:match_documentos");
    expect((match?.chamadas[0]?.args[0] as { p_k: number }).p_k).toBe(4);

    const geracao = chamadas.find((c) => c.url.endsWith(":generateContent"));
    const sistema = JSON.stringify(geracao?.corpo.systemInstruction);
    expect(sistema).toContain("O sol passa alto");
    expect(sistema).not.toContain("Lixo eletrônico");
  });

  it("registra o uso antes de chamar o Gemini", async () => {
    const banco = bancoFalso({ trechos });
    const { buscar } = geminiFalso();
    await responderTutor({ admin: banco.cliente, usuarioId: "u1", mensagem: "Oi", historico: [], gemini: config(buscar) });

    const uso = banco.operacoes.find((o) => o.tabela === "rpc:registrar_uso_tutor");
    expect(uso?.chamadas[0]?.args[0]).toEqual({ p_perfil_id: "u1", p_limite: 20, p_janela: "1 hour" });
    expect(banco.operacoes[0]?.tabela).toBe("rpc:registrar_uso_tutor");
  });

  it("acima de 20 mensagens por hora responde 429 sem chamar o Gemini", async () => {
    const { buscar } = geminiFalso();
    const erro = await responderTutor({
      admin: bancoFalso({ permitido: false }).cliente,
      usuarioId: "u1",
      mensagem: "Oi",
      historico: [],
      gemini: config(buscar),
    }).catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 429, codigo: "LIMITE_TUTOR" });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("sem trechos relevantes responde sem lições relacionadas", async () => {
    const { buscar } = geminiFalso();
    const r = await responderTutor({
      admin: bancoFalso({ trechos: [trechos[3]!] }).cliente,
      usuarioId: "u1",
      mensagem: "Quem ganhou o jogo ontem?",
      historico: [],
      gemini: config(buscar),
    });
    expect(r.licoesRelacionadas).toEqual([]);
  });

  it("resposta bloqueada vira uma mensagem padrão", async () => {
    const { buscar } = geminiFalso({ promptFeedback: { blockReason: "SAFETY" } });
    const r = await responderTutor({
      admin: bancoFalso({ trechos }).cliente,
      usuarioId: "u1",
      mensagem: "x",
      historico: [],
      gemini: config(buscar),
    });
    expect(r).toEqual({ resposta: RESPOSTA_BLOQUEADA, licoesRelacionadas: [] });
  });

  it("corta a resposta no limite de tamanho", async () => {
    const { buscar } = geminiFalso({ candidates: [{ content: { parts: [{ text: "energia ".repeat(500) }] } }] });
    const r = await responderTutor({
      admin: bancoFalso({ trechos }).cliente,
      usuarioId: "u1",
      mensagem: "x",
      historico: [],
      gemini: config(buscar),
    });
    expect(r.resposta.length).toBeLessThanOrEqual(1500);
  });

  it("falha do Gemini vira 503 TUTOR_INDISPONIVEL e o log não tem o texto da conversa", async () => {
    const buscar: Buscar = async () => {
      throw new TypeError("fetch failed");
    };
    const mensagem = "pergunta secreta do aluno";
    const erro = await responderTutor({
      admin: bancoFalso({ trechos }).cliente,
      usuarioId: "u1",
      mensagem,
      historico: [{ papel: "usuario", texto: "histórico secreto" }],
      gemini: config(buscar),
    }).catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 503, codigo: "TUTOR_INDISPONIVEL" });
    const logs = JSON.stringify(erroConsole.mock.calls);
    expect(logs).not.toContain("secret");
  });
});

describe("validação do pedido ao tutor", () => {
  it("aceita mensagem com histórico opcional", () => {
    expect(tutorSchema.parse({ mensagem: "  O que é kWh?  " })).toEqual({ mensagem: "O que é kWh?", historico: [] });
  });

  it.each([
    ["mensagem vazia", { mensagem: "   " }],
    ["mensagem longa", { mensagem: "a".repeat(501) }],
    ["histórico longo", { mensagem: "oi", historico: Array.from({ length: 11 }, () => ({ papel: "usuario", texto: "a" })) }],
    ["papel inválido", { mensagem: "oi", historico: [{ papel: "system", texto: "a" }] }],
    ["texto do histórico longo", { mensagem: "oi", historico: [{ papel: "usuario", texto: "a".repeat(1001) }] }],
    ["campo extra", { mensagem: "oi", modelo: "outro" }],
  ])("recusa %s", (_nome, corpo) => {
    expect(tutorSchema.safeParse(corpo).success).toBe(false);
  });
});

describe("POST /api/tutor", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
  });

  it("exige login", async () => {
    const r = await POST(
      new NextRequest("http://localhost:3000/api/tutor", { method: "POST", body: JSON.stringify({ mensagem: "oi" }) }),
    );
    expect(r.status).toBe(401);
    expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
  });
});
