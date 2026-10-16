import { describe, expect, it } from "vitest";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { registrarMissao } from "@/lib/dados/missoes";
import { concluirLicao } from "@/lib/dados/trilhas";
import { supabaseFalso, usou, type Operacao } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const LICAO = "22222222-2222-4222-8222-222222222222";
const MISSAO = "33333333-3333-4333-8333-333333333333";

const eventoDePontos = (ops: Operacao[]) =>
  ops.find((o) => o.tabela === "pontos_eventos" && usou(o, "upsert"))?.chamadas.find((c) => c.metodo === "upsert")?.args[0];

function bancoLicao(tipo: "texto" | "pedale", pontosJaDados = false) {
  return supabaseFalso((op) => {
    if (op.tabela === "licoes" && usou(op, "maybeSingle")) return { data: { id: LICAO, tipo } };
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
    const progresso = operacoes.find((o) => o.tabela === "progresso_licoes")!;
    expect(usou(progresso, "upsert")?.args[1]).toEqual({ onConflict: "perfil_id,licao_id", ignoreDuplicates: true });
  });

  it("concluir de novo não duplica os pontos", async () => {
    const { cliente } = bancoLicao("texto", true);
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
