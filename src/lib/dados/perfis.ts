import type { SupabaseClient } from "@supabase/supabase-js";
import { ErroApi, erroDoBanco, naoEncontrado } from "@/lib/http/erros";
import type { AtualizarPerfil } from "@/lib/validacao/perfil";

export type Perfil = {
  id: string;
  primeiro_nome: string | null;
  bairro_id: string | null;
  escola_id: string | null;
  criado_em: string;
  tem_perfil: boolean;
};

const colunas = "id, primeiro_nome, bairro_id, escola_id, criado_em";

function comFlag(p: Omit<Perfil, "tem_perfil">): Perfil {
  return { ...p, tem_perfil: p.primeiro_nome !== null };
}

export async function obterPerfil(supabase: SupabaseClient, usuarioId: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from("perfis")
    .select(colunas)
    .eq("id", usuarioId)
    .maybeSingle();
  if (error) throw erroDoBanco(error);
  if (!data) throw naoEncontrado("PERFIL_NAO_ENCONTRADO", "Perfil não encontrado.");
  return comFlag(data);
}

async function resolverEscola(supabase: SupabaseClient, dados: AtualizarPerfil): Promise<string | null> {
  if (dados.codigo_turma) {
    const { data, error } = await supabase.rpc("resolver_codigo_turma", {
      p_codigo: dados.codigo_turma,
    });
    if (error) throw erroDoBanco(error);
    if (!data) throw naoEncontrado("TURMA_NAO_ENCONTRADA", "Não encontramos uma turma com esse código.");
    return data as string;
  }
  return dados.escola_id ?? null;
}

export async function atualizarPerfil(
  supabase: SupabaseClient,
  usuarioId: string,
  dados: AtualizarPerfil,
): Promise<Perfil> {
  const escolaId = await resolverEscola(supabase, dados);

  const { data, error } = await supabase
    .from("perfis")
    .upsert(
      {
        id: usuarioId,
        primeiro_nome: dados.primeiro_nome,
        bairro_id: dados.bairro_id,
        escola_id: escolaId,
      },
      { onConflict: "id" },
    )
    .select(colunas)
    .single();

  if (error) {
    const convertido = erroDoBanco(error);
    if (convertido instanceof ErroApi) {
      throw new ErroApi(404, "BAIRRO_OU_ESCOLA_NAO_ENCONTRADO", "Bairro ou escola não encontrado.");
    }
    throw convertido;
  }
  return comFlag(data);
}
