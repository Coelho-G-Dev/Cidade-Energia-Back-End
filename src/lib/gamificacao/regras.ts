import {
  FUSO_SAO_LUIS,
  MISSAO_AR_CONDICIONADO,
  MISSAO_DESCARTE,
  PONTOS_BAIRRO_UNIDO,
  TRILHA_CONTA_DE_LUZ,
  TRILHA_ENERGIA_SOLAR,
} from "@/lib/config";

export const ORIGENS = [
  "primeira_simulacao",
  "licao_concluida",
  "resposta_correta",
  "pedale_concluido",
  "missao_concluida",
] as const;
export type Origem = (typeof ORIGENS)[number];

export const CONQUISTAS = [
  "primeira_simulacao",
  "amigo_do_sol",
  "conta_decifrada",
  "noites_frescas",
  "descarte_certo",
  "bairro_unido",
] as const;
export type SlugConquista = (typeof CONQUISTAS)[number];

export type RetratoUsuario = {
  temSimulacao: boolean;
  trilhasConcluidas: readonly string[];
  missoesConcluidas: readonly string[];
  pontosBairro: number;
};

export function conquistasMerecidas(r: RetratoUsuario): SlugConquista[] {
  const regras: Record<SlugConquista, boolean> = {
    primeira_simulacao: r.temSimulacao,
    amigo_do_sol: r.trilhasConcluidas.includes(TRILHA_ENERGIA_SOLAR),
    conta_decifrada: r.trilhasConcluidas.includes(TRILHA_CONTA_DE_LUZ),
    noites_frescas: r.missoesConcluidas.includes(MISSAO_AR_CONDICIONADO),
    descarte_certo: r.missoesConcluidas.includes(MISSAO_DESCARTE),
    bairro_unido: r.pontosBairro >= PONTOS_BAIRRO_UNIDO,
  };
  return CONQUISTAS.filter((slug) => regras[slug]);
}

export type LicaoDaTrilha = { licaoId: string; trilhaSlug: string };

export function trilhasConcluidas(licoes: readonly LicaoDaTrilha[], concluidas: ReadonlySet<string>): string[] {
  const pendentesPorTrilha = new Map<string, number>();
  for (const { licaoId, trilhaSlug } of licoes) {
    const pendentes = pendentesPorTrilha.get(trilhaSlug) ?? 0;
    pendentesPorTrilha.set(trilhaSlug, pendentes + (concluidas.has(licaoId) ? 0 : 1));
  }
  return [...pendentesPorTrilha].filter(([, pendentes]) => pendentes === 0).map(([slug]) => slug);
}

export type LicaoEmOrdem = { id: string; ordem: number; titulo: string };
export type LicaoPendente = { id: string; titulo: string };

export function licaoPendenteAntes(
  licoesDaTrilha: readonly LicaoEmOrdem[],
  licao: { id: string; ordem: number },
  concluidas: ReadonlySet<string>,
): LicaoPendente | null {
  if (concluidas.has(licao.id)) return null;
  const pendente = [...licoesDaTrilha]
    .sort((a, b) => a.ordem - b.ordem)
    .find((l) => l.ordem < licao.ordem && !concluidas.has(l.id));
  return pendente ? { id: pendente.id, titulo: pendente.titulo } : null;
}

export type RespostaAnterior = { correta: boolean } | null;

export function tentativaPontuavel(anterior: RespostaAnterior): boolean {
  return anterior === null;
}

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_SAO_LUIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function diaEmSaoLuis(agora: Date): string {
  const partes = Object.fromEntries(formatoDia.formatToParts(agora).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export function missaoCompleta(diasRegistrados: number, diasNecessarios: number): boolean {
  return diasRegistrados >= diasNecessarios;
}
