import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env";
import { naoAutenticado } from "@/lib/http/erros";

const opcoesAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export function clienteAnonimo(): SupabaseClient {
  const env = envPublico();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: opcoesAuth,
  });
}

function clienteDoToken(token: string): SupabaseClient {
  const env = envPublico();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: opcoesAuth,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function extrairToken(request: Request): string | null {
  const cabecalho = request.headers.get("authorization");
  const [tipo, token] = cabecalho?.split(" ") ?? [];
  return tipo?.toLowerCase() === "bearer" && token ? token : null;
}

export type Sessao = { usuarioId: string; supabase: SupabaseClient };

export async function obterSessao(request: Request): Promise<Sessao | null> {
  const token = extrairToken(request);
  if (!token) return null;

  const supabase = clienteDoToken(token);
  const usuarioId = await validarToken(supabase, token);
  return usuarioId ? { usuarioId, supabase } : null;
}

async function validarToken(supabase: SupabaseClient, token: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getClaims(token);
    return error ? null : (data?.claims.sub ?? null);
  } catch {
    return null;
  }
}

export type SessaoOpcional = { usuarioId: string | null; supabase: SupabaseClient };

export async function sessaoOpcional(request: Request): Promise<SessaoOpcional> {
  return (await obterSessao(request)) ?? { usuarioId: null, supabase: clienteAnonimo() };
}

export async function exigirSessao(request: Request): Promise<Sessao> {
  const sessao = await obterSessao(request);
  if (!sessao) throw naoAutenticado();
  return sessao;
}
