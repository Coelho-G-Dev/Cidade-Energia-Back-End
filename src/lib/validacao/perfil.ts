import { z } from "zod";

const primeiroNome = z
  .string()
  .trim()
  .min(2, "Use pelo menos 2 letras.")
  .max(30, "Use no máximo 30 letras.")
  .regex(/^\p{L}+(?:['-]\p{L}+)*$/u, "Informe só o primeiro nome, sem espaços ou números.");

const codigoTurma = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,12}$/, "Código de turma inválido.");

export const atualizarPerfilSchema = z
  .object({
    primeiro_nome: primeiroNome,
    bairro_id: z.uuid("Bairro inválido."),
    escola_id: z.uuid("Escola inválida.").optional(),
    codigo_turma: codigoTurma.optional(),
  })
  .strict()
  .refine((p) => !(p.escola_id && p.codigo_turma), {
    message: "Envie escola_id ou codigo_turma, não os dois.",
    path: ["codigo_turma"],
  });

export type AtualizarPerfil = z.infer<typeof atualizarPerfilSchema>;

export const filtroEscolasSchema = z.object({
  bairro: z.uuid("Bairro inválido.").optional(),
});
