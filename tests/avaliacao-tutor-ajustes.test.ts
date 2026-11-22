import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { avaliarConjunto, avaliarResposta, intervaloCliSchema, referenciaSchema, relatorioAvaliacao } from "@/lib/ia/avaliacao";
import { gravarRelatorioAvaliacao } from "@/lib/ia/relatorio-arquivo";
import { ErroGemini } from "@/lib/ia/gemini";
import { gerarRespostaTutor } from "@/lib/ia/rag";
import { supabaseFalso } from "./apoio/supabase-falso";
const casos = referenciaSchema.parse(JSON.parse(readFileSync("tests/fixtures/avaliacao-tutor-exemplo.json", "utf8")));
const relatorioReal = readFileSync("../docs/qa/energinho/relatorio-2026-11-21.md", "utf8").replace(/\r\n/g, "\n");
function respostaReal(id: string) {
  const bloco = relatorioReal.split(/^### /m).find((b) => b.startsWith(`${id} (`));
  if (!bloco) throw new Error(`Caso do relatório não encontrado: ${id}`);
  return bloco.split("Resposta recebida:")[1]!.split("\n").filter((l) => l.startsWith("> ")).map((l) => l.slice(2)).join("\n");
}
describe("marcadores com respostas reais da primeira rodada", () => {
  it.each(["fora-do-tema-01", "fora-do-tema-02", "fora-do-tema-05", "fora-do-tema-06", "fora-do-tema-07", "dado-pessoal-11"])("reconhece a recusa em %s", (id) => {
    expect(avaliarResposta({ ...casos[1]!, id, criterio: { deveRecusar: true } }, respostaReal(id))).toEqual([]);
  });
  it("reconhece falta de informação em no-tema-11, sem transformar isso em recusa", () => {
    expect(avaliarResposta({ ...casos[2]!, criterio: { deveAdmitirQueNaoSabe: true, deveRecusar: false } }, respostaReal("no-tema-11"))).toEqual([]);
  });
  it.each(["Só posso te ajudar com energia.", "Só posso conversar sobre energia.", "Só consigo ajudar com energia.", "Só posso tentar lhe ajudar com energia."])("aceita variação: %s", (resposta) => {
    expect(avaliarResposta({ ...casos[1]!, criterio: { deveRecusar: true } }, resposta)).toEqual([]);
  });
  it.each(["Não tenho esse número.", "Não tenho esse valor.", "Não tenho esse dado.", "As lições não trazem esse número.", "O conteúdo não traz essa informação.", "Nas minhas lições não fala a porcentagem exata."])("aceita falta de informação: %s", (resposta) => {
    expect(avaliarResposta(casos[2]!, resposta)).toEqual([]);
  });
  it("não confunde explicação afirmativa com recusa/incerteza", () => {
    expect(avaliarResposta({ ...casos[0]!, criterio: { deveRecusar: false, deveAdmitirQueNaoSabe: false } }, "As lições trazem os dados de energia. Posso te ajudar com esse cálculo.")).toEqual([]);
  });
});
describe("pausas e tentativas sem Gemini real", () => {
  it("padrão de 4000 ms entre casos, sem pausa inicial ou final", async () => {
    const esperar = vi.fn<(ms: number) => Promise<void>>(async () => {});
    await avaliarConjunto(casos, async () => "Energia", { esperar });
    expect(esperar.mock.calls.map(([ms]) => ms)).toEqual([4000, 4000]);
  });
  it("intervalo configurável e validação antes de executar", async () => {
    expect(intervaloCliSchema.parse(undefined)).toBe(4000); expect(intervaloCliSchema.parse("2500")).toBe(2500);
    for (const entrada of ["-1", "NaN", "1.2", "", "4s"]) expect(intervaloCliSchema.safeParse(entrada).success).toBe(false);
    const responder = vi.fn(async () => "Energia"); const esperar = vi.fn<(ms: number) => Promise<void>>(async () => {});
    await avaliarConjunto(casos.slice(0, 2), responder, { intervaloMs: 12, esperar }); expect(esperar).toHaveBeenCalledExactlyOnceWith(12);
    await expect(avaliarConjunto(casos, responder, { intervaloMs: -1 })).rejects.toThrow(); expect(responder).toHaveBeenCalledTimes(2);
  });
  it("até três tentativas totais em 429 com espera crescente; sucesso final é avaliado", async () => {
    let chamadas = 0; const esperar = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const r = await avaliarConjunto([casos[0]!], async () => { if (++chamadas < 3) throw new ErroGemini("Gemini respondeu 429", 429); return "Energia"; }, { esperar });
    expect(chamadas).toBe(3); expect(esperar.mock.calls.map(([ms]) => ms)).toEqual([4000, 8000]);
    expect(r[0]).toMatchObject({ status: "aprovado", tentativas: 3, falhas: [] });
  });
  it("429 esgotado fica à parte e fora da taxa; outros erros não são repetidos", async () => {
    const esperar = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const repetido = { ...casos[0]!, id: "limite-429" }; const falha = { ...casos[0]!, id: "falha-503" };
    const chamadas = new Map<string, number>();
    const r = await avaliarConjunto([casos[0]!, repetido, falha], async (c) => {
      chamadas.set(c.id, (chamadas.get(c.id) ?? 0) + 1);
      if (c.id === repetido.id) throw new ErroGemini("DADO-REMOTO-NAO-PUBLICAVEL", 429);
      if (c.id === falha.id) throw new ErroGemini("DADO-REMOTO-NAO-PUBLICAVEL", 503);
      return "Energia";
    }, { intervaloMs: 0, esperar });
    expect(chamadas.get(repetido.id)).toBe(3); expect(chamadas.get(falha.id)).toBe(1);
    expect(r[1]).toMatchObject({ status: "nao_avaliado", tentativas: 3, falhas: [], resposta: "não avaliado (limite do Gemini)" });
    const md = relatorioAvaliacao(r, new Date());
    expect(md).toContain("| no_tema | 1 | 2 | 1 | 3 | 50,0% |"); expect(md).not.toContain("DADO-REMOTO-NAO-PUBLICAVEL");
    expect(md.split("## Reprovações")[1]!.split("## Não avaliados")[0]).not.toContain("limite-429");
    expect(md).toContain("limite-429 (no_tema): não avaliado (limite do Gemini); 3 tentativas.");
  });
  it("grupo inteiramente limitado não ganha taxa de 0% nem de 100%", async () => {
    const r = await avaliarConjunto([casos[0]!], async () => { throw new ErroGemini("429", 429); }, { intervaloMs: 0, esperar: async () => {} });
    expect(relatorioAvaliacao(r, new Date())).toContain("| no_tema | 0 | 0 | 1 | 1 | sem casos avaliados |");
  });
  it("reconhece o 429 original no erro público 503 da geração compartilhada", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { cliente } = supabaseFalso(() => { throw new Error("Não deveria consultar banco após embedding limitado"); });
      const buscar = vi.fn(async () => new Response("", { status: 429 }));
      const r = await avaliarConjunto([casos[0]!], async (caso) => (await gerarRespostaTutor({ admin: cliente, mensagem: caso.pergunta, historico: [], gemini: { apiKey: "ficticia", modelo: "teste", buscar } })).resposta,
        { intervaloMs: 0, esperar: async () => {} });
      expect(buscar).toHaveBeenCalledTimes(3); expect(r[0]!.status).toBe("nao_avaliado");
    } finally { log.mockRestore(); }
  });
});
describe("relatórios numerados, sem tocar docs/qa", () => {
  it("mantém o relatório original e escolhe -2/-3 mesmo com chamadas concorrentes", async () => {
    const base = resolve("tests/fixtures"); const pasta = await mkdtemp(join(base, ".relatorios-teste-"));
    try {
      const original = join(pasta, "relatorio-2026-11-21.md"); await writeFile(original, "original", "utf8");
      const destinos = await Promise.all([gravarRelatorioAvaliacao(pasta, "2026-11-21", "nova A"), gravarRelatorioAvaliacao(pasta, "2026-11-21", "nova B")]);
      expect(destinos.map((d) => basename(d)).sort()).toEqual(["relatorio-2026-11-21-2.md", "relatorio-2026-11-21-3.md"]);
      expect(await readFile(original, "utf8")).toBe("original");
      expect((await Promise.all(destinos.map((d) => readFile(d, "utf8")))).sort()).toEqual(["nova A", "nova B"]);
      await expect(gravarRelatorioAvaliacao(pasta, "../fora", "não gravar")).rejects.toThrow();
    } finally {
      if (dirname(resolve(pasta)) !== base || !basename(pasta).startsWith(".relatorios-teste-")) throw new Error("Pasta temporária fora do escopo");
      await rm(pasta, { recursive: true, force: true });
    }
  });
});
