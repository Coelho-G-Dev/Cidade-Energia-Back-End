import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getLicao } from "@/app/api/licoes/[id]/route";
import { POST as postConcluir } from "@/app/api/licoes/[id]/concluir/route";
import { GET as getQuiz } from "@/app/api/licoes/[id]/quiz/route";
import { GET as getMapa } from "@/app/api/mapa/pontos/route";
import { POST as postRegistrar } from "@/app/api/missoes/[id]/registrar/route";
import { POST as postPedale } from "@/app/api/pedale/concluir/route";
import { GET as getResumo } from "@/app/api/perfil/resumo/route";
import { POST as postResponder } from "@/app/api/quiz/responder/route";
import { GET as getRankings } from "@/app/api/rankings/route";
import { GET as getTrilha } from "@/app/api/trilhas/[slug]/route";

const ID = "22222222-2222-4222-8222-222222222222";

const req = (caminho: string, metodo = "GET", body?: unknown) =>
  new NextRequest(`http://localhost:3000${caminho}`, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
});

describe("rotas do Dia 2 que exigem login", () => {
  it.each([
    ["POST /api/licoes/{id}/concluir", () => postConcluir(req(`/api/licoes/${ID}/concluir`, "POST"), params({ id: ID }))],
    ["POST /api/quiz/responder", () => postResponder(req("/api/quiz/responder", "POST", { perguntaId: ID, opcao: 0 }))],
    ["POST /api/pedale/concluir", () => postPedale(req("/api/pedale/concluir", "POST", { licaoId: ID }))],
    ["POST /api/missoes/{id}/registrar", () => postRegistrar(req(`/api/missoes/${ID}/registrar`, "POST"), params({ id: ID }))],
    ["GET /api/perfil/resumo", () => getResumo(req("/api/perfil/resumo"))],
  ])("%s sem sessão → 401", async (_nome, chamar) => {
    const r = await chamar();
    expect(r.status).toBe(401);
    expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
  });
});

describe("validação de entrada antes do banco", () => {
  it.each([
    ["GET /api/trilhas/{slug} com slug inválido", () => getTrilha(req("/api/trilhas/Solar!"), params({ slug: "Solar!" }))],
    ["GET /api/licoes/{id} com id inválido", () => getLicao(req("/api/licoes/abc"), params({ id: "abc" }))],
    ["GET /api/licoes/{id}/quiz com id inválido", () => getQuiz(req("/api/licoes/abc/quiz"), params({ id: "abc" }))],
    ["POST /api/licoes/{id}/concluir com id inválido", () => postConcluir(req("/api/licoes/abc/concluir", "POST"), params({ id: "abc" }))],
    ["POST /api/missoes/{id}/registrar com id inválido", () => postRegistrar(req("/api/missoes/1/registrar", "POST"), params({ id: "1" }))],
    ["GET /api/rankings sem tipo", () => getRankings(req("/api/rankings"))],
    ["GET /api/rankings com tipo desconhecido", () => getRankings(req("/api/rankings?tipo=alunos"))],
    ["GET /api/mapa/pontos com tipo desconhecido", () => getMapa(req("/api/mapa/pontos?tipo=praia"))],
  ])("%s → 400", async (_nome, chamar) => {
    const r = await chamar();
    expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });
});
