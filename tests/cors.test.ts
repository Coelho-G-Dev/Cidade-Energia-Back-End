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
    process.env.CORS_ORIGENS = original;
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
