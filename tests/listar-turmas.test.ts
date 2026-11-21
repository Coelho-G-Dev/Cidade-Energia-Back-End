import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CHAVE_FICTICIA = "chave-de-servico-ficticia-para-teste";
const SCRIPT = resolve("scripts/listar-turmas.mjs");
let diretorio: string;
let servidor: Server;
let pedidos: { metodo: string | undefined; url: URL; chave: string | undefined }[];
let resposta: unknown;
let status: number;

beforeEach(async () => {
  diretorio = await mkdtemp(join(tmpdir(), "cidade-energia-turmas-"));
  pedidos = [];
  status = 200;
  resposta = [{ nome: "Escola de exemplo", codigo_turma: "SOL2026", bairros: { nome: "Alemanha" }, primeiro_nome: "DADO-NAO-PUBLICAVEL" }];
  servidor = createServer((req, res) => {
    pedidos.push({ metodo: req.method, url: new URL(req.url!, "http://localhost"), chave: req.headers.apikey as string });
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(resposta));
  });
  await new Promise<void>((aceitar) => servidor.listen(0, "127.0.0.1", aceitar));
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string") throw new Error("Servidor de teste sem porta");
  await writeFile(join(diretorio, ".env.local"), `NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:${endereco.port}"\nSUPABASE_SERVICE_ROLE_KEY='${CHAVE_FICTICIA}'\n`);
});

afterEach(async () => {
  await new Promise<void>((aceitar, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : aceitar()));
  if (dirname(resolve(diretorio)) !== resolve(tmpdir()) || !basename(diretorio).startsWith("cidade-energia-turmas-")) {
    throw new Error("Diretório temporário fora do escopo do teste");
  }
  await rm(diretorio, { recursive: true, force: true });
});

function rodar(...args: string[]) {
  const env = { ...process.env };
  for (const nome of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]) delete env[nome];
  return new Promise<{ codigo: number; stdout: string; stderr: string }>((aceitar) => {
    execFile(process.execPath, [SCRIPT, ...args], { cwd: diretorio, env, timeout: 10000 }, (erro, stdout, stderr) => {
      aceitar({ codigo: erro ? 1 : 0, stdout, stderr });
    });
  });
}

describe("turmas:listar (somente leitura)", () => {
  it("lê .env.local, filtra pelo INEP e imprime só escola, bairro e código", async () => {
    const r = await rodar("--inep", "21016631");
    expect(r.codigo).toBe(0);
    expect(r.stdout).toContain("Escola de exemplo\tAlemanha\tSOL2026");
    expect(r.stdout + r.stderr).not.toContain(CHAVE_FICTICIA);
    expect(r.stdout + r.stderr).not.toContain("DADO-NAO-PUBLICAVEL");
    expect(pedidos).toHaveLength(1);
    const pedido = pedidos[0]!;
    expect(pedido.metodo).toBe("GET");
    expect(pedido.chave).toBe(CHAVE_FICTICIA);
    expect(pedido.url.pathname).toBe("/rest/v1/escolas");
    expect(pedido.url.searchParams.get("select")).toBe("nome,codigo_turma,bairros!inner(nome)");
    expect(pedido.url.searchParams.get("codigo_inep")).toBe("eq.21016631");
    expect(pedido.url.searchParams.get("ativa")).toBe("eq.true");
    expect(pedido.url.searchParams.get("codigo_turma")).toBe("not.is.null");
  });

  it("filtra pelo nome exato do bairro", async () => {
    const r = await rodar("--bairro", " São Francisco ");
    expect(r.codigo).toBe(0);
    const pedido = pedidos[0]!;
    expect(pedido.url.searchParams.get("bairros.nome")).toBe("eq.São Francisco");
    expect(pedido.url.searchParams.has("codigo_inep")).toBe(false);
  });

  it.each([[], ["--inep", "123"], ["--bairro", " "], ["--inep", "21016631", "--bairro", "Alemanha"], ["--apagar"]])("rejeita filtro inválido antes de consultar: %j", async (...args) => {
    const r = await rodar(...args);
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain("Uso:");
    expect(pedidos).toHaveLength(0);
  });

  it("informa resultado vazio", async () => {
    resposta = [];
    expect((await rodar("--bairro", "Alemanha")).stdout).toContain("Nenhuma escola ativa");
  });

  it("não imprime detalhes nem a chave em falha do Supabase", async () => {
    status = 401;
    resposta = { message: `erro remoto com ${CHAVE_FICTICIA}`, code: "INVALID" };
    const r = await rodar("--inep", "21016631");
    expect(r.codigo).toBe(1);
    expect(r.stderr).toContain("Não foi possível consultar");
    expect(r.stdout + r.stderr).not.toContain(CHAVE_FICTICIA);
  });
});
