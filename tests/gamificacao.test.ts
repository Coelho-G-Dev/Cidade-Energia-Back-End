import { describe, expect, it } from "vitest";
import {
  avaliarTentativa,
  conquistasMerecidas,
  diaEmSaoLuis,
  missaoCompleta,
  trilhasConcluidas,
  type RetratoUsuario,
} from "@/lib/gamificacao/regras";
import {
  MISSAO_AR_CONDICIONADO,
  MISSAO_DESCARTE,
  PONTOS_BAIRRO_UNIDO,
  TRILHA_CONTA_DE_LUZ,
  TRILHA_ENERGIA_SOLAR,
} from "@/lib/config";

const vazio: RetratoUsuario = { temSimulacao: false, trilhasConcluidas: [], missoesConcluidas: [], pontosBairro: 0 };

describe("conquistasMerecidas", () => {
  it("usuário novo não tem conquistas", () => {
    expect(conquistasMerecidas(vazio)).toEqual([]);
  });

  it("cada critério libera a sua conquista", () => {
    expect(conquistasMerecidas({ ...vazio, temSimulacao: true })).toEqual(["primeira_simulacao"]);
    expect(conquistasMerecidas({ ...vazio, trilhasConcluidas: [TRILHA_ENERGIA_SOLAR] })).toEqual(["amigo_do_sol"]);
    expect(conquistasMerecidas({ ...vazio, trilhasConcluidas: [TRILHA_CONTA_DE_LUZ] })).toEqual(["conta_decifrada"]);
    expect(conquistasMerecidas({ ...vazio, missoesConcluidas: [MISSAO_AR_CONDICIONADO] })).toEqual(["noites_frescas"]);
    expect(conquistasMerecidas({ ...vazio, missoesConcluidas: [MISSAO_DESCARTE] })).toEqual(["descarte_certo"]);
    expect(conquistasMerecidas({ ...vazio, pontosBairro: PONTOS_BAIRRO_UNIDO })).toEqual(["bairro_unido"]);
  });

  it("bairro unido exige atingir a meta de pontos", () => {
    expect(conquistasMerecidas({ ...vazio, pontosBairro: PONTOS_BAIRRO_UNIDO - 1 })).toEqual([]);
  });

  it("outras trilhas e missões não liberam conquistas", () => {
    expect(conquistasMerecidas({ ...vazio, trilhasConcluidas: ["outra"], missoesConcluidas: ["outra"] })).toEqual([]);
  });
});

describe("trilhasConcluidas", () => {
  const licoes = [
    { licaoId: "a1", trilhaSlug: "a" },
    { licaoId: "a2", trilhaSlug: "a" },
    { licaoId: "b1", trilhaSlug: "b" },
  ];

  it("trilha só conta quando todas as lições foram concluídas", () => {
    expect(trilhasConcluidas(licoes, new Set(["a1", "b1"]))).toEqual(["b"]);
    expect(trilhasConcluidas(licoes, new Set(["a1", "a2", "b1"]))).toEqual(["a", "b"]);
    expect(trilhasConcluidas(licoes, new Set())).toEqual([]);
  });
});

describe("avaliarTentativa", () => {
  const agora = new Date("2026-10-16T12:00:00Z");
  const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000);

  it("a primeira tentativa pontua", () => {
    expect(avaliarTentativa(null, agora)).toEqual({ pontuavel: true, proximaTentativaEm: null });
  });

  it("depois de acertar, nunca mais pontua", () => {
    expect(avaliarTentativa({ correta: true, tentativaEm: horasAtras(100) }, agora)).toEqual({
      pontuavel: false,
      proximaTentativaEm: null,
    });
  });

  it("depois de errar, só volta a pontuar 24 h depois", () => {
    const decisao = avaliarTentativa({ correta: false, tentativaEm: horasAtras(23) }, agora);
    expect(decisao.pontuavel).toBe(false);
    expect(decisao.proximaTentativaEm).toEqual(new Date("2026-10-16T13:00:00Z"));
  });

  it("com exatamente 24 h a nova tentativa já pontua", () => {
    expect(avaliarTentativa({ correta: false, tentativaEm: horasAtras(24) }, agora).pontuavel).toBe(true);
  });
});

describe("diaEmSaoLuis", () => {
  it("usa o fuso de São Luís (UTC-3)", () => {
    expect(diaEmSaoLuis(new Date("2026-10-16T02:59:00Z"))).toBe("2026-10-15");
    expect(diaEmSaoLuis(new Date("2026-10-16T03:00:00Z"))).toBe("2026-10-16");
  });
});

describe("missaoCompleta", () => {
  it("completa ao atingir os dias necessários", () => {
    expect(missaoCompleta(2, 3)).toBe(false);
    expect(missaoCompleta(3, 3)).toBe(true);
  });
});
