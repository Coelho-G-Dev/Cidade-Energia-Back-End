import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  JANELA_LIMITE_PREVIA_POR_PERFIL,
  LIMITE_PREVIA_POR_PERFIL,
  LIMITE_SIMULACAO_PUBLICA_POR_MINUTO,
} from "@/lib/config";
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

export type RegraDeLimite = { chave: string; limite: number; janela: string };

export function regraDaSimulacao(usuarioId: string | null, ip: string, segredo: string): RegraDeLimite {
  if (usuarioId) {
    return { chave: `previa:perfil:${usuarioId}`, limite: LIMITE_PREVIA_POR_PERFIL, janela: JANELA_LIMITE_PREVIA_POR_PERFIL };
  }
  return { chave: chaveDoLimite("simulacao", ip, segredo), limite: LIMITE_SIMULACAO_PUBLICA_POR_MINUTO, janela: "1 minute" };
}

export async function consumirLimitePublico(admin: SupabaseClient, { chave, limite, janela }: RegraDeLimite): Promise<void> {
  const { data, error } = await admin
    .rpc("consumir_limite_publico", { p_chave: chave, p_limite: limite, p_janela: janela })
    .single<{ permitido: boolean; liberado_em: string | null }>();
  if (error) {
    console.error(`Limite das rotas públicas indisponível: ${error.message}`);
    return;
  }
  if (!data.permitido) {
    throw new ErroApi(429, "LIMITE_DE_REQUISICOES", "Muitas simulações seguidas. Espere um pouco e tente de novo.");
  }
}

export async function limitarSimulacao(request: Request, usuarioId: string | null): Promise<void> {
  const regra = regraDaSimulacao(usuarioId, ipDaRequisicao(request), envServidor().SUPABASE_SERVICE_ROLE_KEY);
  await consumirLimitePublico(clienteAdmin(), regra);
}
