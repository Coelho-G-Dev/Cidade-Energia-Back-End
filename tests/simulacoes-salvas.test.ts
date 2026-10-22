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
      consumoKwh: 380,
      gastoMensal: 312,
      placas: 6,
      co2EvitadoKgAno: 191.2,
      pesos: [],
      economiaHabitosMensal: 31.2,
      economiaSolarMensal: null,
      kwhGeradoMes: null,
      custoSistemaSolar: null,
      retornoSolarAnos: 2.5,
      comoCalculamos: null,
    });
  });

  it("os campos antigos não voltam na resposta", () => {
    const r = normalizarResultado({ ...antiga, economiaHabitosMensal: 40, retornoSolarAnos: 3 });
    expect(r).not.toHaveProperty("economiaMensal");
    expect(r).not.toHaveProperty("retornoAnos");
    expect(r.economiaHabitosMensal).toBe(40);
    expect(r.retornoSolarAnos).toBe(3);
  });

  it("simulação antiga com só economiaMensal ainda preenche a economia de hábitos", () => {
    const r = normalizarResultado({ consumoKwh: 200, economiaMensal: 16.4 });
    expect(r.economiaHabitosMensal).toBe(16.4);
    expect(r.retornoSolarAnos).toBeNull();
    expect(r).not.toHaveProperty("economiaMensal");
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
