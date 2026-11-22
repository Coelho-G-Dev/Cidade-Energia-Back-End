import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/tutor/avaliar/route";
import { supabaseFalso, usou } from "./apoio/supabase-falso";
import { ErroApi } from "@/lib/http/erros";
const sessao = vi.hoisted(() => vi.fn()); const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/servidor", () => ({ exigirSessao: sessao })); vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: admin }));
vi.mock("@/lib/dados/limites", () => ({ limitarAcoes: vi.fn() }));
let code: string | null; let banco: ReturnType<typeof supabaseFalso>;
beforeEach(() => { code = null; sessao.mockResolvedValue({ usuarioId: "perfil-da-sessao" }); banco = supabaseFalso(() => ({ error: code ? { code, message: "não publicar" } : null })); admin.mockReturnValue(banco.cliente); });
const enviar = (body: unknown) => POST(new Request("http://localhost/api/tutor/avaliar", { method: "POST", body: JSON.stringify(body) }));
describe("POST /api/tutor/avaliar", () => {
  it.each([{ respostaId: "123", util: true }, { respostaId: "123", util: false }, { respostaId: "123", util: false, motivo: "confusa" }])("registra voto sem texto %j", async (body) => {
    const r = await enviar(body); expect(r.status).toBe(201); expect(await r.json()).toEqual({ registrado: true });
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(usou(banco.operacoes[0]!, "rpc")?.args).toEqual([{ p_perfil_id: "perfil-da-sessao", p_resposta_id: "123", p_util: body.util, p_motivo: "motivo" in body ? body.motivo : null }]);
  });
  it.each([{ respostaId: "abc", util: true }, { respostaId: "9223372036854775808", util: true }, { respostaId: "123", util: true, motivo: "errada" }, { respostaId: "123", util: false, motivo: "texto livre" }, { respostaId: "123", util: true, texto: "não guardar" }])("rejeita entrada %j sem escrever", async (body) => { expect((await enviar(body)).status).toBe(400); expect(banco.operacoes).toHaveLength(0); });
  it("outro estudante/inexistente recebe 404 indistinguível", async () => { code = "CT001"; const r = await enviar({ respostaId: "123", util: true }); expect(r.status).toBe(404); expect((await r.json()).erro.codigo).toBe("RESPOSTA_NAO_ENCONTRADA"); });
  it("segundo voto recebe 409", async () => { code = "CT002"; const r = await enviar({ respostaId: "123", util: true }); expect(r.status).toBe(409); expect((await r.json()).erro.codigo).toBe("AVALIACAO_JA_REGISTRADA"); });
  it("exige sessão", async () => { sessao.mockRejectedValue(new ErroApi(401, "NAO_AUTENTICADO", "Faça login.")); expect((await enviar({ respostaId: "123", util: true })).status).toBe(401); });
});
