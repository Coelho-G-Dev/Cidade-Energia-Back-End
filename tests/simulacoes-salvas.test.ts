import { describe, expect, it } from "vitest";
import { simular } from "@/lib/calculos/simulador";
import { normalizarResultado } from "@/lib/dados/simulacoes";

const antiga = {
  consumoKwh: 380,
  gastoMensal: 312,
  economiaMensal: 31.2,
  placas: 6,
  retornoAnos: 2.5,
  co2EvitadoKgAno: 191.2,
  pesos: [],
};

describe("normalizarResultado", () => {
  it("simulação antiga: hábitos e retorno saem dos campos antigos, o resto vem null", () => {
    expect(normalizarResultado(antiga)).toEqual({
      ...antiga,
      economiaHabitosMensal: 31.2,
      economiaSolarMensal: null,
      kwhGeradoMes: null,
      custoSistemaSolar: null,
      retornoSolarAnos: 2.5,
      comoCalculamos: null,
    });
  });

  it("simulação nova passa sem mudança", () => {
    const nova = simular({ modo: "conta", consumoKwh: 380, valorConta: 312 });
    expect(normalizarResultado(JSON.parse(JSON.stringify(nova)))).toEqual(nova);
  });

  it("valores adulterados viram null em vez de quebrar a resposta", () => {
    const r = normalizarResultado({ ...antiga, economiaSolarMensal: "muito", comoCalculamos: { economiaHabitos: 1 } });
    expect(r.economiaSolarMensal).toBeNull();
    expect(r.comoCalculamos).toBeNull();
  });

  it("resultado vazio ou inválido não quebra", () => {
    expect(normalizarResultado(null)).toMatchObject({ economiaHabitosMensal: null, retornoSolarAnos: null, comoCalculamos: null });
  });
});
