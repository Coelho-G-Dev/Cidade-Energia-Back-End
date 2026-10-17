import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TUTOR_LIMITE_POR_HORA, TUTOR_TRECHOS_BUSCADOS } from "@/lib/config";
import { envGemini } from "@/lib/env";
import { ErroApi, erroDoBanco } from "@/lib/http/erros";
import { ErroGemini, gerarEmbedding, gerarResposta, textoDeConsulta, type ConfigGemini, type Mensagem } from "@/lib/ia/gemini";
import {
  idsDeLicoes,
  limitarResposta,
  mensagemLimiteTutor,
  montarInstrucoes,
  RESPOSTA_BLOQUEADA,
  selecionarRelevantes,
  type LicaoRelacionada,
  type TrechoRecuperado,
} from "@/lib/ia/tutor";

export type RespostaTutor = { resposta: string; licoesRelacionadas: LicaoRelacionada[] };
export type ConfigTutor = ConfigGemini & { modelo: string };

export type PedidoTutor = {
  admin: SupabaseClient;
  usuarioId: string;
  mensagem: string;
  historico: Mensagem[];
  gemini?: ConfigTutor;
};

const tutorIndisponivel = () =>
  new ErroApi(503, "TUTOR_INDISPONIVEL", "O Energinho está descansando agora. Tente de novo em alguns minutos.");

function configGemini(): ConfigTutor {
  try {
    const env = envGemini();
    return { apiKey: env.GEMINI_API_KEY, modelo: env.GEMINI_MODEL };
  } catch {
    console.error("Tutor: GEMINI_API_KEY ou GEMINI_MODEL ausentes ou inválidas");
    throw tutorIndisponivel();
  }
}

export async function registrarUsoTutor(admin: SupabaseClient, usuarioId: string, limite = TUTOR_LIMITE_POR_HORA): Promise<void> {
  const { data, error } = await admin
    .rpc("registrar_uso_tutor", { p_perfil_id: usuarioId, p_limite: limite, p_janela: "1 hour" })
    .single<{ permitido: boolean; liberado_em: string | null }>();
  if (error) throw erroDoBanco(error);
  if (!data.permitido) {
    throw new ErroApi(429, "LIMITE_TUTOR", mensagemLimiteTutor(limite, data.liberado_em ? new Date(data.liberado_em) : null));
  }
}

export async function buscarTrechos(
  admin: SupabaseClient,
  embedding: number[],
  k = TUTOR_TRECHOS_BUSCADOS,
): Promise<TrechoRecuperado[]> {
  const { data, error } = await admin.rpc("match_documentos", { p_embedding: JSON.stringify(embedding), p_k: k });
  if (error) throw erroDoBanco(error);
  return ((data ?? []) as { licao_id: string; trecho: string; similaridade: number }[]).map((d) => ({
    licaoId: d.licao_id,
    trecho: d.trecho,
    similaridade: Number(d.similaridade),
  }));
}

type LinhaLicao = { id: string; titulo: string; trilhas: { slug: string } | { slug: string }[] | null };

export async function buscarLicoesRelacionadas(supabase: SupabaseClient, ids: string[]): Promise<LicaoRelacionada[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("licoes").select("id, titulo, trilhas(slug)").in("id", ids);
  if (error) throw erroDoBanco(error);
  const porId = new Map(
    ((data ?? []) as LinhaLicao[]).map((l) => {
      const trilha = Array.isArray(l.trilhas) ? l.trilhas[0] : l.trilhas;
      return [l.id, { id: l.id, titulo: l.titulo, trilhaSlug: trilha?.slug ?? "" }];
    }),
  );
  return ids.flatMap((id) => porId.get(id) ?? []);
}

export async function responderTutor(pedido: PedidoTutor): Promise<RespostaTutor> {
  const gemini = pedido.gemini ?? configGemini();
  await registrarUsoTutor(pedido.admin, pedido.usuarioId);

  try {
    const embedding = await gerarEmbedding(textoDeConsulta(pedido.mensagem), gemini);
    const relevantes = selecionarRelevantes(await buscarTrechos(pedido.admin, embedding));
    const [licoesRelacionadas, texto] = await Promise.all([
      buscarLicoesRelacionadas(pedido.admin, idsDeLicoes(relevantes)),
      gerarResposta(
        {
          modelo: gemini.modelo,
          instrucoes: montarInstrucoes(relevantes),
          historico: pedido.historico,
          mensagem: pedido.mensagem,
        },
        gemini,
      ),
    ]);

    if (texto === null) return { resposta: RESPOSTA_BLOQUEADA, licoesRelacionadas: [] };
    return { resposta: limitarResposta(texto), licoesRelacionadas };
  } catch (e) {
    if (e instanceof ErroGemini) {
      console.error(`Tutor: ${e.message}`);
      throw tutorIndisponivel();
    }
    throw e;
  }
}
