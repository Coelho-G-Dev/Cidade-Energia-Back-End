import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getEscolas } from "@/app/api/escolas/route";
import { GET as getPerfil, PUT as putPerfil } from "@/app/api/perfil/route";
import { POST as postSimulacao } from "@/app/api/simulacoes/route";
import { GET as getUltima } from "@/app/api/simulacoes/ultima/route";

vi.mock("@/lib/dados/irradiacao", () => ({
  irradiacaoMediaAnual: async () => ({ data: null, valor: 5.226, fonte: "cache" }),
}));

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

describe("POST /api/simulacoes", () => {
  it("modo conta sem login calcula o caso de referência e não salva", async () => {
    const r = await postSimulacao(
      requisicao("/api/simulacoes", { metodo: "POST", body: { modo: "conta", consumoKwh: 380, valorConta: 312 } }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      consumoKwh: 380,
      gastoMensal: 312,
      economiaMensal: 31.2,
      placas: 6,
      retornoAnos: 2.5,
      co2EvitadoKgAno: 191.2,
      pesos: [],
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
