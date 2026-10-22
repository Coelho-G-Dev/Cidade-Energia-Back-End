import { describe, expect, it, vi } from "vitest";
import { PONTOS_POR_ORIGEM } from "@/lib/config";
import { avaliarConquistas, concederPontos } from "@/lib/dados/pontos";
import { supabaseFalso, usou } from "./apoio/supabase-falso";

const PERFIL = "11111111-1111-4111-8111-111111111111";
const LICAO = "22222222-2222-4222-8222-222222222222";
const MISSAO = "33333333-3333-4333-8333-333333333333";

describe("concederPontos", () => {
  it("insere o evento com os pontos do config e ignora duplicados", async () => {
    const { cliente, operacoes } = supabaseFalso(() => ({ data: [{ pontos: PONTOS_POR_ORIGEM.licao_concluida }] }));
    expect(await concederPontos(cliente, PERFIL, "licao_concluida", LICAO)).toBe(PONTOS_POR_ORIGEM.licao_concluida);

    const upsert = usou(operacoes[0]!, "upsert");
    expect(operacoes[0]!.tabela).toBe("pontos_eventos");
    expect(upsert?.args).toEqual([
      { perfil_id: PERFIL, origem: "licao_concluida", referencia_id: LICAO, pontos: PONTOS_POR_ORIGEM.licao_concluida },
      { onConflict: "perfil_id,origem,referencia_id", ignoreDuplicates: true },
    ]);
  });

  it("repetir a mesma ação devolve 0 pontos", async () => {
    const { cliente } = supabaseFalso(() => ({ data: [] }));
    expect(await concederPontos(cliente, PERFIL, "licao_concluida", LICAO)).toBe(0);
  });

  it("missão usa os pontos cadastrados na missão, nunca do cliente", async () => {
    const { cliente, operacoes } = supabaseFalso((op) =>
      op.tabela === "missoes" ? { data: { pontos: 30 } } : { data: [{ pontos: 30 }] },
    );
    expect(await concederPontos(cliente, PERFIL, "missao_concluida", MISSAO)).toBe(30);
    expect((usou(operacoes[1]!, "upsert")?.args[0] as { pontos: number }).pontos).toBe(30);
  });

  it("missão inexistente responde 404", async () => {
    const { cliente } = supabaseFalso(() => ({ data: null }));
    await expect(concederPontos(cliente, PERFIL, "missao_concluida", MISSAO)).rejects.toMatchObject({
      status: 404,
      codigo: "MISSAO_NAO_ENCONTRADA",
    });
  });
});

describe("avaliarConquistas", () => {
  const catalogo = [
    { slug: "primeira_simulacao", nome: "Primeira simulação" },
    { slug: "bairro_unido", nome: "Bairro unido" },
  ];

  const BAIRRO = "44444444-4444-4444-8444-444444444444";

  function banco(conquistasInseridas: { conquista_slug: string }[], { bairroId = null as string | null, pontosBairro = 0 } = {}) {
    return supabaseFalso((op) => {
      switch (op.tabela) {
        case "simulacoes":
          return { count: 1 };
        case "perfis":
          return { data: { bairro_id: bairroId } };
        case "ranking_bairros":
          return { data: { pontos: pontosBairro } };
        case "rpc:conceder_bairro_unido":
          return { data: 3 };
        case "conquistas":
          return { data: catalogo };
        case "conquistas_usuario":
          return { data: conquistasInseridas };
        default:
          return { data: [] };
      }
    });
  }

  it("grava as conquistas merecidas e devolve só as novas, com o nome", async () => {
    const { cliente, operacoes } = banco([{ conquista_slug: "primeira_simulacao" }]);
    expect(await avaliarConquistas(cliente, PERFIL)).toEqual([{ slug: "primeira_simulacao", nome: "Primeira simulação" }]);
    const insercao = operacoes.find((o) => o.tabela === "conquistas_usuario")!;
    expect(usou(insercao, "upsert")?.args).toEqual([
      [{ perfil_id: PERFIL, conquista_slug: "primeira_simulacao" }],
      { onConflict: "perfil_id,conquista_slug", ignoreDuplicates: true },
    ]);
  });

  it("conquista já obtida não aparece de novo", async () => {
    const { cliente } = banco([]);
    expect(await avaliarConquistas(cliente, PERFIL)).toEqual([]);
  });

  it("bairro na meta: o estudante ganha o Bairro unido e o resto do bairro também, depois da gravação dele", async () => {
    const { cliente, operacoes } = banco([{ conquista_slug: "primeira_simulacao" }, { conquista_slug: "bairro_unido" }], {
      bairroId: BAIRRO,
      pontosBairro: 500,
    });

    const novas = await avaliarConquistas(cliente, PERFIL);

    expect(novas).toContainEqual({ slug: "bairro_unido", nome: "Bairro unido" });
    const rpc = operacoes.findIndex((o) => o.tabela === "rpc:conceder_bairro_unido");
    const propria = operacoes.findIndex((o) => o.tabela === "conquistas_usuario");
    expect(rpc).toBeGreaterThan(propria);
    expect(operacoes[rpc]!.chamadas[0]!.args[0]).toEqual({ p_bairro: BAIRRO, p_pontos_minimos: 500 });
  });

  it("bairro abaixo da meta não chama a concessão para o bairro", async () => {
    const { cliente, operacoes } = banco([{ conquista_slug: "primeira_simulacao" }], { bairroId: BAIRRO, pontosBairro: 499 });
    await avaliarConquistas(cliente, PERFIL);
    expect(operacoes.some((o) => o.tabela === "rpc:conceder_bairro_unido")).toBe(false);
  });

  it("se a concessão para o bairro falhar, o estudante ainda recebe as conquistas dele", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { cliente } = supabaseFalso((op) => {
      if (op.tabela === "rpc:conceder_bairro_unido") return { error: { message: "falhou" } };
      if (op.tabela === "perfis") return { data: { bairro_id: BAIRRO } };
      if (op.tabela === "ranking_bairros") return { data: { pontos: 600 } };
      if (op.tabela === "conquistas") return { data: catalogo };
      if (op.tabela === "conquistas_usuario") return { data: [{ conquista_slug: "bairro_unido" }] };
      if (op.tabela === "simulacoes") return { count: 1 };
      return { data: [] };
    });
    expect(await avaliarConquistas(cliente, PERFIL)).toContainEqual({ slug: "bairro_unido", nome: "Bairro unido" });
    expect(JSON.stringify(erro.mock.calls)).not.toContain(PERFIL);
    erro.mockRestore();
  });
});
