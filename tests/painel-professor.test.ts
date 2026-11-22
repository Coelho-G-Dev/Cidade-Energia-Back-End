import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/professor/escola/route";
import { supabaseFalso, usou } from "./apoio/supabase-falso";
import { painelProfessorSchema } from "@/lib/validacao/painel";

const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: admin }));
vi.mock("@/lib/env", () => ({ envServidor: () => ({ SUPABASE_SERVICE_ROLE_KEY: "segredo-ficticio" }) }));

const escola = { nome: "Escola de teste", bairro: "Alemanha", codigoEstudante: "K7M2P9QX" };
const atualizadoEm = "2026-11-20T14:00:00.000Z";
const dadosAte = "2026-11-19";
const visivel = {
  escola, atualizadoEm, dadosAte, estudantes: 3, oculto: false,
  progresso: { licoesConcluidas: 3, mediaLicoesPorEstudante: 1, trilhas: [
    { slug: "solar", titulo: "Energia solar", totalLicoes: 4, estudantesQueComecaram: 3, estudantesQueConcluiram: null },
  ] },
  quiz: { respostas: null, percentualAcertos: null, perguntasMaisErradas: [] },
  diagnostico: [],
  missoes: [{ slug: "ar", titulo: "Ar desligado", estudantesQueComecaram: null, estudantesQueConcluiram: null, diasRegistrados: null }],
  simulacoes: { estudantesQueSimularam: null },
};

let dados: unknown;
let permitido: boolean;
let banco: ReturnType<typeof supabaseFalso>;
beforeEach(() => {
  dados = structuredClone(visivel); permitido = true;
  banco = supabaseFalso((op) => op.tabela === "rpc:consumir_limite_publico"
    ? { data: { permitido, liberado_em: null } } : { data: dados });
  admin.mockReturnValue(banco.cliente);
});
const pedir = (codigo: string | null = "ABCDEFGHJKLM", query = "") => GET(new Request(`http://localhost/api/professor/escola${query}`, {
  headers: { ...(codigo === null ? {} : { "X-Codigo-Professor": codigo }), "x-real-ip": "192.0.2.1" },
}));

describe("GET /api/professor/escola", () => {
  it("escola com 2 elegíveis: oculta todos os blocos, preservando escola e código dos estudantes", async () => {
    dados = { escola, atualizadoEm, dadosAte, estudantes: null, oculto: true, progresso: null, quiz: null, diagnostico: null, missoes: null, simulacoes: null };
    const r = await pedir();
    expect(r.status).toBe(200); expect(await r.json()).toEqual(dados);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("preserva recortes nulos de menos de 3 numa escola visível", async () => {
    const r = await pedir(); expect(r.status).toBe(200); expect(await r.json()).toEqual(visivel);
  });

  it("devolve dadosAte logo depois de atualizadoEm, sem recalcular a data do banco", async () => {
    const r = await pedir(); const corpo = await r.json();
    expect(corpo.dadosAte).toBe(dadosAte);
    const chaves = Object.keys(corpo);
    expect(chaves[chaves.indexOf("atualizadoEm") + 1]).toBe("dadosAte");
  });

  it("Zod exige dadosAte válido e mantém a resposta estrita", () => {
    const semData = { ...visivel } as Record<string, unknown>; delete semData.dadosAte;
    expect(painelProfessorSchema.safeParse(semData).success).toBe(false);
    expect(painelProfessorSchema.safeParse({ ...visivel, dadosAte: "2026-02-30" }).success).toBe(false);
    expect(painelProfessorSchema.safeParse({ ...visivel, dataExtra: dadosAte }).success).toBe(false);
  });

  it("perguntasMaisErradas exige 5 respostas e aceita o extremo 0% com 5", () => {
    const pergunta = { perguntaId: "11111111-1111-4111-8111-111111111111", enunciado: "Teste", licaoTitulo: "Teste", respostas: 5, percentualAcertos: 0 };
    expect(painelProfessorSchema.safeParse({ ...visivel, quiz: { respostas: 5, percentualAcertos: 0, perguntasMaisErradas: [pergunta] } }).success).toBe(true);
    expect(painelProfessorSchema.safeParse({ ...visivel, quiz: { respostas: 3, percentualAcertos: null, perguntasMaisErradas: [{ ...pergunta, respostas: 3 }] } }).success).toBe(false);
  });
  it("consulta somente a função agregada; nenhum perfil individual é carregado", async () => {
    await pedir("abcdefghjklm");
    expect(banco.operacoes.map((o) => o.tabela)).toEqual(["rpc:consumir_limite_publico", "rpc:painel_professor"]);
    expect(usou(banco.operacoes[1]!, "rpc")?.args).toEqual([{ p_codigo: "ABCDEFGHJKLM" }]);
  });
  it("a resposta não tem nome nem id de perfil em nenhuma profundidade", async () => {
    const corpo = await (await pedir()).json();
    const conferir = (valor: unknown, caminho = "") => {
      if (Array.isArray(valor)) return valor.forEach((v) => conferir(v, caminho));
      if (!valor || typeof valor !== "object") return;
      for (const [chave, v] of Object.entries(valor)) {
        expect(["id", "perfil_id", "perfilId", "primeiro_nome", "primeiroNome", "estudantesLista"]).not.toContain(chave);
        if (chave === "nome") expect(caminho).toBe("escola");
        conferir(v, caminho ? `${caminho}.${chave}` : chave);
      }
    };
    conferir(corpo);
  });
  it.each([null, "INVALIDO", "SOL2026"])("código ausente, inválido ou de estudante: 404 (%s)", async (codigo) => {
    const r = await pedir(codigo); expect(r.status).toBe(404);
    expect((await r.json()).erro.codigo).toBe("ESCOLA_NAO_ENCONTRADA");
  });
  it("código inexistente ou escola inativa: 404 indistinguível", async () => {
    dados = null;
    const r = await pedir(); expect(r.status).toBe(404); expect((await r.json()).erro.codigo).toBe("ESCOLA_NAO_ENCONTRADA");
  });
  it("limite de 30 por minuto aplicado antes de resolver o código, sem guardar IP ou código", async () => {
    permitido = false;
    const r = await pedir(); expect(r.status).toBe(429);
    expect((await r.json()).erro.codigo).toBe("LIMITE_DE_REQUISICOES");
    expect(banco.operacoes).toHaveLength(1);
    expect(usou(banco.operacoes[0]!, "rpc")?.args).toEqual([{
      p_chave: expect.stringMatching(/^professor:[a-f0-9]{64}$/), p_limite: 30, p_janela: "1 minute",
    }]);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("rejeita campos desconhecidos e código na URL", async () => {
    const r = await pedir("ABCDEFGHJKLM", "?codigo=ABCDEFGHJKLM");
    expect(r.status).toBe(400); expect((await r.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });
  it("recusa qualquer dado individual inesperado retornado pelo banco", async () => {
    dados = { ...visivel, perfilId: "nao-publicavel" };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const r = await pedir(); expect(r.status).toBe(500);
      expect(JSON.stringify(await r.json())).not.toContain("nao-publicavel");
      expect(JSON.stringify(log.mock.calls)).not.toContain("nao-publicavel");
    } finally { log.mockRestore(); }
  });
});
