import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { ErroApi } from "@/lib/http/erros";
import type { avaliacaoTutorSchema } from "@/lib/validacao/avaliacao-tutor";
export async function registrarAvaliacaoTutor(admin: SupabaseClient, perfilId: string, avaliacao: z.infer<typeof avaliacaoTutorSchema>) {
  const { error } = await admin.rpc("avaliar_resposta_tutor", { p_perfil_id: perfilId, p_resposta_id: avaliacao.respostaId, p_util: avaliacao.util, p_motivo: avaliacao.motivo ?? null });
  if (error?.code === "CT001") throw new ErroApi(404, "RESPOSTA_NAO_ENCONTRADA", "Resposta não encontrada.");
  if (error?.code === "CT002") throw new ErroApi(409, "AVALIACAO_JA_REGISTRADA", "Você já avaliou esta resposta.");
  if (error) throw new Error("Não foi possível registrar a avaliação do tutor.");
  return { registrado: true } as const;
}
