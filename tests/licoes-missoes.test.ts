import { describe, expect, it } from "vitest";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { listarMissoes, registrarMissao } from "@/lib/dados/missoes";
import { concluirLicao } from "@/lib/dados/trilhas";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const LICAO = "22222222-2222-4222-8222-222222222222";
const MISSAO = "33333333-3333-4333-8333-333333333333";
const TRILHA = "55555555-5555-4555-8555-555555555555";
const LICAO_1 = "66666666-6666-4666-8666-666666666666";
const LICAO_2 = "77777777-7777-4777-8777-777777777777";

const eventoDePontos = (ops: Operacao[]) =>
  ops.find((o) => o.tabela === "pontos_eventos" && usou(o, "upsert"))?.chamadas.find((c) => c.metodo === "upsert")?.args[0];

type OpcoesLicao = { pontosJaDados?: boolean; ordem?: number; concluidas?: string[] };

function bancoLicao(tipo: "texto" | "pedale", { pontosJaDados = false, ordem = 1, concluidas = [] }: OpcoesLicao = {}) {
  return supabaseFalso((op) => {
    if (op.tabela === "licoes" && usou(op, "maybeSingle")) return { data: { id: LICAO, trilha_id: TRILHA, ordem, tipo } };
    if (op.tabela === "licoes") {
      return {
        data: [
          { id: LICAO_1, ordem: 1, titulo: "O sol de São Luís" },
          { id: LICAO_2, ordem: 2, titulo: "Como a placa solar funciona" },
          { id: LICAO, ordem, titulo: "Lição testada" },
        ].filter((l) => l.ordem <= ordem),
      };
    }
    if (op.tabela === "progresso_licoes" && usou(op, "select")) return { data: concluidas.map((licao_id) => ({ licao_id })) };
    if (op.tabela === "pontos_eventos" && usou(op, "upsert")) {
      return { data: pontosJaDados ? [] : [{ pontos: PONTOS_POR_ORIGEM.licao_concluida }] };
    }
    if (op.tabela === "simulacoes") return { count: 0 };
    if (op.tabela === "perfis") return { data: { bairro_id: null } };
    return { data: [] };
  });
}

describe("concluirLicao", () => {
  it("lição de texto: registra o progresso e pontua como licao_concluida", async () => {
    const { cliente, operacoes } = bancoLicao("texto");
    const r = await concluirLicao(cliente, PERFIL, LICAO, "texto");
    expect(r).toMatchObject({ licaoId: LICAO, concluida: true, pontosGanhos: PONTOS_POR_ORIGEM.licao_concluida });
    expect(eventoDePontos(operacoes)).toMatchObject({ origem: "licao_concluida", referencia_id: LICAO });
    const progresso = operacoes.find((o) => o.tabela === "progresso_licoes" && usou(o, "upsert"))!;
    expect(usou(progresso, "upsert")?.args[1]).toEqual({ onConflict: "perfil_id,licao_id", ignoreDuplicates: true });
  });

  it("concluir de novo não duplica os pontos", async () => {
    const { cliente } = bancoLicao("texto", { pontosJaDados: true });
    expect((await concluirLicao(cliente, PERFIL, LICAO, "texto")).pontosGanhos).toBe(0);
  });

  it("lição de pedale pelo pedale/concluir pontua como pedale_concluido", async () => {
    const { cliente, operacoes } = bancoLicao("pedale");
    await concluirLicao(cliente, PERFIL, LICAO, "pedale");
    expect(eventoDePontos(operacoes)).toMatchObject({ origem: "pedale_concluido", pontos: PONTOS_POR_ORIGEM.pedale_concluido });
  });

  it("lição de pedale não pode ser concluída como texto (e vice-versa)", async () => {
    await expect(concluirLicao(bancoLicao("pedale").cliente, PERFIL, LICAO, "texto")).rejects.toMatchObject({
      status: 400,
      codigo: "LICAO_E_PEDALE",
    });
    await expect(concluirLicao(bancoLicao("texto").cliente, PERFIL, LICAO, "pedale")).rejects.toMatchObject({
      status: 400,
      codigo: "LICAO_NAO_E_PEDALE",
    });
  });

  it("concluir a lição 3 sem a 2 responde 409 LICAO_BLOQUEADA citando a primeira que falta", async () => {
    const { cliente, operacoes } = bancoLicao("pedale", { ordem: 3, concluidas: [LICAO_1] });
    await expect(concluirLicao(cliente, PERFIL, LICAO, "pedale")).rejects.toMatchObject({
      status: 409,
      codigo: "LICAO_BLOQUEADA",
      message: 'Conclua antes a lição "Como a placa solar funciona".',
    });
    expect(operacoes.some((o) => o.tabela === "progresso_licoes" && usou(o, "upsert"))).toBe(false);
    expect(eventoDePontos(operacoes)).toBeUndefined();
  });

  it("sem nenhuma lição concluída, a mensagem cita a lição 1", async () => {
    await expect(concluirLicao(bancoLicao("texto", { ordem: 2 }).cliente, PERFIL, LICAO, "texto")).rejects.toMatchObject({
      status: 409,
      message: 'Conclua antes a lição "O sol de São Luís".',
    });
  });

  it("com as anteriores concluídas, a lição 3 é concluída e pontua", async () => {
    const { cliente } = bancoLicao("texto", { ordem: 3, concluidas: [LICAO_1, LICAO_2] });
    expect((await concluirLicao(cliente, PERFIL, LICAO, "texto")).pontosGanhos).toBe(PONTOS_POR_ORIGEM.licao_concluida);
  });

  it("quem já concluiu fora de ordem pode concluir de novo, sem pontos novos", async () => {
    const { cliente } = bancoLicao("texto", { ordem: 3, concluidas: [LICAO], pontosJaDados: true });
    expect(await concluirLicao(cliente, PERFIL, LICAO, "texto")).toMatchObject({ concluida: true, pontosGanhos: 0 });
  });

  it("lição inexistente responde 404", async () => {
    const { cliente } = supabaseFalso(() => ({ data: null }));
    await expect(concluirLicao(cliente, PERFIL, LICAO, "texto")).rejects.toMatchObject({
      status: 404,
      codigo: "LICAO_NAO_ENCONTRADA",
    });
  });
});

describe("registrarMissao", () => {
  function bancoMissao({ dias, novo }: { dias: number; novo: boolean }) {
    return supabaseFalso((op) => {
      if (op.tabela === "missoes" && usou(op, "maybeSingle")) return { data: { id: MISSAO, dias_necessarios: 3, pontos: 30 } };
      if (op.tabela === "missoes") return { data: [{ id: MISSAO, slug: "ar-desligado-antes-de-dormir" }] };
      if (op.tabela === "missoes_registros" && usou(op, "upsert")) return { data: novo ? [{ dia: "x" }] : [] };
      if (op.tabela === "missoes_registros") return { count: dias };
      if (op.tabela === "pontos_eventos" && usou(op, "upsert")) return { data: [{ pontos: 30 }] };
      if (op.tabela === "simulacoes") return { count: 0 };
      if (op.tabela === "perfis") return { data: { bairro_id: null } };
      return { data: [] };
    });
  }

  it("registra o dia no fuso de São Luís e não pontua antes de completar", async () => {
    const { cliente, operacoes } = bancoMissao({ dias: 1, novo: true });
    const r = await registrarMissao(cliente, PERFIL, MISSAO, new Date("2026-10-16T02:00:00Z"));
    expect(r).toMatchObject({ dia: "2026-10-15", novoRegistro: true, diasRegistrados: 1, concluida: false, pontosGanhos: 0 });
    expect(eventoDePontos(operacoes)).toBeUndefined();
    const registro = operacoes.find((o) => o.tabela === "missoes_registros" && usou(o, "upsert"))!;
    expect(usou(registro, "upsert")?.args).toEqual([
      { perfil_id: PERFIL, missao_id: MISSAO, dia: "2026-10-15" },
      { onConflict: "perfil_id,missao_id,dia", ignoreDuplicates: true },
    ]);
  });

  it("ao completar os dias necessários, pontua com os pontos da missão", async () => {
    const { cliente, operacoes } = bancoMissao({ dias: 3, novo: true });
    const r = await registrarMissao(cliente, PERFIL, MISSAO, new Date("2026-10-16T12:00:00Z"));
    expect(r).toMatchObject({ concluida: true, pontosGanhos: 30, diasNecessarios: 3 });
    expect(eventoDePontos(operacoes)).toMatchObject({ origem: "missao_concluida", referencia_id: MISSAO, pontos: 30 });
  });

  it("registrar duas vezes no mesmo dia não cria outro registro", async () => {
    const { cliente } = bancoMissao({ dias: 1, novo: false });
    expect((await registrarMissao(cliente, PERFIL, MISSAO, new Date())).novoRegistro).toBe(false);
  });
});

describe("listarMissoes", () => {
  const OUTRA = "88888888-8888-4888-8888-888888888888";

  function bancoLista(registros: { missao_id: string; dia: string }[]) {
    return supabaseFalso((op) => {
      if (op.tabela === "missoes") {
        return {
          data: [
            { id: MISSAO, slug: "ar-desligado-antes-de-dormir", titulo: "Ar", descricao: "d", pontos: 30, dias_necessarios: 3, trilha: { slug: "ar-condicionado-sem-susto" } },
            { id: OUTRA, slug: "missao-solta", titulo: "Solta", descricao: "d", pontos: 30, dias_necessarios: 1, trilha: null },
          ],
        };
      }
      if (op.tabela === "missoes_registros") return { data: registros };
      return { data: [] };
    });
  }

  it("traz a trilha da missão e os dias marcados em ordem", async () => {
    const { cliente, operacoes } = bancoLista([
      { missao_id: MISSAO, dia: "2026-10-16" },
      { missao_id: MISSAO, dia: "2026-10-14" },
      { missao_id: OUTRA, dia: "2026-10-15" },
    ]);
    const [ar, solta] = await listarMissoes(cliente, PERFIL, new Date("2026-10-16T15:00:00Z"));
    expect(ar).toMatchObject({
      trilhaSlug: "ar-condicionado-sem-susto",
      diasRegistrados: 2,
      diasMarcados: ["2026-10-14", "2026-10-16"],
      registradaHoje: true,
      concluida: false,
    });
    expect(solta).toMatchObject({ trilhaSlug: null, diasMarcados: ["2026-10-15"], registradaHoje: false, concluida: true });
    const select = usou(operacoes.find((o) => o.tabela === "missoes")!, "select")!.args[0] as string;
    expect(select).toContain("trilha:trilhas(slug)");
  });

  it("sem login, nenhum dia marcado e sem consultar registros", async () => {
    const { cliente, operacoes } = bancoLista([{ missao_id: MISSAO, dia: "2026-10-16" }]);
    const missoes = await listarMissoes(cliente, null, new Date("2026-10-16T15:00:00Z"));
    expect(missoes.every((m) => m.diasMarcados.length === 0 && !m.registradaHoje)).toBe(true);
    expect(operacoes.some((o) => o.tabela === "missoes_registros")).toBe(false);
  });
});
