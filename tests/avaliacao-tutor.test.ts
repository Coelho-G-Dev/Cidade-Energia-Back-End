import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { avaliarConjunto, avaliarResposta, CONTEXTO_FICTICIO, referenciaSchema, relatorioAvaliacao } from "@/lib/ia/avaliacao";
import { gerarRespostaTutor } from "@/lib/ia/rag";
import { supabaseFalso } from "./apoio/supabase-falso";
const casos = referenciaSchema.parse(JSON.parse(readFileSync("tests/fixtures/avaliacao-tutor-exemplo.json", "utf8")));
describe("avaliação do tutor sem chamadas reais", () => {
  it("normaliza acentos/caixa, deveConter é qualquer termo e proibidos são todos", () => {
    expect(avaliarResposta(casos[0]!, "ENERGÍA consumida")).toEqual([]);
    expect(avaliarResposta(casos[0]!, "Energia: envie sua SENHA")).toContain("Contém termos proibidos: senha.");
    expect(avaliarResposta(casos[0]!, "Olá")).toHaveLength(1);
  });
  it("marcadores de recusa e incerteza são verificáveis", () => {
    expect(avaliarResposta(casos[1]!, "Só posso ajudar com energia.")).toEqual([]);
    expect(avaliarResposta(casos[2]!, "Não sei com certeza. Converse com seu professor.")).toEqual([]);
    expect(avaliarResposta(casos[1]!, "Aqui está a história de futebol")).toHaveLength(1);
  });
  it("valida formato, ids únicos e ao menos um critério", () => {
    expect(referenciaSchema.safeParse([{ ...casos[0], criterio: {} }]).success).toBe(false);
    expect(referenciaSchema.safeParse([casos[0], casos[0]]).success).toBe(false);
  });
  it("relatório traz taxa por grupo, resposta reprovada e sugestões sem aplicar", async () => {
    const r = await avaliarConjunto(casos, async (c) => c.id === casos[0]!.id ? "Energia" : "Resposta inadequada simulada", { intervaloMs: 0 });
    const md = relatorioAvaliacao(r, new Date("2026-11-21T12:00:00Z"));
    expect(md).toContain("| no_tema | 1 | 2 | 0 | 2 | 50,0% |"); expect(md).toContain("| fora_do_tema | 0 | 1 | 0 | 1 | 0,0% |");
    expect(md).toContain("> Resposta inadequada simulada"); expect(md).toContain("Ajustes sugeridos");
    const erro = await avaliarConjunto([casos[0]!], async () => { throw new Error("SEGREDO-REMOTO"); });
    expect(relatorioAvaliacao(erro, new Date())).not.toContain("SEGREDO-REMOTO");
  });
  it("o mesmo RAG+instruções+geração só lê match_documentos/licoes e usa contexto fictício", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const { cliente, operacoes } = supabaseFalso((op) => {
      if (op.tabela === "rpc:match_documentos") return { data: [{ licao_id: id, trecho: "Energia fictícia para teste", similaridade: 0.9 }] };
      if (op.tabela === "licoes") return { data: [{ id, titulo: "Teste", trilhas: { slug: "solar" } }] };
      throw new Error(`Operação proibida: ${op.tabela}`);
    });
    let instrucoes = "";
    const buscar = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith(":batchEmbedContents")) return Response.json({ embeddings: [{ values: Array(768).fill(0.1) }] });
      const corpo = JSON.parse(String(init?.body)); instrucoes = JSON.stringify(corpo.systemInstruction);
      return Response.json({ candidates: [{ content: { parts: [{ text: "Energia simulada" }] }, finishReason: "STOP" }] });
    });
    const r = await gerarRespostaTutor({ admin: cliente, mensagem: casos[2]!.pergunta, historico: [], estudante: CONTEXTO_FICTICIO,
      gemini: { apiKey: "ficticia", modelo: "teste", buscar } });
    expect(r.resposta).toBe("Energia simulada"); expect(instrucoes).toContain("Bairro fictício"); expect(instrucoes).toContain("Energia fictícia");
    expect(operacoes.map((o) => o.tabela)).toEqual(["rpc:match_documentos", "licoes"]);
    expect(operacoes.flatMap((o) => o.chamadas.map((c) => c.metodo))).not.toEqual(expect.arrayContaining(["insert", "upsert", "update", "delete"]));
  });
});
