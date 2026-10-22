import { arredondar, ErroCalculo, geracaoDiariaPorPlaca, PARAMETROS_PADRAO, type Parametros } from "@/lib/calculos/simulador";
import { diaEmSaoLuis } from "@/lib/gamificacao/regras";

export type CalculoSolDeHoje = {
  kwhPorPlaca: number;
  horasArCondicionado: number;
  co2EvitadoKg: number;
};

type ParametrosSol = Pick<Parametros, "potenciaPlacaKwp" | "fatorPerdas" | "fatorEmissao">;

export function calcularSolDeHoje(
  irradiacao: number,
  potenciaArW: number,
  p: ParametrosSol = PARAMETROS_PADRAO,
): CalculoSolDeHoje {
  if (!Number.isFinite(irradiacao) || irradiacao < 0) throw new ErroCalculo("Irradiação deve ser um número maior ou igual a zero.");
  if (!Number.isFinite(potenciaArW) || potenciaArW <= 0) throw new ErroCalculo("Potência do ar-condicionado deve ser maior que zero.");

  const kwhPorPlaca = geracaoDiariaPorPlaca(irradiacao, p.potenciaPlacaKwp, p.fatorPerdas);
  return {
    kwhPorPlaca: arredondar(kwhPorPlaca, 2),
    horasArCondicionado: arredondar(kwhPorPlaca / (potenciaArW / 1000), 1),
    co2EvitadoKg: arredondar(kwhPorPlaca * p.fatorEmissao, 3),
  };
}

const MS_POR_DIA = 86_400_000;

export function diasDeAtraso(data: string | null, agora: Date): number | null {
  if (data === null) return null;
  const dias = Math.round((Date.parse(`${diaEmSaoLuis(agora)}T00:00:00Z`) - Date.parse(`${data}T00:00:00Z`)) / MS_POR_DIA);
  return Math.max(0, dias);
}
