import { z } from "zod";

const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const esquemaServidor = esquemaPublico.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const esquemaGemini = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().regex(/^[a-z0-9.-]+$/),
});

export function envPublico() {
  return esquemaPublico.parse(process.env);
}

export function envServidor() {
  return esquemaServidor.parse(process.env);
}

export function envGemini() {
  return esquemaGemini.parse(process.env);
}
