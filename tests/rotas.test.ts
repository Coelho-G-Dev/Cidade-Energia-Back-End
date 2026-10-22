import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroApi } from "@/lib/http/erros";
import { NextRequest } from "next/server";
import { GET as getEscolas } from "@/app/api/escolas/route";
import { GET as getPerfil, PUT as putPerfil } from "@/app/api/perfil/route";
import { POST as postPrevia } from "@/app/api/simulacoes/previa/route";
import { POST as postSimulacao } from "@/app/api/simulacoes/route";
import { GET as getUltima } from "@/app/api/simulacoes/ultima/route";

vi.mock("@/lib/dados/irradiacao", () => ({
  irradiacaoMediaAnual: async () => ({ data: null, valor: 5.226, fonte: "cache" }),
}));

const limitar = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/dados/limites", () => ({ limitarSimulacao: limitar, limitarAcoes: limitar }));

const URL_BASE = "http://localhost:3000";

function requisicao(caminho: string, { metodo = "GET", body, token }: { metodo?: string; body?: unknown; token?: string } = {}) {
  return new NextRequest(`${URL_BASE}${caminho}`, {
    method: metodo,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
});

beforeEach(() => {
  limitar.mockReset();
  limitar.mockImplementation(async () => {});
});

describe("POST /api/simulacoes", () => {
  it("modo conta sem login calcula o caso de referência e não salva", async () => {
    const r = await postSimulacao(
      requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 380, valorConta: 312 } }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      consumoKwh: 380,
      gastoMensal: 312,
      economiaHabitosMensal: 31.2,
      economiaSolarMensal: 312,
      kwhGeradoMes: 413.9,
      custoSistemaSolar: 9372,
      retornoSolarAnos: 2.5,
      placas: 6,
      co2EvitadoKgAno: 191.2,
      pesos: [],
      comoCalculamos: {
        economiaHabitos: expect.stringContaining("10% da conta"),
        economiaSolar: expect.stringContaining("5,23 kWh/m²"),
        custoSistemaSolar: expect.stringContaining("R$ 9.372,00"),
        retornoSolar: expect.stringContaining("2,5 anos"),
      },
      simulacaoId: null,
      pontosGanhos: 0,
      conquistasNovas: [],
    });
  });

  it("responde 400 ENTRADA_INVALIDA para body inválido", async () => {
    const r = await postSimulacao(requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 0 } }));
    const corpo = await r.json();
    expect(r.status).toBe(400);
    expect(corpo.erro.codigo).toBe("ENTRADA_INVALIDA");
    expect(corpo.erro.mensagem).toContain("consumoKwh");
  });

  it("responde 400 JSON_INVALIDO para JSON malformado", async () => {
    const r = await postSimulacao(requisicao("/api/simulacoes", { metodo: "POST", body: "{" }));
    expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("JSON_INVALIDO");
  });

  it("recusa pontos enviados pelo cliente", async () => {
    const r = await postSimulacao(
      requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 100, pontos: 50 } }),
    );
    expect(r.status).toBe(400);
  });

  it("sem login passa pelo limite das rotas públicas", async () => {
    await postSimulacao(requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 150 } }));
    expect(limitar).toHaveBeenCalledTimes(1);
    expect(limitar.mock.calls[0]).toHaveLength(2);
    expect((limitar.mock.calls[0] as unknown[])[1]).toBeNull();
  });

  it("acima do limite responde 429 LIMITE_DE_REQUISICOES", async () => {
    limitar.mockRejectedValue(new ErroApi(429, "LIMITE_DE_REQUISICOES", "Espere."));
    const r = await postSimulacao(requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 150 } }));
    expect(r.status).toBe(429);
    expect((await r.json()).erro.codigo).toBe("LIMITE_DE_REQUISICOES");
  });
});

describe("POST /api/simulacoes/previa", () => {
  it("calcula como a simulação sem login e nunca salva, mesmo com token", async () => {
    const corpo = { modo: "conta", consumoKwh: 380, valorConta: 312 };
    const previa = await postPrevia(requisicao("/api/simulacoes/previa", { metodo: "POST", body: corpo, token: "abc.def.ghi" }));
    const anonima = await postSimulacao(requisicao("/api/simulacoes", { metodo: "POST", body: corpo }));
    expect(previa.status).toBe(200);
    const resultado = await previa.json();
    expect(resultado).toEqual(await anonima.json());
    expect(resultado).toMatchObject({ simulacaoId: null, pontosGanhos: 0, conquistasNovas: [] });
    expect((limitar.mock.calls[0] as unknown[])[1]).toBeNull();
  });

  it("valida o corpo antes de consumir o limite", async () => {
    const r = await postPrevia(requisicao("/api/simulacoes/previa", { metodo: "POST", body: { modo: "conta", consumoKwh: -1 } }));
    expect(r.status).toBe(400);
    expect(limitar).not.toHaveBeenCalled();
  });

  it("acima do limite responde 429", async () => {
    limitar.mockRejectedValue(new ErroApi(429, "LIMITE_DE_REQUISICOES", "Espere."));
    const r = await postPrevia(requisicao("/api/simulacoes/previa", { metodo: "POST", body: { modo: "conta", consumoKwh: 150 } }));
    expect(r.status).toBe(429);
  });
});

describe("rotas que exigem login", () => {
  it.each([
    ["GET /api/perfil", () => getPerfil(requisicao("/api/perfil"))],
    ["GET /api/simulacoes/ultima", () => getUltima(requisicao("/api/simulacoes/ultima"))],
    [
      "PUT /api/perfil",
      () => putPerfil(requisicao("/api/perfil", { metodo: "PUT", body: { primeiro_nome: "Ana" } })),
    ],
    ["GET /api/perfil com token malformado", () => getPerfil(requisicao("/api/perfil", { token: "abc.def.ghi" }))],
  ])("%s sem sessão válida → 401", async (_nome, chamar) => {
    const r = await chamar();
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({
      erro: { codigo: "NAO_AUTENTICADO", mensagem: "Faça login para acessar este recurso." },
    });
  });
});

describe("GET /api/escolas", () => {
  it("valida o filtro de bairro antes de consultar o banco", async () => {
    const r = await getEscolas(requisicao("/api/escolas?bairro=anil"));
    expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });
});
