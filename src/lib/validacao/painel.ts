import { z } from "zod";

const contagem = z.number().int().nonnegative().nullable();
const percentual = z.number().min(0).max(100).nullable();
const diagnosticoTrilha = z.object({ slug: z.string(), titulo: z.string(), estudantes: contagem, acertoMedioAntes: percentual, acertoMedioDepois: percentual }).strict();
const diagnosticoGeral = z.object({ estudantes: contagem, acertoMedioAntes: percentual, acertoMedioDepois: percentual, porTrilha: z.array(diagnosticoTrilha) }).strict();
export const codigoProfessorSchema = z.string().trim().toUpperCase().regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
export const consultaProfessorSchema = z.object({}).strict();
const escola = z.object({ nome: z.string(), bairro: z.string(), codigoEstudante: z.string() }).strict();
const progresso = z.object({
  licoesConcluidas: contagem,
  mediaLicoesPorEstudante: z.number().nonnegative().nullable(),
  trilhas: z.array(z.object({
    slug: z.string(), titulo: z.string(), totalLicoes: z.number().int().nonnegative(),
    estudantesQueComecaram: contagem, estudantesQueConcluiram: contagem,
  }).strict()),
}).strict();
const quiz = z.object({
  respostas: contagem, percentualAcertos: percentual,
  perguntasMaisErradas: z.array(z.object({
    perguntaId: z.uuid(), enunciado: z.string(), licaoTitulo: z.string(),
    respostas: z.number().int().min(5), percentualAcertos: z.number().min(0).max(100),
  }).strict()).max(5),
}).strict();
const missoes = z.array(z.object({
  slug: z.string(), titulo: z.string(), estudantesQueComecaram: contagem,
  estudantesQueConcluiram: contagem, diasRegistrados: contagem,
}).strict());
const comum = { escola, atualizadoEm: z.iso.datetime(), dadosAte: z.iso.date() };
export const painelProfessorSchema = z.discriminatedUnion("oculto", [
  z.object({ ...comum, oculto: z.literal(true), estudantes: z.null(), progresso: z.null(), quiz: z.null(), diagnostico: z.null(), missoes: z.null(), simulacoes: z.null() }).strict(),
  z.object({ ...comum, oculto: z.literal(false), estudantes: z.number().int().min(3), progresso, quiz, diagnostico: z.array(diagnosticoTrilha), missoes,
    simulacoes: z.object({ estudantesQueSimularam: contagem }).strict(),
  }).strict(),
]);
export type PainelProfessor = z.infer<typeof painelProfessorSchema>;

export const consultaImpactoSchema = z.object({ de: z.iso.date().optional(), ate: z.iso.date().optional() }).strict();
export const consultaExportarSchema = consultaImpactoSchema.extend({ formato: z.literal("csv").optional() });
const periodoSchema = z.object({ de: z.iso.date(), ate: z.iso.date() }).strict();
export const impactoSchema = z.object({
  periodo: periodoSchema,
  estudantes: z.object({ comPerfil: contagem, ativosNoPeriodo: contagem, verificadosPorTurma: contagem }).strict(),
  escolas: z.object({ comEstudantes: contagem, comTurma: contagem }).strict(),
  bairros: z.object({ comEstudantes: contagem }).strict(),
  aprendizado: z.object({ licoesConcluidas: contagem, trilhasConcluidas: contagem, respostasDoQuiz: contagem, percentualAcertos: percentual, diagnostico: diagnosticoGeral }).strict(),
  missoes: z.object({ registros: contagem, concluidas: contagem }).strict(),
  simulacoes: z.object({ salvas: contagem, estudantesQueSimularam: contagem }).strict(),
  energinho: z.object({ respostasAvaliadas: contagem, percentualUtil: percentual }).strict(),
  economiaEstimada: z.object({
    potencialHabitos: z.object({ kwhMes: z.number().nonnegative().nullable(), reaisMes: z.number().nonnegative().nullable(), estudantes: contagem }).strict(),
    comoCalculamos: z.object({ potencialHabitos: z.string() }).strict(),
  }).strict(),
  estimativa: z.literal(true), atualizadoEm: z.iso.datetime(),
}).strict();
export type Impacto = z.infer<typeof impactoSchema>;
