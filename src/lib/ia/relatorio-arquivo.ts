import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
export async function gravarRelatorioAvaliacao(pasta: string, dia: string, texto: string): Promise<string> {
  z.iso.date().parse(dia);
  await mkdir(pasta, { recursive: true });
  for (let numero = 1; ; numero++) {
    const destino = resolve(pasta, `relatorio-${dia}${numero === 1 ? "" : `-${numero}`}.md`);
    try { await writeFile(destino, texto, { encoding: "utf8", flag: "wx" }); return destino; }
    catch (erro) { if (!(erro instanceof Error) || !("code" in erro) || erro.code !== "EEXIST") throw erro; }
  }
}
