import { timingSafeEqual } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/impacto/route";
import { diaSaoLuis, lerPeriodoImpacto } from "@/lib/http/impacto";
import { agregadoImpacto } from "./apoio/impacto";
import { supabaseFalso, usou } from "./apoio/supabase-falso";

vi.mock("node:crypto", async (original) => {
  const real = await original<typeof import("node:crypto")>();
  return { ...real, timingSafeEqual: vi.fn(real.timingSafeEqual) };
});
const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: admin }));
let dados: unknown;
let banco: ReturnType<typeof supabaseFalso>;
const CHAVE = "chave-ficticia-impacto";
const pedido = (query = "?de=2026-11-20&ate=2026-11-20", chave: string | null = CHAVE) => new Request(`http://localhost/api/impacto${query}`, {
  headers: chave === null ? {} : { "X-Chave-Impacto": chave },
});

beforeEach(() => {
  vi.stubEnv("IMPACTO_CHAVE", CHAVE); admin.mockClear(); vi.mocked(timingSafeEqual).mockClear();
  dados = agregadoImpacto(); banco = supabaseFalso(() => ({ data: dados })); admin.mockReturnValue(banco.cliente);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("GET /api/impacto", () => {
  it("sem variável ou com variável vazia: 503 sem abrir o banco", async () => {
    for (const valor of [undefined, ""]) {
      vi.stubEnv("IMPACTO_CHAVE", valor);
      const r = await GET(pedido()); expect(r.status).toBe(503);
      expect((await r.json()).erro.codigo).toBe("IMPACTO_DESLIGADO");
      expect(r.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(admin).not.toHaveBeenCalled();
  });
  it.each([null, "errada", "x".repeat(200), "chave-ficticia-impactO"])("chave errada/ausente (%s): 401, comparação de digests em tempo constante", async (chave) => {
    const r = await GET(pedido(undefined, chave)); expect(r.status).toBe(401);
    expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
    expect(timingSafeEqual).toHaveBeenCalledTimes(1);
    const [a, b] = vi.mocked(timingSafeEqual).mock.calls[0]!;
    expect(a.byteLength).toBe(32); expect(b.byteLength).toBe(32);
    expect(admin).not.toHaveBeenCalled();
  });
  it("resposta estrita D-005, apenas agregados e potencial de hábitos, sem missões em kWh/R$", async () => {
    const r = await GET(pedido()); expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo).toMatchObject(agregadoImpacto());
    expect(Object.keys(corpo.economiaEstimada)).toEqual(["potencialHabitos", "comoCalculamos"]);
    expect(corpo.economiaEstimada.comoCalculamos.potencialHabitos).toContain("não é economia medida");
    expect(corpo.missoes).toEqual({ registros: 6, concluidas: null });
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(banco.operacoes.map((o) => o.tabela)).toEqual(["rpc:painel_impacto"]);
    expect(usou(banco.operacoes[0]!, "rpc")?.args).toEqual([{ p_de: "2026-11-20", p_ate: "2026-11-20" }]);
    const proibidas = ["perfilId", "perfil_id", "primeiro_nome", "primeiroNome", '"nome"', '"id"'];
    for (const chave of proibidas) expect(JSON.stringify(corpo)).not.toContain(chave);
  });
  it("não transforma valores ocultos em zero", async () => {
    dados = { ...agregadoImpacto(), economiaEstimada: { potencialHabitos: { reaisMes: null, kwhMes: null, estudantes: null } } };
    const corpo = await (await GET(pedido())).json();
    expect(corpo.economiaEstimada.potencialHabitos).toEqual({ reaisMes: null, kwhMes: null, estudantes: null });
  });
  it("preserva o percentual nulo com contagem visível, e 0% quando o SQL autoriza 5 respondentes", async () => {
    let corpo = await (await GET(pedido())).json();
    expect(corpo.aprendizado.respostasDoQuiz).toBe(6);
    expect(corpo.aprendizado.percentualAcertos).toBeNull();
    dados = { ...agregadoImpacto(), aprendizado: { ...agregadoImpacto().aprendizado, percentualAcertos: 0 } };
    corpo = await (await GET(pedido())).json();
    expect(corpo.aprendizado.percentualAcertos).toBe(0);
  });
  it.each([
    "?de=2026-02-30", "?de=2026-11-21&ate=2026-11-20", "?de=2025-11-19&ate=2026-11-20",
    "?de=20-11-2026", "?de=", "?formato=csv", "?escola=1", "?de=2026-11-20&de=2026-11-20",
  ])("período inválido ou parâmetro desconhecido: 400 (%s)", async (query) => {
    const r = await GET(pedido(query)); expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("ENTRADA_INVALIDA"); expect(admin).not.toHaveBeenCalled();
  });
  it("autentica antes de validar o período", async () => {
    const r = await GET(pedido("?de=invalido", "errada")); expect(r.status).toBe(401);
  });
  it("rejeita dado individual extra do banco sem expor seu conteúdo", async () => {
    dados = { ...agregadoImpacto(), primeiroNome: "nao-publicavel" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const r = await GET(pedido()); expect(r.status).toBe(500);
      expect(JSON.stringify(await r.json()) + JSON.stringify(log.mock.calls)).not.toContain("nao-publicavel");
    } finally { log.mockRestore(); }
  });
});

describe("período fechado no fuso de São Luís", () => {
  it("meia-noite UTC ainda pertence ao dia anterior em São Luís", () => {
    expect(diaSaoLuis(new Date("2026-11-21T02:59:59Z"))).toBe("2026-11-20");
    expect(diaSaoLuis(new Date("2026-11-21T03:00:00Z"))).toBe("2026-11-21");
  });
  it("aceita 366 dias incluindo ano bissexto e o mesmo dia", () => {
    expect(lerPeriodoImpacto(pedido("?de=2024-01-01&ate=2024-12-31"))).toEqual({ de: "2024-01-01", ate: "2024-12-31" });
    expect(lerPeriodoImpacto(pedido())).toEqual({ de: "2026-11-20", ate: "2026-11-20" });
  });
  it("padrão de ate é hoje em São Luís; de ausente cobre 366 dias", () => {
    expect(lerPeriodoImpacto(pedido(""), false, new Date("2026-11-21T01:00:00Z")))
      .toEqual({ de: "2025-11-20", ate: "2026-11-20" });
  });
});
