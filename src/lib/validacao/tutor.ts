import { z } from "zod";
import { TUTOR_HISTORICO_MAXIMO, TUTOR_HISTORICO_TEXTO_MAXIMO, TUTOR_MENSAGEM_MAXIMA } from "@/lib/config";

export const tutorSchema = z
  .object({
    mensagem: z
      .string("Envie a mensagem como texto.")
      .trim()
      .min(1, "Escreva uma pergunta.")
      .max(TUTOR_MENSAGEM_MAXIMA, `A mensagem pode ter até ${TUTOR_MENSAGEM_MAXIMA} caracteres.`),
    historico: z
      .array(
        z
          .object({
            papel: z.enum(["usuario", "energinho"], "Use papel usuario ou energinho."),
            texto: z
              .string()
              .trim()
              .min(1)
              .max(TUTOR_HISTORICO_TEXTO_MAXIMO, `Cada mensagem do histórico pode ter até ${TUTOR_HISTORICO_TEXTO_MAXIMO} caracteres.`),
          })
          .strict(),
      )
      .max(TUTOR_HISTORICO_MAXIMO, `Envie no máximo as ${TUTOR_HISTORICO_MAXIMO} últimas mensagens.`)
      .default([]),
  })
  .strict();
