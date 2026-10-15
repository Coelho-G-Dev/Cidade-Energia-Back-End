import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErroCalculo } from "@/lib/calculos/simulador";
import { ErroApi, respostaErro, tratarErro } from "@/lib/http/erros";

describe("respostaErro", () => {
  it("monta o corpo no formato padrão com o status informado", async () => {
    const r = respostaErro(404, "NAO_ENCONTRADO", "Não achei.");
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: { codigo: "NAO_ENCONTRADO", mensagem: "Não achei." } });
  });
});

describe("tratarErro", () => {
  it("usa status e código do ErroApi", async () => {
    const r = tratarErro(new ErroApi(401, "NAO_AUTENTICADO", "Faça login."));
    expect(r.status).toBe(401);
    expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
  });

  it("converte ZodError em 400 ENTRADA_INVALIDA citando o campo", async () => {
    const resultado = z.object({ idade: z.number() }).safeParse({ idade: "x" });
    const r = tratarErro(resultado.error);
    const corpo = await r.json();
    expect(r.status).toBe(400);
    expect(corpo.erro.codigo).toBe("ENTRADA_INVALIDA");
    expect(corpo.erro.mensagem).toContain("idade");
  });

  it("converte ErroCalculo em 400 ENTRADA_INVALIDA", async () => {
    const r = tratarErro(new ErroCalculo("Informe pelo menos um aparelho."));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      erro: { codigo: "ENTRADA_INVALIDA", mensagem: "Informe pelo menos um aparelho." },
    });
  });

  it("converte JSON malformado em 400 JSON_INVALIDO", async () => {
    let erro: unknown;
    try {
      JSON.parse("{");
    } catch (e) {
      erro = e;
    }
    const r = tratarErro(erro);
    expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("JSON_INVALIDO");
  });

  it("esconde detalhes de erros inesperados atrás de 500 ERRO_INTERNO", async () => {
    const original = console.error;
    console.error = () => {};
    const r = tratarErro(new Error("senha do banco: 123"));
    console.error = original;
    const corpo = await r.json();
    expect(r.status).toBe(500);
    expect(corpo.erro.codigo).toBe("ERRO_INTERNO");
    expect(corpo.erro.mensagem).not.toContain("senha");
  });
});
