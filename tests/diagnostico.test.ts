import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/trilhas/[slug]/diagnostico/route";
import { ErroApi } from "@/lib/http/erros";
import { supabaseFalso, usou } from "./apoio/supabase-falso";
const sessao = vi.hoisted(() => vi.fn()); const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/servidor", () => ({ exigirSessao: sessao }));
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: admin }));
vi.mock("@/lib/dados/limites", () => ({ limitarAcoes: vi.fn() }));
const ids = [1, 2, 3, 4].map((i) => `00000000-0000-4000-8000-00000000000${i}`);
const perguntas = ids.map((id, i) => ({ id, ordem: i + 1, enunciado: "[FICTÍCIO] Teste", opcoes: ["A", "B"] }));
const respostas = ids.map((perguntaId) => ({ perguntaId, opcao: 0 }));
let dados: unknown; let erro: { code: string; message: string } | undefined; let banco: ReturnType<typeof supabaseFalso>;
const contexto = () => ({ params: Promise.resolve({ slug: "energia-solar-em-sao-luis" }) });
const pedir = (body?: unknown, query = "?momento=antes") => new Request(`http://localhost/api/trilhas/energia-solar-em-sao-luis/diagnostico${query}`, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { erro = undefined; dados = { momento: "antes", disponivel: true, respondido: false, perguntas };
  banco = supabaseFalso(() => ({ data: dados, error: erro })); admin.mockReturnValue(banco.cliente); sessao.mockResolvedValue({ usuarioId: "perfil-ficticio" }); });
describe("diagnóstico D-013", () => {
  it("GET não devolve gabarito, explicação ou acertos", async () => {
    const r = await GET(pedir(), contexto()); expect(r.status).toBe(200); expect(await r.json()).toEqual(dados);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("antes só retorna a confirmação e usa identidade da sessão", async () => {
    dados = { momento: "antes", registrado: true };
    const r = await POST(pedir({ momento: "antes", respostas }), contexto()); expect(r.status).toBe(201); expect(await r.json()).toEqual(dados);
    expect(usou(banco.operacoes[0]!, "rpc")?.args).toEqual([{ p_perfil_id: "perfil-ficticio", p_slug: "energia-solar-em-sao-luis", p_momento: "antes", p_respostas: respostas }]);
    expect(banco.operacoes.map((o) => o.tabela)).toEqual(["rpc:gravar_diagnostico"]);
  });
  it("depois permite o próprio resultado e correção, sem pontos", async () => {
    dados = { momento: "depois", registrado: true, total: 4, acertosAntes: 0, acertosDepois: 4,
      perguntas: ids.map((perguntaId) => ({ perguntaId, indiceCorreto: 0, acertouAntes: false, acertouDepois: true, explicacao: "[FICTÍCIO] Teste" })) };
    const r = await POST(pedir({ momento: "depois", respostas }), contexto()); expect(r.status).toBe(201); expect(await r.json()).toEqual(dados);
  });
  it.each([false, true])("indisponível/respondido não recebe perguntas (%s)", async (respondido) => {
    dados = { momento: "antes", disponivel: false, respondido, perguntas: [] };
    expect(await (await GET(pedir(), contexto())).json()).toEqual(dados);
  });
  it.each([
    { momento: "antes", respostas: respostas.slice(1) }, { momento: "antes", respostas: [respostas[0], respostas[0], respostas[2], respostas[3]] },
    { momento: "antes", respostas: respostas.map((r) => ({ ...r, opcao: 5 })) }, { momento: "antes", respostas, perfilId: "outro" },
    { momento: "invalido", respostas },
  ])("rejeita lote inválido antes do banco: %j", async (body) => { const r = await POST(pedir(body), contexto()); expect(r.status).toBe(400); expect(banco.operacoes).toHaveLength(0); });
  it.each(["", "?momento=antes&momento=depois", "?momento=antes&extra=1"])("GET rejeita consulta inválida %s", async (query) => { expect((await GET(pedir(undefined, query), contexto())).status).toBe(400); });
  it.each([["CD001", 404, "TRILHA_NAO_ENCONTRADA"], ["CD002", 409, "DIAGNOSTICO_INDISPONIVEL"], ["CD003", 409, "DIAGNOSTICO_JA_RESPONDIDO"], ["CD004", 400, "ENTRADA_INVALIDA"]] as const)("converte %s em %s", async (code, status, codigo) => {
    erro = { code, message: "não publicar" }; const r = await POST(pedir({ momento: "antes", respostas }), contexto()); expect(r.status).toBe(status); expect((await r.json()).erro.codigo).toBe(codigo);
  });
  it("exige sessão", async () => { sessao.mockRejectedValue(new ErroApi(401, "NAO_AUTENTICADO", "Faça login.")); expect((await GET(pedir(), contexto())).status).toBe(401); });
  it("banco que devolve gabarito indevido no antes causa 500, sem expor o conteúdo", async () => {
    dados = { momento: "antes", registrado: true, acertos: 4, explicacao: "SEGREDO-FICTICIO" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try { const r = await POST(pedir({ momento: "antes", respostas }), contexto()); expect(r.status).toBe(500); expect(JSON.stringify(await r.json()) + JSON.stringify(log.mock.calls)).not.toContain("SEGREDO-FICTICIO"); } finally { log.mockRestore(); }
  });
});
