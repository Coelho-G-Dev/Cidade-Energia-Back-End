import { describe, expect, it } from "vitest";
import { calcularPotencialHabitos, resumirPotencialHabitos } from "@/lib/calculos/impacto";

const simulacao = (estudante: string, economiaHabitosMensal: number, tarifa: number, criadoEm = "2026-11-20T12:00:00Z", simulacaoId = "b") =>
  ({ estudante, economiaHabitosMensal, tarifa, criadoEm, simulacaoId });

describe("potencial de hábitos (D-005/D-011)", () => {
  it("usa a última de cada estudante e divide cada valor pela sua própria tarifa", () => {
    const r = calcularPotencialHabitos([
      simulacao("a", 31.2, 0.8), simulacao("b", 10, 1), simulacao("c", 0, 0.5),
      simulacao("a", 1000, 2, "2026-11-19T12:00:00Z"),
    ]);
    // 31,2 + 10 + 0 = 41,2 reais; 31,2 / 0,8 + 10 / 1 = 49 kWh.
    expect(r.potencialHabitos).toEqual({ reaisMes: 41.2, kwhMes: 49, estudantes: 3 });
    expect(r.comoCalculamos.potencialHabitos).toContain("poderiam economizar por mês");
    expect(r.comoCalculamos.potencialHabitos).toContain("não é economia medida");
    expect(r.comoCalculamos.potencialHabitos).toContain("Somamos a economia com hábitos da última simulação");
    expect(r.comoCalculamos.potencialHabitos).not.toContain("economiaHabitosMensal");
    expect(r).not.toHaveProperty("missoesRegistradas");
  });
  it("independe da ordem e desempata pela identificação da simulação", () => {
    const itens = [simulacao("a", 10, 1, undefined, "a"), simulacao("a", 20, 2, undefined, "b")];
    expect(calcularPotencialHabitos(itens)).toEqual(calcularPotencialHabitos([...itens].reverse()));
    expect(calcularPotencialHabitos(itens).potencialHabitos).toEqual({ reaisMes: 20, kwhMes: 10, estudantes: 1 });
  });
  it("arredonda somente os totais, depois da soma", () => {
    const r = calcularPotencialHabitos([simulacao("a", 1, 3), simulacao("b", 1, 3), simulacao("c", 1, 3)]);
    expect(r.potencialHabitos.kwhMes).toBe(1);
  });
  it("preserva null do SQL e distingue de zero", () => {
    expect(resumirPotencialHabitos({ reaisMes: null, kwhMes: null, estudantes: null }).potencialHabitos)
      .toEqual({ reaisMes: null, kwhMes: null, estudantes: null });
    expect(calcularPotencialHabitos([]).potencialHabitos).toEqual({ reaisMes: 0, kwhMes: 0, estudantes: 0 });
  });
  it.each([0, -1, NaN, Infinity])("recusa tarifa inválida (%s) sem usar tarifa atual como substituta", (tarifa) => {
    expect(() => calcularPotencialHabitos([simulacao("a", 10, tarifa)])).toThrow(RangeError);
  });
});
