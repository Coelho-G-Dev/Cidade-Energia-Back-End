export const COMO_CALCULAMOS_POTENCIAL_HABITOS =
  "Estimativa do que as famílias poderiam economizar por mês seguindo as dicas; não é economia medida. " +
  "Somamos a economia com hábitos da última simulação salva de cada estudante no período. " +
  "Para kWh, dividimos os reais pela tarifa daquela simulação antes de somar. Não somamos economia das missões.";

export type TotaisPotencialHabitos = { reaisMes: number | null; kwhMes: number | null; estudantes: number | null };
type SimulacaoImpacto = {
  estudante: string; simulacaoId: string; criadoEm: string;
  economiaHabitosMensal: number; tarifa: number;
};
const arredondar = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function resumirPotencialHabitos(totais: TotaisPotencialHabitos) {
  return {
    potencialHabitos: {
      kwhMes: totais.kwhMes === null ? null : arredondar(totais.kwhMes),
      reaisMes: totais.reaisMes === null ? null : arredondar(totais.reaisMes),
      estudantes: totais.estudantes,
    },
    comoCalculamos: { potencialHabitos: COMO_CALCULAMOS_POTENCIAL_HABITOS },
  };
}

/** Referência pura da regra. A API recebe apenas totais já agregados e ocultados
 * pelo SQL, nunca estas linhas individuais (D-001). */
export function calcularPotencialHabitos(simulacoes: readonly SimulacaoImpacto[]) {
  const ultimas = new Map<string, SimulacaoImpacto>();
  for (const s of simulacoes) {
    if (!Number.isFinite(Date.parse(s.criadoEm)) || !Number.isFinite(s.tarifa) || s.tarifa <= 0
      || !Number.isFinite(s.economiaHabitosMensal) || s.economiaHabitosMensal < 0) {
      throw new RangeError("Simulação inválida para calcular o potencial de hábitos.");
    }
    const anterior = ultimas.get(s.estudante);
    if (!anterior || Date.parse(s.criadoEm) > Date.parse(anterior.criadoEm)
      || (Date.parse(s.criadoEm) === Date.parse(anterior.criadoEm) && s.simulacaoId > anterior.simulacaoId)) {
      ultimas.set(s.estudante, s);
    }
  }
  let reaisMes = 0; let kwhMes = 0;
  for (const s of ultimas.values()) {
    reaisMes += s.economiaHabitosMensal;
    kwhMes += s.economiaHabitosMensal / s.tarifa;
  }
  return resumirPotencialHabitos({ reaisMes, kwhMes, estudantes: ultimas.size });
}
