import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheFresco, irradiacaoDeHoje, irradiacaoMediaAnual } from "@/lib/dados/irradiacao";
import type { Buscar } from "@/lib/nasa-power";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const AGORA = new Date("2026-10-16T15:00:00Z");
const HORA = 3_600_000;
const haHoras = (h: number) => new Date(AGORA.getTime() - h * HORA).toISOString();

type Linha = { data: string | null; valor: number | null; buscado_em: string };

function bancoComCache(inicial: Linha | null, { falhar = false } = {}) {
  let linha = inicial ? { ...inicial } : null;
  const { cliente, operacoes } = supabaseFalso((op: Operacao) => {
    if (falhar) return { error: { message: "banco fora do ar" } };
    const upsert = usou(op, "upsert");
    if (upsert) {
      if (linha) return { data: [] };
      const valores = upsert.args[0] as { buscado_em: string };
      linha = { data: null, valor: null, buscado_em: valores.buscado_em };
      return { data: [{ tipo: "diaria" }] };
    }
    const update = usou(op, "update");
    if (update) {
      const condicao = op.chamadas.find((c) => c.metodo === "eq" && c.args[0] === "buscado_em");
      if (!linha || (condicao && condicao.args[1] !== linha.buscado_em)) return { data: [] };
      linha = { ...linha, ...(update.args[0] as Partial<Linha>) };
      return { data: [{ tipo: "diaria" }] };
    }
    return { data: linha };
  });
  return { cliente, operacoes, linha: () => linha };
}

function nasaRespondendo(serie: Record<string, number>) {
  const buscar = vi.fn<Buscar>(async () =>
    Response.json({ properties: { parameter: { ALLSKY_SFC_SW_DWN: serie } } }),
  );
  return buscar;
}

const nasaFora = () =>
  vi.fn<Buscar>(async () => {
    throw new TypeError("fetch failed");
  });

let erroConsole: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  erroConsole = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  erroConsole.mockRestore();
});

describe("cacheFresco", () => {
  it("vale por menos de 6 horas", () => {
    expect(cacheFresco(haHoras(5.9), AGORA, 6)).toBe(true);
    expect(cacheFresco(haHoras(6), AGORA, 6)).toBe(false);
  });

  it("desconfia de data no futuro", () => {
    expect(cacheFresco(haHoras(-1), AGORA, 6)).toBe(false);
  });
});

describe("irradiacaoDeHoje", () => {
  it("usa o cache com menos de 6 horas sem chamar a NASA POWER", async () => {
    const banco = bancoComCache({ data: "2026-10-09", valor: 6.2194, buscado_em: haHoras(2) });
    const buscar = nasaRespondendo({ "20261010": 7 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.2194, fonte: "cache" });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("com cache vencido busca de novo e grava o último dia válido", async () => {
    const banco = bancoComCache({ data: "2026-10-08", valor: 6.8, buscado_em: haHoras(7) });
    const buscar = nasaRespondendo({ "20261009": 6.2194, "20261010": -999 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.2194, fonte: "nasa-power" });
    expect(banco.linha()).toEqual({ data: "2026-10-09", valor: 6.2194, buscado_em: AGORA.toISOString() });
  });

  it("sem cache cria a linha e busca", async () => {
    const banco = bancoComCache(null);
    const buscar = nasaRespondendo({ "20261009": 6.2 });

    expect(await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: "2026-10-09",
      valor: 6.2,
      fonte: "nasa-power",
    });
    expect(banco.linha()?.valor).toBe(6.2);
  });

  it("com falha de rede usa o cache antigo e marca a tentativa", async () => {
    const banco = bancoComCache({ data: "2026-10-08", valor: 6.8, buscado_em: haHoras(30) });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });

    expect(r).toEqual({ data: "2026-10-08", valor: 6.8, fonte: "cache" });
    expect(banco.linha()?.buscado_em).toBe(AGORA.toISOString());
  });

  it("depois de uma falha não tenta de novo antes de 6 horas", async () => {
    const banco = bancoComCache({ data: "2026-10-08", valor: 6.8, buscado_em: haHoras(30) });
    await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });

    const buscar = nasaRespondendo({ "20261009": 6.2 });
    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: new Date(AGORA.getTime() + HORA) });

    expect(r.fonte).toBe("cache");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("quando todos os dias vêm com -999 e não há cache, usa o valor do config", async () => {
    const banco = bancoComCache(null);
    const buscar = nasaRespondendo({ "20261010": -999, "20261011": -999 });

    expect(await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: null,
      valor: 5.226,
      fonte: "config",
    });
  });

  it("com falha de rede e sem cache, usa o valor do config", async () => {
    const banco = bancoComCache(null);
    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });
    expect(r).toEqual({ data: null, valor: 5.226, fonte: "config" });
  });

  it("se outra requisição já reservou a busca, não chama a NASA POWER", async () => {
    const buscar = vi.fn<Buscar>();
    const { cliente } = supabaseFalso((op) => {
      if (usou(op, "update")) return { data: [] };
      return { data: { data: "2026-10-08", valor: 6.8, buscado_em: haHoras(7) } };
    });

    const r = await irradiacaoDeHoje({ supabase: cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-08", valor: 6.8, fonte: "cache" });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("com o banco fora do ar, usa o valor do config sem chamar a NASA POWER", async () => {
    const banco = bancoComCache(null, { falhar: true });
    const buscar = nasaRespondendo({ "20261009": 6.2 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r.fonte).toBe("config");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("se gravar o cache falhar, ainda devolve o valor da NASA POWER", async () => {
    const { cliente } = supabaseFalso((op) => {
      if (usou(op, "update") && !op.chamadas.some((c) => c.metodo === "select")) return { error: { message: "falhou" } };
      if (usou(op, "update")) return { data: [{ tipo: "diaria" }] };
      return { data: { data: "2026-10-08", valor: 6.8, buscado_em: haHoras(7) } };
    });

    const r = await irradiacaoDeHoje({ supabase: cliente, buscar: nasaRespondendo({ "20261009": 6.2 }), agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.2, fonte: "nasa-power" });
  });
});

describe("irradiacaoMediaAnual", () => {
  it("busca a climatologia e devolve a média anual", async () => {
    const banco = bancoComCache(null);
    const buscar = vi.fn<Buscar>(async () =>
      Response.json({ properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: 5.226 } } } }),
    );

    expect(await irradiacaoMediaAnual({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: null,
      valor: 5.226,
      fonte: "nasa-power",
    });
  });

  it("guarda a climatologia por 30 dias", async () => {
    const banco = bancoComCache({ data: null, valor: 5.3, buscado_em: haHoras(24 * 29) });
    const buscar = vi.fn<Buscar>();

    expect(await irradiacaoMediaAnual({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: null,
      valor: 5.3,
      fonte: "cache",
    });
    expect(buscar).not.toHaveBeenCalled();
  });
});
