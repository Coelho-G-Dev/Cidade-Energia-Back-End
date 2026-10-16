import { z } from "zod";

export const idSchema = z.uuid("Identificador inválido.");

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Trilha inválida.")
  .max(60, "Trilha inválida.");

export const responderSchema = z
  .object({
    perguntaId: z.uuid("Pergunta inválida."),
    opcao: z.number().int("Use o índice da opção (0, 1, 2...).").min(0).max(4),
  })
  .strict();

export const pedaleSchema = z
  .object({
    licaoId: z.uuid("Lição inválida."),
  })
  .strict();

export const rankingSchema = z.object({
  tipo: z.enum(["bairros", "escolas"], "Use tipo=bairros ou tipo=escolas."),
});

export const mapaSchema = z.object({
  tipo: z.enum(["solar", "coleta", "acao"], "Use tipo=solar, coleta ou acao.").optional(),
});
