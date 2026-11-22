import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { ErroApi } from "@/lib/http/erros";
import { diagnosticoSchema, envioDiagnosticoSchema, registroDiagnosticoSchema } from "@/lib/validacao/diagnostico";

function erroDiagnostico(erro: { code?: string }) {
  const erros: Record<string, [number, string, string]> = {
    CD001: [404, "TRILHA_NAO_ENCONTRADA", "Trilha não encontrada."],
    CD002: [409, "DIAGNOSTICO_INDISPONIVEL", "Este diagnóstico não está disponível agora."],
    CD003: [409, "DIAGNOSTICO_JA_RESPONDIDO", "Você já respondeu este diagnóstico."],
    CD004: [400, "ENTRADA_INVALIDA", "Envie todas as perguntas desta trilha, sem repetir, com opções válidas."],
    "42501": [401, "NAO_AUTENTICADO", "Faça login para acessar este recurso."],
  };
  const e = erros[erro.code ?? ""];
  return e ? new ErroApi(...e) : new Error("Não foi possível consultar ou registrar o diagnóstico.");
}
export async function obterDiagnostico(admin: SupabaseClient, perfilId: string, slug: string, momento: "antes" | "depois") {
  const { data, error } = await admin.rpc("consultar_diagnostico", { p_perfil_id: perfilId, p_slug: slug, p_momento: momento });
  if (error) throw erroDiagnostico(error);
  const r = diagnosticoSchema.safeParse(data);
  if (!r.success || r.data.momento !== momento) throw new Error("Resposta inválida do diagnóstico.");
  return r.data;
}
export async function enviarDiagnostico(admin: SupabaseClient, perfilId: string, slug: string, envio: z.infer<typeof envioDiagnosticoSchema>) {
  const { data, error } = await admin.rpc("gravar_diagnostico", { p_perfil_id: perfilId, p_slug: slug, p_momento: envio.momento, p_respostas: envio.respostas });
  if (error) throw erroDiagnostico(error);
  const r = registroDiagnosticoSchema.safeParse(data);
  if (!r.success || r.data.momento !== envio.momento) throw new Error("Resposta inválida do registro do diagnóstico.");
  return r.data;
}
