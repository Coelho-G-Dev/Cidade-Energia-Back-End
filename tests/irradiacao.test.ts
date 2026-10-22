import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheFresco, irradiacaoDeHoje, irradiacaoMediaAnual } from "@/lib/dados/irradiacao";
import type { Buscar } from "@/lib/nasa-power";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const AGORA = new Date("2026-10-16T15:00:00Z");
const HORA = 3_600_000;
const haHoras = (h: number) => new Date(AGORA.getTime() - h * HORA).toISOString();

type Linha = { data: string | null; valor: number | null; buscado_em: string; atualizado_em: string | null };

function bancoComCache(inicial: Linha | null, { falhar = false } = {}) {
  let linha = inicial ? { ...inicial } : null;
  const { cliente, operacoes } = supabaseFalso((op: Operacao) => {
    if (falhar) return { error: { message: "banco fora do ar" } };
    const upsert = usou(op, "upsert");
    if (upsert) {
      if (linha) return { data: [] };
      const valores = upsert.args[0] as { buscado_em: string };
      linha = { data: null, valor: null, buscado_em: valores.buscado_em, atualizado_em: null };
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

const cacheDe = (data: string | null, valor: number, horas: number, horasSucesso = horas): Linha => ({
  data,
  valor,
  buscado_em: haHoras(horas),
  atualizado_em: haHoras(horasSucesso),
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
    const banco = bancoComCache(cacheDe("2026-10-09", 6.2194, 2));
    const buscar = nasaRespondendo({ "20261010": 7 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.2194, fonte: "cache", atualizadoEm: haHoras(2) });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("com dado recente na NASA POWER, renova o cache vencido e grava a hora do sucesso", async () => {
    const banco = bancoComCache(cacheDe("2026-10-08", 6.8, 7));
    const buscar = nasaRespondendo({ "20261015": 6.2194, "20261016": -999 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-15", valor: 6.2194, fonte: "nasa", atualizadoEm: AGORA.toISOString() });
    expect(banco.linha()).toEqual({
      data: "2026-10-15",
      valor: 6.2194,
      buscado_em: AGORA.toISOString(),
      atualizado_em: AGORA.toISOString(),
    });
  });

  it("com só dados antigos na NASA POWER, usa o último dia válido", async () => {
    const banco = bancoComCache(cacheDe("2026-10-07", 6.8, 7));
    const buscar = nasaRespondendo({ "20261009": 6.5, "20261010": -999, "20261011": -999, "20261016": -999 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.5, fonte: "nasa", atualizadoEm: AGORA.toISOString() });
  });

  it("não troca o cache por um dia mais antigo que o guardado", async () => {
    const banco = bancoComCache(cacheDe("2026-10-12", 6.8, 7));
    const buscar = nasaRespondendo({ "20261010": 5.9, "20261011": -999, "20261012": -999 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-12", valor: 6.8, fonte: "cache", atualizadoEm: haHoras(7) });
    expect(banco.linha()).toMatchObject({ data: "2026-10-12", valor: 6.8, buscado_em: AGORA.toISOString() });
  });

  it("sem cache cria a linha e busca", async () => {
    const banco = bancoComCache(null);
    const buscar = nasaRespondendo({ "20261009": 6.2 });

    expect(await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: "2026-10-09",
      valor: 6.2,
      fonte: "nasa",
      atualizadoEm: AGORA.toISOString(),
    });
    expect(banco.linha()?.valor).toBe(6.2);
  });

  it("com falha de rede usa o cache antigo, marca a tentativa e mantém a hora do último sucesso", async () => {
    const banco = bancoComCache(cacheDe("2026-10-08", 6.8, 30));

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });

    expect(r).toEqual({ data: "2026-10-08", valor: 6.8, fonte: "cache", atualizadoEm: haHoras(30) });
    expect(banco.linha()).toMatchObject({ buscado_em: AGORA.toISOString(), atualizado_em: haHoras(30) });
  });

  it("depois de uma falha não tenta de novo antes de 6 horas", async () => {
    const banco = bancoComCache(cacheDe("2026-10-08", 6.8, 30));
    await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });

    const buscar = nasaRespondendo({ "20261009": 6.2 });
    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: new Date(AGORA.getTime() + HORA) });

    expect(r.fonte).toBe("cache");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("6 horas depois da falha, tenta de novo", async () => {
    const banco = bancoComCache(cacheDe("2026-10-08", 6.8, 30));
    await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });

    const depois = new Date(AGORA.getTime() + 6 * HORA);
    const r = await irradiacaoDeHoje({
      supabase: banco.cliente,
      buscar: nasaRespondendo({ "20261016": 6.1 }),
      agora: depois,
    });

    expect(r).toEqual({ data: "2026-10-16", valor: 6.1, fonte: "nasa", atualizadoEm: depois.toISOString() });
  });

  it("quando todos os dias vêm com -999, mantém o último dia válido do cache", async () => {
    const banco = bancoComCache(cacheDe("2026-10-05", 6.3, 7, 50));
    const buscar = nasaRespondendo({ "20261015": -999, "20261016": -999 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-05", valor: 6.3, fonte: "cache", atualizadoEm: haHoras(50) });
  });

  it("quando todos os dias vêm com -999 e não há cache, usa o valor padrão", async () => {
    const banco = bancoComCache(null);
    const buscar = nasaRespondendo({ "20261010": -999, "20261011": -999 });

    expect(await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: null,
      valor: 5.226,
      fonte: "padrao",
      atualizadoEm: null,
    });
  });

  it("com falha de rede e sem cache, usa o valor padrão", async () => {
    const banco = bancoComCache(null);
    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar: nasaFora(), agora: AGORA });
    expect(r).toEqual({ data: null, valor: 5.226, fonte: "padrao", atualizadoEm: null });
  });

  it("se outra requisição já reservou a busca, não chama a NASA POWER", async () => {
    const buscar = vi.fn<Buscar>();
    const { cliente } = supabaseFalso((op) => {
      if (usou(op, "update")) return { data: [] };
      return { data: cacheDe("2026-10-08", 6.8, 7) };
    });

    const r = await irradiacaoDeHoje({ supabase: cliente, buscar, agora: AGORA });

    expect(r).toEqual({ data: "2026-10-08", valor: 6.8, fonte: "cache", atualizadoEm: haHoras(7) });
    expect(buscar).not.toHaveBeenCalled();
  });

  it("com o banco fora do ar, usa o valor padrão sem chamar a NASA POWER", async () => {
    const banco = bancoComCache(null, { falhar: true });
    const buscar = nasaRespondendo({ "20261009": 6.2 });

    const r = await irradiacaoDeHoje({ supabase: banco.cliente, buscar, agora: AGORA });

    expect(r.fonte).toBe("padrao");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("se gravar o cache falhar, ainda devolve o valor da NASA POWER", async () => {
    const { cliente } = supabaseFalso((op) => {
      if (usou(op, "update") && !op.chamadas.some((c) => c.metodo === "select")) return { error: { message: "falhou" } };
      if (usou(op, "update")) return { data: [{ tipo: "diaria" }] };
      return { data: cacheDe("2026-10-08", 6.8, 7) };
    });

    const r = await irradiacaoDeHoje({ supabase: cliente, buscar: nasaRespondendo({ "20261009": 6.2 }), agora: AGORA });

    expect(r).toEqual({ data: "2026-10-09", valor: 6.2, fonte: "nasa", atualizadoEm: AGORA.toISOString() });
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
      fonte: "nasa",
      atualizadoEm: AGORA.toISOString(),
    });
  });

  it("guarda a climatologia por 30 dias", async () => {
    const banco = bancoComCache(cacheDe(null, 5.3, 24 * 29));
    const buscar = vi.fn<Buscar>();

    expect(await irradiacaoMediaAnual({ supabase: banco.cliente, buscar, agora: AGORA })).toEqual({
      data: null,
      valor: 5.3,
      fonte: "cache",
      atualizadoEm: haHoras(24 * 29),
    });
    expect(buscar).not.toHaveBeenCalled();
  });
});
