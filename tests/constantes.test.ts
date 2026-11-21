import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as config from "@/lib/config";

const documento = readFileSync(new URL("../CONSTANTES.md", import.meta.url), "utf8");
const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8");

function numerosExportados(objeto: Record<string, unknown>, prefixo = ""): Map<string, number> {
  const numeros = new Map<string, number>();
  for (const [nome, valor] of Object.entries(objeto)) {
    const caminho = prefixo ? `${prefixo}.${nome}` : nome;
    if (typeof valor === "number") numeros.set(caminho, valor);
    else if (valor !== null && typeof valor === "object") {
      for (const [chave, numero] of numerosExportados(valor as Record<string, unknown>, caminho)) numeros.set(chave, numero);
    }
  }
  return numeros;
}

function lerNumero(texto: string): number {
  // Permite decimal ou fração simples (10 / 60); nunca executa conteúdo Markdown.
  const partes = texto.match(/^(-?\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?$/);
  if (!partes) return NaN;
  return Number(partes[1]) / (partes[2] === undefined ? 1 : Number(partes[2]));
}

function divergencias(texto: string, exportados: Record<string, unknown> = config): string[] {
  const esperado = numerosExportados(exportados);
  const registrado = new Map<string, number>();
  const erros: string[] = [];
  const linha = /^\|\s*`([A-Z][A-Z0-9_]*(?:\.\w+)*)`\s*\|\s*`([^`]+)`\s*\|/gm;
  for (const m of texto.matchAll(linha)) {
    const nome = m[1]!;
    if (registrado.has(nome)) erros.push(`${nome}: duplicada`);
    registrado.set(nome, lerNumero(m[2]!));
  }
  for (const [nome, valor] of esperado) {
    if (!registrado.has(nome)) erros.push(`${nome}: ausente`);
    else if (registrado.get(nome) !== valor) erros.push(`${nome}: valor divergente`);
  }
  for (const nome of registrado.keys()) {
    if (!esperado.has(nome)) erros.push(`${nome}: não existe como número exportado`);
  }
  return erros;
}

describe("CONSTANTES.md", () => {
  it("documenta cada export numérico de config.ts, inclusive objetos, com o valor exato", () => {
    expect(numerosExportados(config).size).toBeGreaterThan(0);
    expect(divergencias(documento)).toEqual([]);
  });

  it("detecta uma constante omitida no documento", () => {
    const semLinha = documento.split("\n").filter((linha) => !linha.startsWith("| `DIAS_POR_MES` |")).join("\n");
    expect(divergencias(semLinha)).toContain("DIAS_POR_MES: ausente");
  });

  it("detecta valor divergente, inclusive dentro de REGRAS_ECONOMIA", () => {
    const adulterado = documento.replace("| `10 / 60` |", "| `0.5` |");
    expect(divergencias(adulterado)).toContain("REGRAS_ECONOMIA.chuveiro.reducaoHorasDia: valor divergente");
  });

  it("exige documentação para uma nova constante exportada sem lista fixa no teste", () => {
    const novosExports = { ...config, NOVA_CONSTANTE_DE_CALCULO: 42 };
    expect(divergencias(documento, novosExports)).toContain("NOVA_CONSTANTE_DE_CALCULO: ausente");
  });

  it("mantém potência e horas padrão de todos os aparelhos iguais ao seed", () => {
    const bloco = seed.split("insert into public.aparelhos (codigo, nome, potencia_w, horas_padrao, icone) values")[1]?.split("on conflict")[0];
    expect(bloco).toBeDefined();
    const doSeed = [...(bloco ?? "").matchAll(/\('([^']+)',\s*'[^']+',\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),/g)]
      .map((m) => [m[1], Number(m[2]), Number(m[3])]);
    const doDocumento = [...documento.matchAll(/^\|\s*`([a-z_]+)`\s*\|\s*`([\d.]+)`\s*\|\s*`([\d.]+)`\s*\|/gm)]
      .map((m) => [m[1], Number(m[2]), Number(m[3])]);
    expect(doSeed.length).toBeGreaterThan(0);
    expect(doDocumento.sort()).toEqual(doSeed.sort());
  });
});
