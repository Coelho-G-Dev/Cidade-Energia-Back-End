import { z } from "zod";
import {
  DIMENSAO_EMBEDDING,
  EMBEDDINGS_POR_LOTE,
  GEMINI_API_URL,
  MODELO_EMBEDDING,
  TIMEOUT_GEMINI_MS,
  TUTOR_MAX_TOKENS_SAIDA,
} from "@/lib/config";

export type Buscar = (url: string, init?: RequestInit) => Promise<Response>;
export type ConfigGemini = { apiKey: string; buscar?: Buscar };
export type Mensagem = { papel: "usuario" | "energinho"; texto: string };

export class ErroGemini extends Error {
  constructor(
    mensagem: string,
    readonly status: number | null = null,
  ) {
    super(mensagem);
    this.name = "ErroGemini";
  }
}

const respostaEmbeddings = z.object({
  embeddings: z.array(z.object({ values: z.array(z.number()).length(DIMENSAO_EMBEDDING) })),
});

const respostaGeracao = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }).optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

const MOTIVOS_DE_BLOQUEIO = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"]);

export const textoDeDocumento = (titulo: string, texto: string) => `title: ${titulo} | text: ${texto}`;
export const textoDeConsulta = (pergunta: string) => `task: question answering | query: ${pergunta}`;

async function chamar(caminho: string, corpo: unknown, cfg: ConfigGemini): Promise<unknown> {
  const buscar = cfg.buscar ?? fetch;
  let resposta: Response;
  try {
    resposta = await buscar(`${GEMINI_API_URL}/${caminho}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_GEMINI_MS),
      cache: "no-store",
    });
  } catch (e) {
    throw new ErroGemini(`Falha de rede no Gemini: ${e instanceof Error ? e.name : "desconhecida"}`);
  }
  if (!resposta.ok) throw new ErroGemini(`Gemini respondeu ${resposta.status}`, resposta.status);
  try {
    return await resposta.json();
  } catch {
    throw new ErroGemini("Gemini devolveu um JSON inválido");
  }
}

export async function gerarEmbeddings(textos: string[], cfg: ConfigGemini): Promise<number[][]> {
  const vetores: number[][] = [];
  for (let i = 0; i < textos.length; i += EMBEDDINGS_POR_LOTE) {
    const lote = textos.slice(i, i + EMBEDDINGS_POR_LOTE);
    const corpo = {
      requests: lote.map((text) => ({
        model: `models/${MODELO_EMBEDDING}`,
        content: { parts: [{ text }] },
        outputDimensionality: DIMENSAO_EMBEDDING,
      })),
    };
    const resposta = respostaEmbeddings.safeParse(await chamar(`models/${MODELO_EMBEDDING}:batchEmbedContents`, corpo, cfg));
    if (!resposta.success || resposta.data.embeddings.length !== lote.length) {
      throw new ErroGemini("Formato inesperado nos embeddings do Gemini");
    }
    vetores.push(...resposta.data.embeddings.map((e) => e.values));
  }
  return vetores;
}

export async function gerarEmbedding(texto: string, cfg: ConfigGemini): Promise<number[]> {
  const [vetor] = await gerarEmbeddings([texto], cfg);
  if (!vetor) throw new ErroGemini("Gemini não devolveu embedding");
  return vetor;
}

export type PedidoResposta = { modelo: string; instrucoes: string; historico: Mensagem[]; mensagem: string };

export async function gerarResposta(pedido: PedidoResposta, cfg: ConfigGemini): Promise<string | null> {
  const corpo = {
    systemInstruction: { parts: [{ text: pedido.instrucoes }] },
    contents: [...pedido.historico, { papel: "usuario", texto: pedido.mensagem }].map((m) => ({
      role: m.papel === "usuario" ? "user" : "model",
      parts: [{ text: m.texto }],
    })),
    generationConfig: { maxOutputTokens: TUTOR_MAX_TOKENS_SAIDA, temperature: 0.3 },
  };

  const resposta = respostaGeracao.safeParse(await chamar(`models/${pedido.modelo}:generateContent`, corpo, cfg));
  if (!resposta.success) throw new ErroGemini("Formato inesperado na resposta do Gemini");
  if (resposta.data.promptFeedback?.blockReason) return null;

  const candidato = resposta.data.candidates?.[0];
  if (candidato?.finishReason && MOTIVOS_DE_BLOQUEIO.has(candidato.finishReason)) return null;

  const texto = (candidato?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!texto) throw new ErroGemini(`Gemini não devolveu texto (${candidato?.finishReason ?? "sem candidato"})`);
  return texto;
}
