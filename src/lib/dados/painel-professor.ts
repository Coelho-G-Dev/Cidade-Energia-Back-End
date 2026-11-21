import type { SupabaseClient } from "@supabase/supabase-js";
import { naoEncontrado } from "@/lib/http/erros";
import { painelProfessorSchema } from "@/lib/validacao/painel";

export async function obterPainelProfessor(admin: SupabaseClient, codigo: string) {
  const { data, error } = await admin.rpc("painel_professor", { p_codigo: codigo });
  if (error) throw new Error("Não foi possível consultar o painel do professor.");
  if (!data) throw naoEncontrado("ESCOLA_NAO_ENCONTRADA", "Escola não encontrada.");
  const resultado = painelProfessorSchema.safeParse(data);
  if (!resultado.success) throw new Error("Resposta inválida do painel do professor.");
  return resultado.data;
}
