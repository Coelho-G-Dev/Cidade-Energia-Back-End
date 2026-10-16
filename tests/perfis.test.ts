import { describe, expect, it } from "vitest";
import { atualizarPerfil, mensagemLimiteTrocas, obterPerfil, obterResumo } from "@/lib/dados/perfis";
import { supabaseFalso, usou } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const BAIRRO = "22222222-2222-4222-8222-222222222222";

const linhaPerfil = { id: PERFIL, primeiro_nome: "Ana", bairro_id: BAIRRO, escola_id: null, criado_em: "2026-10-15T12:00:00.000Z" };

function bancoPerfil(situacao: Record<string, unknown> | null) {
  return supabaseFalso((op) => {
    if (op.tabela === "situacao_trocas") return { data: situacao };
    return { data: linhaPerfil };
  });
}

describe("perfil com a situação das trocas", () => {
  it("GET: informa o limite, as trocas restantes e nenhuma data quando ainda há trocas", async () => {
    const { cliente, operacoes } = bancoPerfil({ limite: 3, trocas_restantes: 2, proxima_troca_em: null });
    expect(await obterPerfil(cliente, PERFIL)).toEqual({
      ...linhaPerfil,
      tem_perfil: true,
      limite_trocas: 3,
      trocas_restantes: 2,
      proxima_troca_em: null,
    });
    const consulta = operacoes.find((o) => o.tabela === "situacao_trocas")!;
    expect(usou(consulta, "eq")?.args).toEqual(["perfil_id", PERFIL]);
  });

  it("GET: sem trocas restantes, traz a data de liberação em ISO", async () => {
    const { cliente } = bancoPerfil({ limite: 3, trocas_restantes: 0, proxima_troca_em: "2026-11-14T18:30:00.123456+00:00" });
    const r = await obterPerfil(cliente, PERFIL);
    expect(r).toMatchObject({ trocas_restantes: 0, proxima_troca_em: "2026-11-14T18:30:00.123Z" });
  });

  it("PUT: devolve a situação já atualizada depois de salvar", async () => {
    const { cliente } = bancoPerfil({ limite: 3, trocas_restantes: 1, proxima_troca_em: null });
    const r = await atualizarPerfil(cliente, PERFIL, { primeiro_nome: "Ana", bairro_id: BAIRRO });
    expect(r).toMatchObject({ tem_perfil: true, limite_trocas: 3, trocas_restantes: 1 });
  });
});

describe("limite de trocas de bairro ou escola", () => {
  it("a mensagem traz o dia e a hora de São Luís em que a troca é liberada", () => {
    expect(mensagemLimiteTrocas(new Date("2026-11-14T18:30:00Z"))).toBe(
      "Você atingiu o limite de trocas de bairro ou escola. Você poderá trocar de novo a partir de 14/11 às 15:30.",
    );
  });

  it("sem data válida, pede para tentar mais tarde", () => {
    expect(mensagemLimiteTrocas(null)).toMatch(/Tente de novo mais tarde\.$/);
    expect(mensagemLimiteTrocas(new Date("x"))).toMatch(/Tente de novo mais tarde\.$/);
  });

  it("o bloqueio do banco (CE001) vira 429 LIMITE_DE_TROCAS", async () => {
    const { cliente } = supabaseFalso(() => ({
      error: { code: "CE001", message: "limite de trocas de bairro ou escola atingido", hint: "2026-11-14T18:30:00Z" },
    }));
    await expect(atualizarPerfil(cliente, PERFIL, { primeiro_nome: "Ana", bairro_id: BAIRRO })).rejects.toMatchObject({
      status: 429,
      codigo: "LIMITE_DE_TROCAS",
      message: expect.stringContaining("14/11 às 15:30"),
    });
  });

  it("bairro inexistente continua sendo 404", async () => {
    const { cliente } = supabaseFalso(() => ({ error: { code: "23503", message: "fk" } }));
    await expect(atualizarPerfil(cliente, PERFIL, { primeiro_nome: "Ana", bairro_id: BAIRRO })).rejects.toMatchObject({
      status: 404,
      codigo: "BAIRRO_OU_ESCOLA_NAO_ENCONTRADO",
    });
  });
});

describe("obterResumo: escola e bairro fora do ranking", () => {
  function banco(linha: Record<string, unknown>) {
    return supabaseFalso((op) => {
      if (op.tabela === "perfil_resumo") return { data: { pontos: 0, licoes_concluidas: 0, trilhas_concluidas: 0, missoes_concluidas: 0, ...linha } };
      return { data: [] };
    });
  }

  it("escola sem pontos: posição null e 0 pontos", async () => {
    const { cliente } = banco({ posicao_escola: null, pontos_escola: 0, posicao_bairro: 2, pontos_bairro: "40" });
    const r = await obterResumo(cliente, PERFIL);
    expect(r.escola).toEqual({ posicao: null, pontos: 0 });
    expect(r.bairro).toEqual({ posicao: 2, pontos: 40 });
  });

  it("sem escola ou bairro cadastrados: null", async () => {
    const { cliente } = banco({ posicao_escola: null, pontos_escola: null, posicao_bairro: null, pontos_bairro: null });
    const r = await obterResumo(cliente, PERFIL);
    expect(r.escola).toBeNull();
    expect(r.bairro).toBeNull();
  });
});
