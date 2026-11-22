import { z } from "zod";
export const momentoSchema = z.enum(["antes", "depois"]);
export const consultaDiagnosticoSchema = z.object({ momento: momentoSchema }).strict();
export const envioDiagnosticoSchema = z.object({
  momento: momentoSchema,
  respostas: z.array(z.object({ perguntaId: z.uuid(), opcao: z.number().int().min(0).max(4) }).strict()).length(4),
}).strict().refine((v) => new Set(v.respostas.map((r) => r.perguntaId)).size === v.respostas.length, "Não repita perguntas.");
export const diagnosticoSchema = z.object({
  momento: momentoSchema, disponivel: z.boolean(), respondido: z.boolean(),
  perguntas: z.array(z.object({ id: z.uuid(), ordem: z.number().int().positive(), enunciado: z.string(), opcoes: z.array(z.string()).min(2).max(5) }).strict()).max(4),
}).strict().refine((v) => v.disponivel && !v.respondido ? v.perguntas.length === 4 : v.perguntas.length === 0);
export const registroDiagnosticoSchema = z.discriminatedUnion("momento", [
  z.object({ momento: z.literal("antes"), registrado: z.literal(true) }).strict(),
  z.object({ momento: z.literal("depois"), registrado: z.literal(true), total: z.literal(4),
    acertosAntes: z.number().int().min(0).max(4), acertosDepois: z.number().int().min(0).max(4),
    perguntas: z.array(z.object({ perguntaId: z.uuid(), indiceCorreto: z.number().int().min(0).max(4),
      acertouAntes: z.boolean(), acertouDepois: z.boolean(), explicacao: z.string() }).strict()).length(4),
  }).strict(),
]);
