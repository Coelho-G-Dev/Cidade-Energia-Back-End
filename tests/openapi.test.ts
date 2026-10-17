import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as getDocs } from "@/app/api/docs/route";
import { GET as getOpenApi } from "@/app/api/openapi/route";
import { especificacaoOpenApi } from "@/lib/openapi";
import { atualizarPerfilSchema } from "@/lib/validacao/perfil";
import { pedaleSchema, responderSchema } from "@/lib/validacao/conteudo";
import { criarSimulacaoSchema } from "@/lib/validacao/simulacao";
import { tutorSchema } from "@/lib/validacao/tutor";

const PASTA_API = path.resolve(__dirname, "../src/app/api");
const ROTAS_DE_DOCUMENTACAO = new Set(["/api/docs", "/api/openapi"]);
const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function rotasDoProjeto(pasta = PASTA_API): { caminho: string; metodos: string[] }[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const completo = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) return rotasDoProjeto(completo);
    if (entrada.name !== "route.ts") return [];
    const codigo = readFileSync(completo, "utf8");
    const caminho = ("/api/" + path.relative(PASTA_API, pasta).split(path.sep).join("/")).replace(/\[(\w+)\]/g, "{$1}");
    const metodos = METODOS.filter((m) => new RegExp(`export (async )?function ${m}\\b`).test(codigo));
    return [{ caminho, metodos }];
  });
}

function referencias(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap(referencias);
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([chave, v]) => (chave === "$ref" ? [String(v)] : referencias(v)));
  }
  return [];
}

const paths: Record<string, Record<string, unknown>> = especificacaoOpenApi.paths;

describe("especificação OpenAPI", () => {
  it("documenta todas as rotas e métodos da API", () => {
    const rotas = rotasDoProjeto().filter((r) => !ROTAS_DE_DOCUMENTACAO.has(r.caminho));
    expect(rotas.length).toBeGreaterThan(0);
    for (const { caminho, metodos } of rotas) {
      expect(paths, caminho).toHaveProperty([caminho]);
      for (const metodo of metodos) expect(paths[caminho], `${metodo} ${caminho}`).toHaveProperty([metodo.toLowerCase()]);
    }
  });

  it("não documenta rotas que não existem", () => {
    const existentes = new Set(rotasDoProjeto().map((r) => r.caminho));
    for (const caminho of Object.keys(paths)) expect(existentes, caminho).toContain(caminho);
  });

  it("todas as referências $ref apontam para componentes definidos", () => {
    for (const ref of referencias(especificacaoOpenApi)) {
      const [, secao, nome] = ref.match(/^#\/components\/(\w+)\/(\w+)$/) ?? [];
      const componentes: Record<string, Record<string, unknown>> = especificacaoOpenApi.components;
      expect(componentes[secao ?? ""], ref).toHaveProperty([nome ?? ""]);
    }
  });

  it("os exemplos de PUT /api/perfil passam na validação real", () => {
    const exemplos = especificacaoOpenApi.paths["/api/perfil"].put.requestBody.content["application/json"].examples;
    for (const [nome, { value }] of Object.entries(exemplos)) {
      expect(atualizarPerfilSchema.safeParse(value).success, nome).toBe(true);
    }
  });

  it("os exemplos de POST /api/simulacoes passam na validação real", () => {
    const exemplos = especificacaoOpenApi.paths["/api/simulacoes"].post.requestBody.content["application/json"].examples;
    for (const [nome, { value }] of Object.entries(exemplos)) {
      expect(criarSimulacaoSchema.safeParse(value).success, nome).toBe(true);
    }
  });

  it("os exemplos de POST /api/quiz/responder e /api/pedale/concluir passam na validação real", () => {
    const quiz = especificacaoOpenApi.paths["/api/quiz/responder"].post.requestBody.content["application/json"].examples;
    for (const [nome, { value }] of Object.entries(quiz)) expect(responderSchema.safeParse(value).success, nome).toBe(true);
    const pedale = especificacaoOpenApi.paths["/api/pedale/concluir"].post.requestBody.content["application/json"].examples;
    for (const [nome, { value }] of Object.entries(pedale)) expect(pedaleSchema.safeParse(value).success, nome).toBe(true);
  });
});

describe("exemplos do tutor", () => {
  it("os exemplos de POST /api/tutor passam na validação real", () => {
    const exemplos = especificacaoOpenApi.paths["/api/tutor"].post.requestBody.content["application/json"].examples;
    for (const [nome, { value }] of Object.entries(exemplos)) expect(tutorSchema.safeParse(value).success, nome).toBe(true);
  });
});

describe("rotas de documentação", () => {
  it("GET /api/openapi devolve a especificação em JSON", async () => {
    const r = getOpenApi();
    expect(r.status).toBe(200);
    expect((await r.json()).openapi).toBe("3.1.0");
  });

  it("GET /api/docs devolve a página do Swagger UI apontando para /api/openapi", async () => {
    const r = getDocs();
    expect(r.headers.get("content-type")).toContain("text/html");
    const html = await r.text();
    expect(html).toContain("SwaggerUIBundle");
    expect(html).toContain('url: "/api/openapi"');
  });
});
