import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITE_SIMULACAO_PUBLICA_POR_MINUTO } from "@/lib/config";
import { envServidor } from "@/lib/env";
import { ErroApi } from "@/lib/http/erros";
import { clienteAdmin } from "@/lib/supabase/admin";

export function ipDaRequisicao(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  const encaminhado = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return real || encaminhado || "desconhecido";
}

export function chaveDoLimite(escopo: string, ip: string, segredo: string): string {
  return `${escopo}:${createHmac("sha256", segredo).update(ip).digest("hex")}`;
}

export async function consumirLimitePublico(
  admin: SupabaseClient,
  chave: string,
  limite: number,
  janela: string,
): Promise<void> {
  const { data, error } = await admin
    .rpc("consumir_limite_publico", { p_chave: chave, p_limite: limite, p_janela: janela })
    .single<{ permitido: boolean; liberado_em: string | null }>();
  if (error) {
    console.error(`Limite das rotas públicas indisponível: ${error.message}`);
    return;
  }
  if (!data.permitido) {
    throw new ErroApi(429, "LIMITE_DE_REQUISICOES", "Muitas simulações seguidas deste endereço. Espere um minuto e tente de novo.");
  }
}

export async function limitarSimulacaoPublica(request: Request): Promise<void> {
  const chave = chaveDoLimite("simulacao", ipDaRequisicao(request), envServidor().SUPABASE_SERVICE_ROLE_KEY);
  await consumirLimitePublico(clienteAdmin(), chave, LIMITE_SIMULACAO_PUBLICA_POR_MINUTO, "1 minute");
}
