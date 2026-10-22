import { describe, expect, it } from "vitest";
import {
  conquistasMerecidas,
  diaEmSaoLuis,
  licaoPendenteAntes,
  missaoCompleta,
  tentativaPontuavel,
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

describe("tentativaPontuavel", () => {
  it("só a primeira tentativa pontua", () => {
    expect(tentativaPontuavel(null)).toBe(true);
  });

  it("depois de errar ou de acertar, as tentativas seguintes são treino", () => {
    expect(tentativaPontuavel({ correta: false })).toBe(false);
    expect(tentativaPontuavel({ correta: true })).toBe(false);
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

describe("licaoPendenteAntes", () => {
  const trilha = [
    { id: "l3", ordem: 3, titulo: "Pedale e veja" },
    { id: "l1", ordem: 1, titulo: "O sol de São Luís" },
    { id: "l2", ordem: 2, titulo: "Como a placa solar funciona" },
  ];
  const licao = (ordem: number) => trilha.find((l) => l.ordem === ordem)!;

  it("a primeira lição está sempre liberada", () => {
    expect(licaoPendenteAntes(trilha, licao(1), new Set())).toBeNull();
  });

  it("aponta a primeira lição anterior não concluída, pela ordem", () => {
    expect(licaoPendenteAntes(trilha, licao(3), new Set())).toEqual({ id: "l1", titulo: "O sol de São Luís" });
    expect(licaoPendenteAntes(trilha, licao(3), new Set(["l1"]))).toEqual({ id: "l2", titulo: "Como a placa solar funciona" });
  });

  it("libera quando todas as anteriores estão concluídas", () => {
    expect(licaoPendenteAntes(trilha, licao(3), new Set(["l1", "l2"]))).toBeNull();
  });

  it("lição já concluída fora de ordem continua liberada", () => {
    expect(licaoPendenteAntes(trilha, licao(3), new Set(["l3"]))).toBeNull();
  });
});
