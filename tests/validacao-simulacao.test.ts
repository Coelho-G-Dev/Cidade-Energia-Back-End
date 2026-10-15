import { describe, expect, it } from "vitest";
import { criarSimulacaoSchema } from "@/lib/validacao/simulacao";

const tv = "11111111-1111-4111-8111-111111111111";
const ar = "22222222-2222-4222-8222-222222222222";

describe("criarSimulacaoSchema — modo conta", () => {
  it("aceita consumo com ou sem valor da conta", () => {
    expect(criarSimulacaoSchema.parse({ modo: "conta", consumoKwh: 380, valorConta: 312 })).toEqual({
      modo: "conta",
      consumoKwh: 380,
      valorConta: 312,
    });
    expect(criarSimulacaoSchema.safeParse({ modo: "conta", consumoKwh: 380 }).success).toBe(true);
  });

  it("recusa consumo zero, negativo, texto ou ausente", () => {
    for (const consumoKwh of [0, -1, "380", undefined]) {
      expect(criarSimulacaoSchema.safeParse({ modo: "conta", consumoKwh }).success).toBe(false);
    }
  });

  it("recusa campos que o cliente não deve mandar (ex.: pontos)", () => {
    expect(criarSimulacaoSchema.safeParse({ modo: "conta", consumoKwh: 100, pontos: 999 }).success).toBe(false);
  });
});

describe("criarSimulacaoSchema — modo aparelhos", () => {
  it("aceita itens válidos", () => {
    const r = criarSimulacaoSchema.safeParse({
      modo: "aparelhos",
      itens: [
        { aparelhoId: tv, quantidade: 2, horasDia: 4 },
        { aparelhoId: ar, quantidade: 1, horasDia: 0.5 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("recusa lista vazia e aparelho repetido", () => {
    expect(criarSimulacaoSchema.safeParse({ modo: "aparelhos", itens: [] }).success).toBe(false);
    const repetido = { aparelhoId: tv, quantidade: 1, horasDia: 1 };
    expect(criarSimulacaoSchema.safeParse({ modo: "aparelhos", itens: [repetido, repetido] }).success).toBe(false);
  });

  it.each([
    ["quantidade fracionada", { quantidade: 1.5 }],
    ["quantidade zero", { quantidade: 0 }],
    ["horas acima de 24", { horasDia: 25 }],
    ["horas zero", { horasDia: 0 }],
    ["id inválido", { aparelhoId: "tv" }],
    ["potência enviada pelo cliente", { potenciaW: 10 }],
  ])("recusa %s", (_nome, alteracao) => {
    const itens = [{ aparelhoId: tv, quantidade: 1, horasDia: 1, ...alteracao }];
    expect(criarSimulacaoSchema.safeParse({ modo: "aparelhos", itens }).success).toBe(false);
  });

  it("recusa modo desconhecido", () => {
    expect(criarSimulacaoSchema.safeParse({ modo: "outro", consumoKwh: 1 }).success).toBe(false);
  });
});
