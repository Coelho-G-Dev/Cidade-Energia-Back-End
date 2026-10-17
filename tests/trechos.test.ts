import { describe, expect, it } from "vitest";
import { dividirEmTrechos, limparConteudo } from "@/lib/ia/trechos";

const licao = (conteudo: string) => ({ id: "l1", titulo: "O sol de São Luís", trilha: "Energia solar", conteudo });

describe("limparConteudo", () => {
  it("tira as marcas de revisão e o negrito", () => {
    expect(
      limparConteudo("> [REVISAR]\n\nRecebe **5,2 kWh por dia** [CONFERIR FONTE]. Fim."),
    ).toBe("Recebe 5,2 kWh por dia. Fim.");
  });
});

describe("dividirEmTrechos", () => {
  it("lição curta vira um trecho com trilha e título no começo", () => {
    expect(dividirEmTrechos(licao("Primeiro parágrafo.\n\nSegundo parágrafo."))).toEqual([
      {
        licaoId: "l1",
        titulo: "O sol de São Luís",
        texto: "Trilha: Energia solar. Lição: O sol de São Luís.\nPrimeiro parágrafo.\n\nSegundo parágrafo.",
      },
    ]);
  });

  it("agrupa parágrafos até o limite e repete a última frase curta no trecho seguinte", () => {
    const p1 = "A".repeat(50) + ". Frase ponte.";
    const p2 = "B".repeat(60) + ".";
    const trechos = dividirEmTrechos(licao(`${p1}\n\n${p2}`), 80);

    expect(trechos).toHaveLength(2);
    expect(trechos[0]?.texto).toContain(p1);
    expect(trechos[1]?.texto).toContain(`Frase ponte.\n\n${p2}`);
  });

  it("quebra parágrafos maiores que o limite sem perder texto", () => {
    const frases = Array.from({ length: 30 }, (_, i) => `Frase número ${i} sobre energia solar.`);
    const trechos = dividirEmTrechos(licao(frases.join(" ")), 200);
    const corpo = trechos.map((t) => t.texto.split("\n").slice(1).join("\n")).join(" ");

    expect(trechos.length).toBeGreaterThan(1);
    for (const t of trechos) expect(t.texto.split("\n").slice(1).join("\n").length).toBeLessThanOrEqual(200);
    for (const f of frases) expect(corpo).toContain(f);
  });

  it("lição sem texto não gera trecho", () => {
    expect(dividirEmTrechos(licao("> [REVISAR]\n\n"))).toEqual([]);
  });
});
