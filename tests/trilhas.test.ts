import { describe, expect, it } from "vitest";
import { obterLicao, obterTrilha } from "@/lib/dados/trilhas";
import { CACHE, cabecalhoDeCache } from "@/lib/http/cache";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const L1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const L2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const L3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

const irmas = [
  { id: L3, ordem: 3, titulo: "Terceira" },
  { id: L1, ordem: 1, titulo: "Primeira" },
  { id: L2, ordem: 2, titulo: "Segunda" },
];

function banco(concluidas: string[], resposta: (op: Operacao) => unknown) {
  return supabaseFalso((op) => {
    if (op.tabela === "progresso_licoes") return { data: concluidas.map((licao_id) => ({ licao_id })) };
    return { data: resposta(op) };
  });
}

const consultasAoConteudo = (ops: Operacao[]) => ops.filter((o) => o.tabela !== "progresso_licoes");

describe("obterLicao", () => {
  const licao = {
    id: L2,
    ordem: 2,
    titulo: "Segunda",
    conteudo: "Texto.",
    tipo: "texto",
    trilhas: { slug: "trilha", titulo: "Trilha", licoes: irmas },
    perguntas: [{ id: "p1" }, { id: "p2" }],
  };

  it("busca a lição, a trilha, as irmãs e a contagem de perguntas numa consulta só", async () => {
    const { cliente, operacoes } = banco([L1], () => licao);

    const r = await obterLicao(cliente, L2, PERFIL);

    expect(r).toEqual({
      id: L2,
      trilha: { slug: "trilha", titulo: "Trilha" },
      ordem: 2,
      titulo: "Segunda",
      conteudo: "Texto.",
      tipo: "texto",
      totalPerguntas: 2,
      concluida: false,
      liberada: true,
      licaoPendente: null,
      proximaLicaoId: L3,
    });
    const conteudo = consultasAoConteudo(operacoes);
    expect(conteudo).toHaveLength(1);
    expect(usou(conteudo[0]!, "select")!.args[0]).toBe(
      "id, ordem, titulo, conteudo, tipo, trilhas(slug, titulo, licoes(id, ordem, titulo)), perguntas(id)",
    );
  });

  it("com lição anterior pendente, aponta qual falta (as irmãs vêm fora de ordem do banco)", async () => {
    const { cliente } = banco([], () => licao);
    const r = await obterLicao(cliente, L2, PERFIL);
    expect(r).toMatchObject({ liberada: false, licaoPendente: { id: L1, titulo: "Primeira" } });
  });

  it("sem login, não consulta o progresso", async () => {
    const { cliente, operacoes } = banco([], () => licao);
    await obterLicao(cliente, L2, null);
    expect(operacoes.some((o) => o.tabela === "progresso_licoes")).toBe(false);
  });

  it("lição inexistente responde 404", async () => {
    const { cliente } = banco([], () => null);
    await expect(obterLicao(cliente, L2, null)).rejects.toMatchObject({ status: 404, codigo: "LICAO_NAO_ENCONTRADA" });
  });
});

describe("obterTrilha", () => {
  const trilha = {
    id: "t",
    slug: "trilha",
    titulo: "Trilha",
    descricao: "D",
    tema: "solar",
    minutos: 10,
    licoes: irmas.map((l) => ({ ...l, trilha_id: "t", tipo: "texto" })),
  };

  it("busca a trilha com as lições numa consulta só e ordena as lições", async () => {
    const { cliente, operacoes } = banco([L1], () => trilha);

    const r = await obterTrilha(cliente, "trilha", PERFIL);

    expect(r.licoes.map((l) => [l.ordem, l.concluida, l.liberada])).toEqual([
      [1, true, true],
      [2, false, true],
      [3, false, false],
    ]);
    expect(r).toMatchObject({ totalLicoes: 3, licoesConcluidas: 1, concluida: false });
    expect(r).not.toHaveProperty("licoes.0.trilha_id");
    const conteudo = consultasAoConteudo(operacoes);
    expect(conteudo).toHaveLength(1);
    expect(usou(conteudo[0]!, "select")!.args[0]).toBe(
      "id, slug, titulo, descricao, tema, minutos, licoes(id, trilha_id, ordem, titulo, tipo)",
    );
  });

  it("trilha inexistente responde 404", async () => {
    const { cliente } = banco([], () => null);
    await expect(obterTrilha(cliente, "nao-existe", null)).rejects.toMatchObject({ status: 404, codigo: "TRILHA_NAO_ENCONTRADA" });
  });
});

describe("cabecalhoDeCache", () => {
  const comToken = new Request("http://x/api/licoes/1", { headers: { authorization: "Bearer abc" } });
  const semToken = new Request("http://x/api/licoes/1");

  it("sem token, cache curto na CDN", () => {
    expect(cabecalhoDeCache(CACHE.conteudo, semToken)).toEqual({
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    });
  });

  it("com token, nunca guarda a resposta (ela tem o progresso do estudante)", () => {
    expect(cabecalhoDeCache(CACHE.conteudo, comToken)).toEqual({ "Cache-Control": "private, no-store" });
  });

  it("rotas sem sessão usam a política direto", () => {
    expect(cabecalhoDeCache(CACHE.solDeHoje)).toEqual({ "Cache-Control": "public, s-maxage=600, stale-while-revalidate=7200" });
  });
});
