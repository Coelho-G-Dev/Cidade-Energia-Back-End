import { z } from "zod";
export const avaliacaoTutorSchema = z.object({
  respostaId: z.string().regex(/^[1-9]\d{0,18}$/).refine((id) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= BigInt("9223372036854775807")),
  util: z.boolean(), motivo: z.enum(["errada", "confusa", "fora_do_tema"]).optional(),
}).strict().refine((v) => !v.util || v.motivo === undefined, "Informe motivo somente quando não ajudou.");
