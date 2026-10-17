import { describe, expect, it } from "vitest";
import {
  buscarIrradiacaoDiaria,
  buscarMediaClimatologica,
  ErroNasaPower,
  periodoDeBusca,
  ultimoDiaValido,
  type Buscar,
} from "@/lib/nasa-power";

const AGORA = new Date("2026-10-16T15:00:00Z");

function respostaDiaria(serie: Record<string, number>) {
  return {
    type: "Feature",
    properties: { parameter: { ALLSKY_SFC_SW_DWN: serie } },
    header: { fill_value: -999.0, time_standard: "LST" },
  };
}

function buscarJson(corpo: unknown, status = 200): { buscar: Buscar; urls: string[] } {
  const urls: string[] = [];
  const buscar: Buscar = async (url) => {
    urls.push(url);
    return new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
  };
  return { buscar, urls };
}

describe("ultimoDiaValido", () => {
  it("pula os dias com -999 e devolve o mais recente com dado", () => {
    expect(
      ultimoDiaValido({ "20261008": 6.8585, "20261009": 6.2194, "20261010": -999, "20261011": -999 }),
    ).toEqual({ data: "2026-10-09", valor: 6.2194 });
  });

  it("não depende da ordem das chaves", () => {
    expect(ultimoDiaValido({ "20261009": 5, "20261007": 4, "20261008": 6 })).toEqual({ data: "2026-10-09", valor: 5 });
  });

  it("ignora valores fora da faixa física", () => {
    expect(ultimoDiaValido({ "20261008": 6, "20261009": 99, "20261010": -1 })).toEqual({ data: "2026-10-08", valor: 6 });
  });

  it("devolve null quando todos os dias são -999", () => {
    expect(ultimoDiaValido({ "20261010": -999, "20261011": -999 })).toBeNull();
  });
});

describe("periodoDeBusca", () => {
  it("cobre os últimos 10 dias, terminando hoje em São Luís", () => {
    expect(periodoDeBusca(AGORA)).toEqual({ inicio: "20261007", fim: "20261016" });
  });

  it("usa o dia de São Luís perto da meia-noite UTC", () => {
    expect(periodoDeBusca(new Date("2026-10-17T01:30:00Z")).fim).toBe("20261016");
  });
});

describe("buscarIrradiacaoDiaria", () => {
  it("monta a URL do endpoint diário por ponto e devolve o último dia válido", async () => {
    const { buscar, urls } = buscarJson(respostaDiaria({ "20261009": 6.2194, "20261010": -999 }));
    expect(await buscarIrradiacaoDiaria(AGORA, buscar)).toEqual({ data: "2026-10-09", valor: 6.2194 });

    const url = new URL(urls[0] ?? "");
    expect(url.origin + url.pathname).toBe("https://power.larc.nasa.gov/api/temporal/daily/point");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      parameters: "ALLSKY_SFC_SW_DWN",
      community: "RE",
      longitude: "-44.3",
      latitude: "-2.53",
      format: "JSON",
      start: "20261007",
      end: "20261016",
    });
  });

  it("falha quando todos os dias vêm com -999", async () => {
    const { buscar } = buscarJson(respostaDiaria({ "20261010": -999, "20261011": -999 }));
    await expect(buscarIrradiacaoDiaria(AGORA, buscar)).rejects.toThrow(ErroNasaPower);
  });

  it("falha com erro de rede", async () => {
    const buscar: Buscar = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(buscarIrradiacaoDiaria(AGORA, buscar)).rejects.toThrow("Falha de rede");
  });

  it("falha com status HTTP de erro", async () => {
    const { buscar } = buscarJson({ messages: ["erro"] }, 503);
    await expect(buscarIrradiacaoDiaria(AGORA, buscar)).rejects.toThrow("503");
  });

  it("falha com formato inesperado", async () => {
    const { buscar } = buscarJson({ properties: {} });
    await expect(buscarIrradiacaoDiaria(AGORA, buscar)).rejects.toThrow("Formato inesperado");
  });

  it("falha com JSON inválido", async () => {
    const buscar: Buscar = async () => new Response("<html>", { status: 200 });
    await expect(buscarIrradiacaoDiaria(AGORA, buscar)).rejects.toThrow("JSON inválido");
  });
});

describe("buscarMediaClimatologica", () => {
  it("lê a média anual (ANN) do endpoint de climatologia", async () => {
    const { buscar, urls } = buscarJson({
      properties: { parameter: { ALLSKY_SFC_SW_DWN: { JAN: 4.9061, OCT: 5.9662, ANN: 5.226 } } },
    });
    expect(await buscarMediaClimatologica(buscar)).toBe(5.226);
    expect(urls[0]).toContain("/api/temporal/climatology/point?");
    expect(urls[0]).not.toContain("start=");
  });

  it("recusa média -999", async () => {
    const { buscar } = buscarJson({ properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: -999 } } } });
    await expect(buscarMediaClimatologica(buscar)).rejects.toThrow(ErroNasaPower);
  });
});
