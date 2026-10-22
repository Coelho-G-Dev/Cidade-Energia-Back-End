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

  it("retorno = custo ÷ (economia mensal × 12) e recusa economia zero", () => {
    expect(retornoAnos(12000, 500)).toBe(2);
    expect(() => retornoAnos(12000, 0)).toThrow(ErroCalculo);
  });

  it("economia por regras: 1 h de ar, TV, lâmpada e ventilador, 10 min de banho e 10% da geladeira", () => {
    const kwh = economiaKwhPorRegras(casaTipica, P.regrasEconomia);
    expect(kwh).toBeCloseTo(30 + 27.5 + 4.32 + 3 + 1.35 + 1.8, 10);
  });

  it("economia por regras nunca vai além do uso", () => {
    const banhoCurto = [item("chuveiro", "Chuveiro", 5500, 0.1)];
    expect(economiaKwhPorRegras(banhoCurto, P.regrasEconomia)).toBeCloseTo(consumoAparelhoKwhMes(5500, 0.1, 1), 10);
    const tvPouca = [item("tv", "TV", 100, 0.5)];
    expect(economiaKwhPorRegras(tvPouca, P.regrasEconomia)).toBeCloseTo(consumoAparelhoKwhMes(100, 0.5, 1), 10);
  });

  it("economia por regras conta a quantidade e ignora aparelho sem regra", () => {
    expect(economiaKwhPorRegras([item("lampada_led", "Lâmpada LED", 9, 6, 5)], P.regrasEconomia)).toBeCloseTo(1.35, 10);
    expect(economiaKwhPorRegras([item("geladeira", "Geladeira", 60, 24, 2)], P.regrasEconomia)).toBeCloseTo(8.64, 10);
    expect(economiaKwhPorRegras([item("micro_ondas", "Micro-ondas", 1200, 0.2)], P.regrasEconomia)).toBe(0);
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
      economiaHabitosMensal: 31.2,
      economiaSolarMensal: 312,
      kwhGeradoMes: 427.7,
      custoSistemaSolar: 13200,
      retornoSolarAnos: 3.5,
      placas: 6,
      co2EvitadoKgAno: 197.6,
      pesos: [],
      comoCalculamos: {
        economiaHabitos: "Meta de 10% da conta com mudança de hábitos, sem investimento: R$ 312,00 × 10%.",
        economiaSolar:
          "Cada placa de 550 W gera cerca de 71,3 kWh por mês com o sol de São Luís (5,4 kWh/m² por dia × 0,55 kWp × 0,8 × 30 dias)." +
          " 6 placas geram 427,7 kWh. A economia é a energia gerada, até o seu consumo de 380 kWh, × R$ 0,8211 por kWh." +
          " A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
        custoSistemaSolar: "6 × 0,55 kWp × R$ 4.000,00 por kWp instalado = R$ 13.200,00 (preço médio de mercado, estimativa).",
        retornoSolar:
          "R$ 13.200,00 ÷ (R$ 312,00 × 12 meses) = 3,5 anos. Usa a economia com energia solar, não a de hábitos.",
      },
    });
  });

  it("separa a economia de hábitos da economia solar, e o retorno usa só a solar", () => {
    const r = simular({ modo: "conta", consumoKwh: 380, valorConta: 312 }, P);
    expect(r.economiaHabitosMensal).not.toBe(r.economiaSolarMensal);
    expect(r.retornoSolarAnos).toBe(arredondar(r.custoSistemaSolar / (r.economiaSolarMensal * 12), 1));
    expect(r.retornoSolarAnos).not.toBe(arredondar(r.custoSistemaSolar / (r.economiaHabitosMensal * 12), 1));
  });

  it("custo do sistema = placas × kWp × custo por kWp", () => {
    const r = simular({ modo: "conta", consumoKwh: 200 }, P);
    expect(r.custoSistemaSolar).toBe(arredondar(r.placas * 0.55 * 4000, 2));
  });

  it("economia solar fica limitada ao consumo da casa", () => {
    const r = simular({ modo: "conta", consumoKwh: 100 }, P);
    expect(r.kwhGeradoMes).toBeGreaterThan(100);
    expect(r.economiaSolarMensal).toBe(82);
  });

  it("sem valor da conta usa a tarifa padrão", () => {
    const r = simular({ modo: "conta", consumoKwh: 200 }, P);
    expect(r.gastoMensal).toBe(164);
    expect(r.economiaHabitosMensal).toBe(16.4);
    expect(r.placas).toBe(3);
  });

  it("arredonda dinheiro em 2 casas e kWh em 1", () => {
    const r = simular({ modo: "conta", consumoKwh: 123.456, valorConta: 100.555 }, P);
    expect(r.consumoKwh).toBe(123.5);
    expect(r.gastoMensal).toBe(100.56);
    expect(r.economiaHabitosMensal).toBe(10.06);
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

  it("economia de hábitos vem das regras (67,97 kWh × 0,82)", () => {
    expect(r.economiaHabitosMensal).toBe(55.74);
    expect(r.comoCalculamos.economiaHabitos).toBe(
      "Mudança de hábitos, sem investimento: usar o ar-condicionado 1 hora a menos por dia, tomar banhos 10 minutos mais curtos por dia," +
        " abrir a geladeira só quando precisar, sem guardar comida quente, desligar a TV quando ninguém estiver assistindo," +
        " apagar as luzes de cômodos vazios e desligar o ventilador ao sair do cômodo. São 68 kWh a menos por mês × R$ 0,82 por kWh.",
    );
  });

  it("duas dicas ficam ligadas por \"e\"", () => {
    const s = simular({ modo: "aparelhos", itens: [item("tv", "TV", 100, 5), item("ventilador", "Ventilador", 60, 8)] }, P);
    expect(s.economiaHabitosMensal).toBe(3.94);
    expect(s.comoCalculamos.economiaHabitos).toBe(
      "Mudança de hábitos, sem investimento: desligar a TV quando ninguém estiver assistindo e desligar o ventilador ao sair do cômodo." +
        " São 4,8 kWh a menos por mês × R$ 0,82 por kWh.",
    );
  });

  it("sem aparelho com dica, a economia de hábitos é zero e o texto explica", () => {
    const s = simular({ modo: "aparelhos", itens: [item("micro_ondas", "Micro-ondas", 1200, 0.2)] }, P);
    expect(s.economiaHabitosMensal).toBe(0);
    expect(s.comoCalculamos.economiaHabitos).toBe(
      "Nenhum aparelho da lista tem uma dica de hábito no simulador, então esta economia fica em zero.",
    );
    expect(s.comoCalculamos.economiaSolar).not.toContain("placas geram");
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

  it("dimensiona placas, custo, economia solar, retorno e CO₂", () => {
    expect(r.placas).toBe(6);
    expect(r.kwhGeradoMes).toBe(427.7);
    expect(r.custoSistemaSolar).toBe(13200);
    expect(r.economiaSolarMensal).toBe(330.62);
    expect(r.retornoSolarAnos).toBe(3.3);
    expect(r.co2EvitadoKgAno).toBe(197.6);
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
