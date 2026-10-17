import { SOBREPOSICAO_MAXIMA_CARACTERES, TRECHO_MAXIMO_CARACTERES } from "@/lib/config";

export type LicaoParaIndexar = { id: string; titulo: string; trilha: string; conteudo: string };
export type Trecho = { licaoId: string; titulo: string; texto: string };

const MARCAS_DE_REVISAO = /\s*\[(REVISAR|CONFERIR FONTE)\]/g;

export function limparConteudo(conteudo: string): string {
  return conteudo
    .replace(MARCAS_DE_REVISAO, "")
    .split(/\r?\n/)
    .filter((linha) => linha.trim() !== ">")
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function frases(texto: string): string[] {
  return texto.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g)?.map((f) => f.trim()).filter(Boolean) ?? [texto];
}

function quebrarLongo(paragrafo: string, maximo: number): string[] {
  const partes: string[] = [];
  let atual = "";
  for (const frase of frases(paragrafo)) {
    const pedacos = frase.length > maximo ? (frase.match(new RegExp(`.{1,${maximo}}(\\s|$)`, "g")) ?? [frase]) : [frase];
    for (const pedaco of pedacos.map((p) => p.trim())) {
      if (atual && atual.length + 1 + pedaco.length > maximo) {
        partes.push(atual);
        atual = pedaco;
      } else {
        atual = atual ? `${atual} ${pedaco}` : pedaco;
      }
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

function ultimaFrase(texto: string): string {
  const ultima = frases(texto).at(-1) ?? "";
  return ultima.length <= SOBREPOSICAO_MAXIMA_CARACTERES && ultima !== texto ? ultima : "";
}

export function dividirEmTrechos(licao: LicaoParaIndexar, maximo = TRECHO_MAXIMO_CARACTERES): Trecho[] {
  const paragrafos = limparConteudo(licao.conteudo)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > maximo ? quebrarLongo(p, maximo) : [p]));

  const blocos: string[] = [];
  let atual = "";
  for (const paragrafo of paragrafos) {
    if (atual && atual.length + 2 + paragrafo.length > maximo) {
      blocos.push(atual);
      const ponte = ultimaFrase(atual);
      atual = ponte && ponte.length + 2 + paragrafo.length <= maximo ? `${ponte}\n\n${paragrafo}` : paragrafo;
    } else {
      atual = atual ? `${atual}\n\n${paragrafo}` : paragrafo;
    }
  }
  if (atual) blocos.push(atual);

  const cabecalho = `Trilha: ${licao.trilha}. Lição: ${licao.titulo}.`;
  return blocos.map((texto) => ({ licaoId: licao.id, titulo: licao.titulo, texto: `${cabecalho}\n${texto}` }));
}
