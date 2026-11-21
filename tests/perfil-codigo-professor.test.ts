import { describe, expect, it, vi } from "vitest";
import { PUT } from "@/app/api/perfil/route";
import { supabaseFalso } from "./apoio/supabase-falso";

const sessao = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/servidor", () => ({ exigirSessao: sessao }));
vi.mock("@/lib/dados/limites", () => ({ limitarAcoes: vi.fn() }));

describe("PUT /api/perfil: separação dos códigos", () => {
  it("código do professor não vincula nem verifica estudante", async () => {
    const { cliente, operacoes } = supabaseFalso(() => ({ data: null }));
    sessao.mockResolvedValue({ supabase: cliente, usuarioId: "11111111-1111-4111-8111-111111111111" });
    const r = await PUT(new Request("http://localhost/api/perfil", {
      method: "PUT", body: JSON.stringify({ primeiro_nome: "Ana", bairro_id: "22222222-2222-4222-8222-222222222222", codigo_turma: "ABCDEFGHJKLM" }),
    }));
    expect(r.status).toBe(404);
    expect((await r.json()).erro.codigo).toBe("TURMA_NAO_ENCONTRADA");
    expect(operacoes.map((o) => o.tabela)).toEqual(["rpc:resolver_codigo_turma"]);
  });
});
