import {
  CUSTO_SISTEMA_POR_KWP,
  DIAS_POR_MES,
  FATOR_EMISSAO_KG_CO2_KWH,
  FATOR_PERDAS,
  IRRADIACAO_MEDIA_SAO_LUIS,
  PERCENTUAL_ECONOMIA_PADRAO,
  POTENCIA_PLACA_KWP,
  REGRAS_ECONOMIA,
  TARIFA_PADRAO_R_KWH,
  type RegraEconomia,
} from "@/lib/config";

export type ItemAparelho = {
  codigo: string;
  nome: string;
  potenciaW: number;
  quantidade: number;
  horasDia: number;
};

export type EntradaSimulacao =
  | { modo: "conta"; consumoKwh: number; valorConta?: number }
  | { modo: "aparelhos"; itens: ItemAparelho[] };

export type Peso = { aparelho: string; percentual: number };

export type ComoCalculamos = {
  economiaHabitos: string;
  economiaSolar: string;
  custoSistemaSolar: string;
  retornoSolar: string;
};

export type ResultadoSimulacao = {
  consumoKwh: number;
  gastoMensal: number;
  economiaHabitosMensal: number;
  economiaSolarMensal: number;
  kwhGeradoMes: number;
  custoSistemaSolar: number;
  retornoSolarAnos: number;
  placas: number;
  co2EvitadoKgAno: number;
  pesos: Peso[];
  comoCalculamos: ComoCalculamos;
};

export type Parametros = {
  tarifaPadrao: number;
  potenciaPlacaKwp: number;
  custoPorKwp: number;
  fatorPerdas: number;
  irradiacao: number;
  fatorEmissao: number;
  percentualEconomiaPadrao: number;
  regrasEconomia: Readonly<Record<string, RegraEconomia>>;
};

export const PARAMETROS_PADRAO: Parametros = {
  tarifaPadrao: TARIFA_PADRAO_R_KWH,
  potenciaPlacaKwp: POTENCIA_PLACA_KWP,
  custoPorKwp: CUSTO_SISTEMA_POR_KWP,
  fatorPerdas: FATOR_PERDAS,
  irradiacao: IRRADIACAO_MEDIA_SAO_LUIS,
  fatorEmissao: FATOR_EMISSAO_KG_CO2_KWH,
  percentualEconomiaPadrao: PERCENTUAL_ECONOMIA_PADRAO,
  regrasEconomia: REGRAS_ECONOMIA,
};

const TOLERANCIA_PONTO_FLUTUANTE = 1e-9;
const DECIMOS_EM_100_POR_CENTO = 1000;

export class ErroCalculo extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroCalculo";
  }
}

export function arredondar(valor: number, casas: number): number {
  if (String(valor).includes("e")) return Math.round(valor * 10 ** casas) / 10 ** casas;
  const deslocado = Math.round(Number(`${valor}e${casas}`));
  return Number(`${deslocado}e-${casas}`);
}

function exigirPositivo(valor: number, nome: string): void {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new ErroCalculo(`${nome} deve ser um número maior que zero.`);
  }
}

function validarItem(item: ItemAparelho): void {
  exigirPositivo(item.potenciaW, `Potência de ${item.nome}`);
  if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
    throw new ErroCalculo(`Quantidade de ${item.nome} deve ser um inteiro maior ou igual a 1.`);
  }
  if (!Number.isFinite(item.horasDia) || item.horasDia <= 0 || item.horasDia > 24) {
    throw new ErroCalculo(`Horas por dia de ${item.nome} devem estar entre 0 e 24.`);
  }
}

export function consumoAparelhoKwhMes(potenciaW: number, horasDia: number, quantidade: number): number {
  return (potenciaW * horasDia * DIAS_POR_MES * quantidade) / 1000;
}

export function tarifaEfetiva(consumoKwh: number, valorConta: number | undefined, tarifaPadrao: number): number {
  return valorConta === undefined ? tarifaPadrao : valorConta / consumoKwh;
}

export function calcularPesos(consumos: { aparelho: string; kwh: number }[]): Peso[] {
  const total = consumos.reduce((soma, c) => soma + c.kwh, 0);
  if (total <= 0) return [];

  const brutos = consumos.map((c) => (c.kwh / total) * DECIMOS_EM_100_POR_CENTO);
  const base = brutos.map(Math.floor);
  let faltam = DECIMOS_EM_100_POR_CENTO - base.reduce((a, b) => a + b, 0);

  const porResto = brutos
    .map((b, i) => ({ i, resto: b - Math.floor(b) }))
    .sort((a, b) => b.resto - a.resto);
  for (const { i } of porResto) {
    if (faltam <= 0) break;
    base[i] = (base[i] ?? 0) + 1;
    faltam--;
  }

  return consumos
    .map((c, i) => ({ aparelho: c.aparelho, percentual: (base[i] ?? 0) / 10 }))
    .sort((a, b) => b.percentual - a.percentual);
}

export function economiaKwhPorRegras(
  itens: ItemAparelho[],
  regras: Parametros["regrasEconomia"],
): number {
  return itens.reduce((soma, item) => {
    const regra = regras[item.codigo];
    if (!regra) return soma;
    if ("reducaoPercentual" in regra) {
      return soma + consumoAparelhoKwhMes(item.potenciaW, item.horasDia, item.quantidade) * regra.reducaoPercentual;
    }
    const horasReduzidas = Math.min(regra.reducaoHorasDia, item.horasDia);
    return soma + consumoAparelhoKwhMes(item.potenciaW, horasReduzidas, item.quantidade);
  }, 0);
}

export function geracaoDiariaPorPlaca(irradiacao: number, potenciaPlacaKwp: number, fatorPerdas: number): number {
  return irradiacao * potenciaPlacaKwp * fatorPerdas;
}

export function placasNecessarias(consumoKwhMes: number, geracaoDiariaPlaca: number): number {
  exigirPositivo(geracaoDiariaPlaca, "Geração por placa");
  const razao = consumoKwhMes / (geracaoDiariaPlaca * DIAS_POR_MES);
  return Math.max(1, Math.ceil(razao - TOLERANCIA_PONTO_FLUTUANTE));
}

export function retornoAnos(custoSistema: number, economiaMensal: number): number {
  exigirPositivo(economiaMensal, "Economia mensal");
  return custoSistema / (economiaMensal * 12);
}

export function co2EvitadoKgAno(kwhGeradoMes: number, fatorEmissao: number): number {
  return kwhGeradoMes * 12 * fatorEmissao;
}

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = (valor: number, casas = 1) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
const minusculaInicial = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);
const lista = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });
const porKwh = (tarifa: number) => `R$ ${numero(tarifa, 4)} por kWh`;

type Habitos =
  | { modo: "conta"; percentual: number; gastoMensal: number }
  | { modo: "aparelhos"; dicas: string[]; kwhEconomizados: number; tarifa: number };

type Valores = {
  habitos: Habitos;
  placas: number;
  kwhGeradoMes: number;
  consumoKwh: number;
  tarifa: number;
  custoSistema: number;
  economiaSolarMensal: number;
  retornoSolarAnos: number;
};

export function explicarCalculo(v: Valores, p: Parametros = PARAMETROS_PADRAO): ComoCalculamos {
  const h = v.habitos;
  const economiaHabitos =
    h.modo === "conta"
      ? `Meta de ${numero(h.percentual * 100)}% da conta com mudança de hábitos, sem investimento: ${reais.format(h.gastoMensal)} × ${numero(h.percentual * 100)}%.`
      : h.dicas.length === 0
        ? "Nenhum aparelho da lista tem uma dica de hábito no simulador, então esta economia fica em zero."
        : `Mudança de hábitos, sem investimento: ${lista.format(h.dicas.map(minusculaInicial))}. São ${numero(h.kwhEconomizados)} kWh a menos por mês × ${porKwh(h.tarifa)}.`;

  const porPlaca = v.kwhGeradoMes / v.placas;
  const total = v.placas === 1 ? "" : ` ${v.placas} placas geram ${numero(v.kwhGeradoMes)} kWh.`;
  return {
    economiaHabitos,
    economiaSolar:
      `Cada placa de ${numero(p.potenciaPlacaKwp * 1000, 0)} W gera cerca de ${numero(porPlaca)} kWh por mês com o sol de São Luís ` +
      `(${numero(p.irradiacao, 2)} kWh/m² por dia × ${numero(p.potenciaPlacaKwp, 2)} kWp × ${numero(p.fatorPerdas, 2)} × ${DIAS_POR_MES} dias).` +
      `${total} A economia é a energia gerada, até o seu consumo de ${numero(v.consumoKwh)} kWh, × ${porKwh(v.tarifa)}.` +
      " A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
    custoSistemaSolar:
      `${v.placas} × ${numero(p.potenciaPlacaKwp, 2)} kWp × ${reais.format(p.custoPorKwp)} por kWp instalado = ` +
      `${reais.format(v.custoSistema)} (preço médio de mercado, estimativa).`,
    retornoSolar:
      `${reais.format(v.custoSistema)} ÷ (${reais.format(v.economiaSolarMensal)} × 12 meses) = ${numero(v.retornoSolarAnos)} anos. ` +
      "Usa a economia com energia solar, não a de hábitos.",
  };
}

export function simular(entrada: EntradaSimulacao, p: Parametros = PARAMETROS_PADRAO): ResultadoSimulacao {
  let consumoKwh: number;
  let tarifa: number;
  let gastoMensal: number;
  let economiaHabitosMensal: number;
  let habitos: Habitos;
  let pesos: Peso[];

  if (entrada.modo === "conta") {
    exigirPositivo(entrada.consumoKwh, "Consumo (kWh)");
    if (entrada.valorConta !== undefined) exigirPositivo(entrada.valorConta, "Valor da conta");

    consumoKwh = entrada.consumoKwh;
    tarifa = tarifaEfetiva(consumoKwh, entrada.valorConta, p.tarifaPadrao);
    gastoMensal = entrada.valorConta ?? consumoKwh * tarifa;
    economiaHabitosMensal = gastoMensal * p.percentualEconomiaPadrao;
    habitos = { modo: "conta", percentual: p.percentualEconomiaPadrao, gastoMensal };
    pesos = [];
  } else {
    if (entrada.itens.length === 0) throw new ErroCalculo("Informe pelo menos um aparelho.");
    entrada.itens.forEach(validarItem);

    const consumos = entrada.itens.map((item) => ({
      aparelho: item.nome,
      kwh: consumoAparelhoKwhMes(item.potenciaW, item.horasDia, item.quantidade),
    }));
    consumoKwh = consumos.reduce((soma, c) => soma + c.kwh, 0);
    tarifa = p.tarifaPadrao;
    gastoMensal = consumoKwh * tarifa;
    const kwhEconomizados = economiaKwhPorRegras(entrada.itens, p.regrasEconomia);
    economiaHabitosMensal = kwhEconomizados * tarifa;
    const dicas = [...new Set(entrada.itens.flatMap((i) => p.regrasEconomia[i.codigo]?.dica ?? []))];
    habitos = { modo: "aparelhos", dicas, kwhEconomizados, tarifa };
    pesos = calcularPesos(consumos);
  }

  const geracaoPlacaDia = geracaoDiariaPorPlaca(p.irradiacao, p.potenciaPlacaKwp, p.fatorPerdas);
  const placas = placasNecessarias(consumoKwh, geracaoPlacaDia);
  const kwhGeradoMes = placas * geracaoPlacaDia * DIAS_POR_MES;
  const custoSistema = placas * p.potenciaPlacaKwp * p.custoPorKwp;
  const economiaSolarMensal = Math.min(kwhGeradoMes, consumoKwh) * tarifa;
  const retornoSolarAnos = arredondar(retornoAnos(custoSistema, economiaSolarMensal), 1);
  const habitosArredondado = arredondar(economiaHabitosMensal, 2);

  return {
    consumoKwh: arredondar(consumoKwh, 1),
    gastoMensal: arredondar(gastoMensal, 2),
    economiaHabitosMensal: habitosArredondado,
    economiaSolarMensal: arredondar(economiaSolarMensal, 2),
    kwhGeradoMes: arredondar(kwhGeradoMes, 1),
    custoSistemaSolar: arredondar(custoSistema, 2),
    retornoSolarAnos,
    placas,
    co2EvitadoKgAno: arredondar(co2EvitadoKgAno(kwhGeradoMes, p.fatorEmissao), 1),
    pesos,
    comoCalculamos: explicarCalculo(
      { habitos, placas, kwhGeradoMes, consumoKwh, tarifa, custoSistema, economiaSolarMensal, retornoSolarAnos },
      p,
    ),
  };
}
