import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
type Pergunta = { slug: string; ordem: number; enunciado: string; opcoes: string[]; indice_correto: number; explicacao: string; fonte: string };
const seed = readFileSync("supabase/seeds/conteudo.sql", "utf8");
const perguntas = JSON.parse(seed.split("$diagnostico_aprovado$")[1]!) as Pergunta[];
const aprovado = readFileSync("../docs/qa/fase3-perguntas-diagnostico.md", "utf8").replace(/\r\n/g, "\n");
const slugs = ["energia-solar-em-sao-luis", "a-energia-do-maranhao", "ar-condicionado-sem-susto", "entendendo-a-sua-conta-de-luz", "lixo-eletronico-onde-descartar"];
describe("conteúdo aprovado do diagnóstico T-031", () => {
  it("20 perguntas, quatro por trilha na ordem D1.1 a D5.4 e índices 5/5/5/5", () => {
    expect(perguntas).toHaveLength(20);
    for (const slug of slugs) expect(perguntas.filter((p) => p.slug === slug).map((p) => p.ordem)).toEqual([1, 2, 3, 4]);
    for (const indice of [0, 1, 2, 3]) expect(perguntas.filter((p) => p.indice_correto === indice)).toHaveLength(5);
    expect(perguntas.every((p) => p.opcoes.length === 4 && !p.enunciado.includes("FICTÍCIO"))).toBe(true);
  });
  it("enunciados, opções, explicações e fontes são cópias literais da versão aprovada", () => {
    expect(aprovado).toContain("Aprovação do Coelho: aprovada em 2026-11-21");
    const blocos = aprovado.split(/^### D([1-5])\.([1-4])$/m);
    expect(blocos).toHaveLength(61);
    for (let i = 1; i < blocos.length; i += 3) {
      const trilha = Number(blocos[i]); const ordem = Number(blocos[i + 1]); const texto = blocos[i + 2]!;
      const campo = (nome: string) => texto.split("\n").find((l) => l.startsWith(`- **${nome}:** `))!.slice(`- **${nome}:** `.length);
      const opcoes = [...texto.matchAll(/^  - `([0-3])`: (.+)$/gm)];
      const indice = Number(opcoes.find((o) => o[2]!.endsWith(" **(certa)**"))![1]);
      expect(perguntas.find((p) => p.slug === slugs[trilha - 1] && p.ordem === ordem)).toEqual({
        slug: slugs[trilha - 1], ordem, enunciado: campo("Enunciado"), opcoes: opcoes.map((o) => o[2]!.replace(/ \*\*\(certa\)\*\*$/, "")),
        indice_correto: indice, explicacao: campo("Explicação curta"), fonte: campo("Fonte"),
      });
    }
  });
});
