import { describe, expect, it } from "vitest";
import {
  ErroCalculo,
  PARAMETROS_PADRAO,
  arredondar,
  calcularPesos,
  consumoAparelhoKwhMes,
  economiaKwhPorRegras,
  geracaoDiariaPorPlaca,
  placasNecessarias,
  consumoCompensavel,
  retornoAnos,
  simular,
  type ItemAparelho,
} from "@/lib/calculos/simulador";

const P = {
  ...PARAMETROS_PADRAO,
  tarifaPadrao: 0.82,
  potenciaPlacaKwp: 0.55,
  custoPorKwp: 4000,
  fatorPerdas: 0.8,
  irradiacao: 5.4,
  fatorEmissao: 0.0385,
  percentualEconomiaPadrao: 0.1,
};

const item = (codigo: string, nome: string, potenciaW: number, horasDia: number, quantidade = 1): ItemAparelho => ({
  codigo,
  nome,
  potenciaW,
  horasDia,
  quantidade,
});

const casaTipica: ItemAparelho[] = [
  item("ar_condicionado", "Ar-condicionado", 1000, 8),
  item("chuveiro", "Chuveiro elétrico", 5500, 0.5),
  item("geladeira", "Geladeira", 60, 24),
  item("tv", "TV", 100, 5),
  item("lampada_led", "Lâmpada LED", 9, 6, 5),
  item("ventilador", "Ventilador", 60, 8),
];

describe("fórmulas", () => {
  it("consumo por aparelho = W × h × 30 × qtd ÷ 1000", () => {
    expect(consumoAparelhoKwhMes(1000, 8, 1)).toBe(240);
    expect(consumoAparelhoKwhMes(9, 6, 5)).toBeCloseTo(8.1, 10);
    expect(consumoAparelhoKwhMes(5500, 0.5, 2)).toBe(165);
  });

  it("geração por placa = irradiação × kWp × 0,8", () => {
    expect(geracaoDiariaPorPlaca(5.4, 0.55, 0.8)).toBeCloseTo(2.376, 10);
  });

  it("placas arredonda para cima, mas não por ruído de ponto flutuante", () => {
    expect(placasNecessarias(380, 2.376)).toBe(6);
    expect(placasNecessarias(71.28, 2.376)).toBe(1);
    expect(placasNecessarias(71.29, 2.376)).toBe(2);
    expect(placasNecessarias(712.8, 2.376)).toBe(10);
  });

  it("o mínimo faturável fica fora do que as placas compensam", () => {
    expect(consumoCompensavel(380, 50)).toBe(330);
    expect(consumoCompensavel(40, 50)).toBe(40);
    expect(consumoCompensavel(50, 50)).toBe(50);
  });

  it("retorno = custo ÷ (economia mensal × 12) e recusa economia zero", () => {
    expect(retornoAnos(12000, 500)).toBe(2);
    expect(() => retornoAnos(12000, 0)).toThrow(ErroCalculo);
  });

  it("economia por regras: 1 h de ar e 10 min de banho, nunca além do uso", () => {
    const kwh = economiaKwhPorRegras(casaTipica, P.regrasEconomia);
    expect(kwh).toBeCloseTo(30 + 27.5, 10);
    const banhoCurto = [item("chuveiro", "Chuveiro", 5500, 0.1)];
    expect(economiaKwhPorRegras(banhoCurto, P.regrasEconomia)).toBeCloseTo(consumoAparelhoKwhMes(5500, 0.1, 1), 10);
    expect(economiaKwhPorRegras([item("tv", "TV", 100, 5)], P.regrasEconomia)).toBe(0);
  });
});

describe("arredondar", () => {
  it("arredonda meio para cima sem erro de ponto flutuante", () => {
    expect(arredondar(1.005, 2)).toBe(1.01);
    expect(arredondar(2.675, 2)).toBe(2.68);
    expect(arredondar(3.5256, 1)).toBe(3.5);
    expect(arredondar(1e-7, 2)).toBe(0);
  });
});

describe("calcularPesos", () => {
  it("soma exatamente 100 e ordena do maior para o menor", () => {
    const pesos = calcularPesos([
      { aparelho: "A", kwh: 1 },
      { aparelho: "B", kwh: 1 },
      { aparelho: "C", kwh: 1 },
    ]);
    expect(pesos.reduce((s, p) => s + p.percentual * 10, 0)).toBe(1000);
    expect(pesos.map((p) => p.percentual).sort()).toEqual([33.3, 33.3, 33.4]);
  });

  it("retorna vazio sem consumo", () => {
    expect(calcularPesos([])).toEqual([]);
  });
});

describe("simular — modo conta", () => {
  it("caso de referência: 380 kWh e R$ 312,00", () => {
    expect(simular({ modo: "conta", consumoKwh: 380, valorConta: 312 }, P)).toEqual({
      consumoKwh: 380,
      gastoMensal: 312,
      economiaMensal: 31.2,
      placas: 5,
      retornoAnos: 3.4,
      co2EvitadoKgAno: 164.7,
      pesos: [],
    });
  });

  it("sem valor da conta usa a tarifa padrão", () => {
    const r = simular({ modo: "conta", consumoKwh: 200 }, P);
    expect(r.gastoMensal).toBe(164);
    expect(r.economiaMensal).toBe(16.4);
    expect(r.placas).toBe(3);
  });

  it("arredonda dinheiro em 2 casas e kWh em 1", () => {
    const r = simular({ modo: "conta", consumoKwh: 123.456, valorConta: 100.555 }, P);
    expect(r.consumoKwh).toBe(123.5);
    expect(r.gastoMensal).toBe(100.56);
    expect(r.economiaMensal).toBe(10.06);
  });

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY])("recusa consumo inválido (%s)", (consumoKwh) => {
    expect(() => simular({ modo: "conta", consumoKwh }, P)).toThrow(ErroCalculo);
  });

  it("recusa valor da conta zero ou negativo", () => {
    expect(() => simular({ modo: "conta", consumoKwh: 100, valorConta: 0 }, P)).toThrow(ErroCalculo);
    expect(() => simular({ modo: "conta", consumoKwh: 100, valorConta: -5 }, P)).toThrow(ErroCalculo);
  });
});

describe("simular — modo aparelhos", () => {
  const r = simular({ modo: "aparelhos", itens: casaTipica }, P);

  it("soma o consumo dos aparelhos e usa a tarifa padrão", () => {
    expect(r.consumoKwh).toBe(403.2);
    expect(r.gastoMensal).toBe(330.62);
  });

  it("economia vem das regras (57,5 kWh × 0,82)", () => {
    expect(r.economiaMensal).toBe(47.15);
  });

  it("pesos por aparelho somam 100% com maior resto", () => {
    expect(r.pesos).toEqual([
      { aparelho: "Ar-condicionado", percentual: 59.5 },
      { aparelho: "Chuveiro elétrico", percentual: 20.5 },
      { aparelho: "Geladeira", percentual: 10.7 },
      { aparelho: "TV", percentual: 3.7 },
      { aparelho: "Ventilador", percentual: 3.6 },
      { aparelho: "Lâmpada LED", percentual: 2 },
    ]);
  });

  it("dimensiona placas, retorno e CO₂", () => {
    expect(r.placas).toBe(5);
    expect(r.retornoAnos).toBe(3.2);
    expect(r.co2EvitadoKgAno).toBe(164.7);
  });

  it("recusa lista vazia", () => {
    expect(() => simular({ modo: "aparelhos", itens: [] }, P)).toThrow(ErroCalculo);
  });

  it.each([
    ["quantidade zero", { quantidade: 0 }],
    ["quantidade fracionada", { quantidade: 1.5 }],
    ["horas zero", { horasDia: 0 }],
    ["mais de 24 horas", { horasDia: 25 }],
    ["potência negativa", { potenciaW: -1 }],
  ])("recusa %s", (_nome, alteracao) => {
    const itens = [{ ...item("tv", "TV", 100, 5), ...alteracao }];
    expect(() => simular({ modo: "aparelhos", itens }, P)).toThrow(ErroCalculo);
  });
});
