import { z } from "zod";

const item = z
  .object({
    aparelhoId: z.uuid("Aparelho inválido."),
    quantidade: z.number().int("Use um número inteiro.").min(1).max(50),
    horasDia: z.number().positive("Informe um tempo maior que zero.").max(24, "Um dia tem no máximo 24 horas."),
  })
  .strict();

const modoConta = z
  .object({
    modo: z.literal("conta"),
    consumoKwh: z.number().positive("O consumo deve ser maior que zero.").max(100_000),
    valorConta: z.number().positive("O valor da conta deve ser maior que zero.").max(1_000_000).optional(),
  })
  .strict();

const modoAparelhos = z
  .object({
    modo: z.literal("aparelhos"),
    itens: z
      .array(item)
      .min(1, "Informe pelo menos um aparelho.")
      .max(30)
      .refine((itens) => new Set(itens.map((i) => i.aparelhoId)).size === itens.length, {
        message: "Cada aparelho deve aparecer uma vez só; use a quantidade.",
      }),
  })
  .strict();

export const criarSimulacaoSchema = z.discriminatedUnion("modo", [modoConta, modoAparelhos]);

export type CriarSimulacao = z.infer<typeof criarSimulacaoSchema>;
