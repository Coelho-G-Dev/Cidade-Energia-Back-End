import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { lerOrigens, origemPermitida, origensConfiguradas } from "@/lib/http/cors";
import { proxy } from "@/proxy";

describe("lerOrigens", () => {
  it("separa por vírgula, tira espaços e a barra final", () => {
    expect(lerOrigens(" http://localhost:5173 , https://app.vercel.app/ ,")).toEqual([
      "http://localhost:5173",
      "https://app.vercel.app",
    ]);
  });

  it("sem valor usa a origem padrão de desenvolvimento", () => {
    expect(origensConfiguradas(undefined)).toEqual(["http://localhost:5173"]);
    expect(origensConfiguradas(" , ")).toEqual(["http://localhost:5173"]);
  });
});

describe("origemPermitida", () => {
  const lista = ["http://localhost:5173", "https://cidade-energia.vercel.app", "https://cidade-energia-*-equipe.vercel.app"];

  it("aceita as origens exatas da lista", () => {
    expect(origemPermitida("http://localhost:5173", lista)).toBe(true);
    expect(origemPermitida("https://cidade-energia.vercel.app", lista)).toBe(true);
  });

  it("aceita os previews da Vercel pelo padrão com *", () => {
    expect(origemPermitida("https://cidade-energia-abc123-equipe.vercel.app", lista)).toBe(true);
  });

  it("o * não atravessa pontos nem aceita outra equipe ou domínio", () => {
    expect(origemPermitida("https://cidade-energia-x.evil.com-equipe.vercel.app", lista)).toBe(false);
    expect(origemPermitida("https://cidade-energia-abc-outra.vercel.app", lista)).toBe(false);
    expect(origemPermitida("https://cidade-energia.vercel.app.evil.com", lista)).toBe(false);
  });

  it("recusa origem ausente, outra porta ou outro protocolo", () => {
    expect(origemPermitida(null, lista)).toBe(false);
    expect(origemPermitida("http://localhost:3001", lista)).toBe(false);
    expect(origemPermitida("http://cidade-energia.vercel.app", lista)).toBe(false);
  });
});

describe("proxy (CORS das rotas /api)", () => {
  const original = process.env.CORS_ORIGENS;
  afterEach(() => {
    if (original === undefined) delete process.env.CORS_ORIGENS;
    else process.env.CORS_ORIGENS = original;
  });

  const req = (metodo: string, origem?: string) =>
    new NextRequest("http://localhost:3000/api/bairros", {
      method: metodo,
      headers: origem ? { origin: origem } : {},
    });

  it("devolve a origem permitida e os cabeçalhos CORS", () => {
    process.env.CORS_ORIGENS = "http://localhost:5173,https://front.vercel.app";
    const r = proxy(req("GET", "https://front.vercel.app"));
    expect(r.headers.get("access-control-allow-origin")).toBe("https://front.vercel.app");
    expect(r.headers.get("access-control-allow-headers")).toBe("Authorization,Content-Type");
    expect(r.headers.get("vary")).toBe("Origin");
  });

  it("responde o preflight OPTIONS com 204", () => {
    process.env.CORS_ORIGENS = "http://localhost:5173";
    const r = proxy(req("OPTIONS", "http://localhost:5173"));
    expect(r.status).toBe(204);
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(r.headers.get("access-control-allow-methods")).toBe("GET,POST,PUT,OPTIONS");
  });

  it("não libera origem fora da lista", () => {
    process.env.CORS_ORIGENS = "http://localhost:5173";
    expect(proxy(req("GET", "https://site-estranho.com")).headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("proxy (rotas e métodos)", () => {
  const chamar = (metodo: string, caminho: string) =>
    proxy(new NextRequest(`http://localhost:3000${caminho}`, { method: metodo, headers: { origin: "http://localhost:5173" } }));

  it.each([
    ["GET", "/api/bairros"],
    ["HEAD", "/api/bairros"],
    ["GET", "/api/licoes/3f2c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f/quiz"],
    ["POST", "/api/missoes/abc/registrar"],
    ["PUT", "/api/perfil"],
    ["POST", "/api/tutor"],
    ["GET", "/api/sol-de-hoje"],
    ["GET", "/api/docs"],
    ["GET", "/api/trilhas/"],
  ])("deixa passar %s %s", (metodo, caminho) => {
    expect(chamar(metodo, caminho).headers.get("x-middleware-next")).toBe("1");
  });

  it("rota inexistente responde 404 em JSON com CORS", async () => {
    const r = chamar("GET", "/api/nao-existe");
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: { codigo: "ROTA_NAO_ENCONTRADA", mensagem: "Esta rota da API não existe." } });
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("subcaminho desconhecido de rota com parâmetro responde 404", () => {
    expect(chamar("GET", "/api/licoes/abc/outra-coisa").status).toBe(404);
  });

  it("método não suportado responde 405 em JSON com o cabeçalho Allow", async () => {
    const r = chamar("DELETE", "/api/perfil");
    expect(r.status).toBe(405);
    expect(r.headers.get("allow")).toBe("GET, PUT, HEAD, OPTIONS");
    expect(await r.json()).toEqual({
      erro: { codigo: "METODO_NAO_PERMITIDO", mensagem: "Esta rota aceita só GET, PUT." },
    });
  });

  it("GET numa rota só de POST responde 405", () => {
    const r = chamar("GET", "/api/tutor");
    expect(r.status).toBe(405);
    expect(r.headers.get("allow")).toBe("POST, OPTIONS");
  });
});
