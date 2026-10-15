import { beforeAll, describe, expect, it } from "vitest";
import { exigirSessao, obterSessao } from "@/lib/supabase/servidor";
import { ErroApi } from "@/lib/http/erros";

const requisicao = (authorization?: string) =>
  new Request("http://localhost/api/perfil", {
    headers: authorization ? { authorization } : {},
  });

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemplo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
});

describe("obterSessao", () => {
  it("retorna null sem cabeçalho Authorization", async () => {
    expect(await obterSessao(requisicao())).toBeNull();
  });

  it("retorna null quando o esquema não é Bearer", async () => {
    expect(await obterSessao(requisicao("Basic abc"))).toBeNull();
  });

  it("retorna null para token malformado em vez de lançar erro", async () => {
    expect(await obterSessao(requisicao("Bearer abc.def.ghi"))).toBeNull();
    expect(await obterSessao(requisicao("Bearer lixo"))).toBeNull();
  });
});

describe("exigirSessao", () => {
  it("lança 401 NAO_AUTENTICADO sem sessão válida", async () => {
    const erro = await exigirSessao(requisicao("Bearer abc.def.ghi")).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).status).toBe(401);
    expect((erro as ErroApi).codigo).toBe("NAO_AUTENTICADO");
  });
});
