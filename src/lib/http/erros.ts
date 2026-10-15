import { ZodError } from "zod";
import { ErroCalculo } from "@/lib/calculos/simulador";

export type CorpoErro = { erro: { codigo: string; mensagem: string } };

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export const naoAutenticado = () =>
  new ErroApi(401, "NAO_AUTENTICADO", "Faça login para acessar este recurso.");

export const naoEncontrado = (codigo: string, mensagem: string) =>
  new ErroApi(404, codigo, mensagem);

type ErroBanco = { code?: string; message: string };

export function erroDoBanco(e: ErroBanco): ErroApi | Error {
  if (e.code === "23503") {
    return new ErroApi(400, "REFERENCIA_INVALIDA", "Algum identificador enviado não existe.");
  }
  return new Error(`Erro do banco${e.code ? ` (${e.code})` : ""}: ${e.message}`);
}

export function respostaErro(status: number, codigo: string, mensagem: string): Response {
  const corpo: CorpoErro = { erro: { codigo, mensagem } };
  return Response.json(corpo, { status });
}

function resumirZod(e: ZodError): string {
  const primeiro = e.issues[0];
  if (!primeiro) return "Dados inválidos.";
  const campo = primeiro.path.join(".");
  return campo ? `${campo}: ${primeiro.message}` : primeiro.message;
}

export function tratarErro(e: unknown): Response {
  if (e instanceof ErroApi) return respostaErro(e.status, e.codigo, e.message);
  if (e instanceof ZodError) return respostaErro(400, "ENTRADA_INVALIDA", resumirZod(e));
  if (e instanceof ErroCalculo) return respostaErro(400, "ENTRADA_INVALIDA", e.message);
  if (e instanceof SyntaxError) {
    return respostaErro(400, "JSON_INVALIDO", "O corpo da requisição não é um JSON válido.");
  }
  console.error(e);
  return respostaErro(500, "ERRO_INTERNO", "Ocorreu um erro inesperado. Tente novamente.");
}
