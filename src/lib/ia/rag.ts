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
  resumirSimulacao,
  selecionarRelevantes,
  type ContextoEstudante,
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

type Relacao<T> = T | T[] | null;
const primeiro = <T>(r: Relacao<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

type LinhaPerfil = { bairros: Relacao<{ nome: string }> };
type LinhaSimulacao = {
  modo: "conta" | "aparelhos";
  consumo_kwh: number | string;
  valor_conta: number | string | null;
  simulacao_itens: { quantidade: number; horas_dia: number | string; aparelhos: Relacao<{ nome: string; potencia_w: number | string }> }[];
};

export async function buscarContextoEstudante(admin: SupabaseClient, usuarioId: string): Promise<ContextoEstudante> {
  const [perfil, simulacao] = await Promise.all([
    admin.from("perfis").select("bairros(nome)").eq("id", usuarioId).maybeSingle<LinhaPerfil>(),
    admin
      .from("simulacoes")
      .select("modo, consumo_kwh, valor_conta, simulacao_itens(quantidade, horas_dia, aparelhos(nome, potencia_w))")
      .eq("perfil_id", usuarioId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle<LinhaSimulacao>(),
  ]);
  if (perfil.error) throw erroDoBanco(perfil.error);
  if (simulacao.error) throw erroDoBanco(simulacao.error);

  const s = simulacao.data;
  return {
    bairro: primeiro(perfil.data?.bairros ?? null)?.nome ?? null,
    simulacao: s
      ? resumirSimulacao({
          modo: s.modo,
          consumoKwh: Number(s.consumo_kwh),
          valorConta: s.valor_conta == null ? null : Number(s.valor_conta),
          itens: s.simulacao_itens.flatMap((i) => {
            const aparelho = primeiro(i.aparelhos);
            return aparelho
              ? [{ nome: aparelho.nome, potenciaW: Number(aparelho.potencia_w), quantidade: i.quantidade, horasDia: Number(i.horas_dia) }]
              : [];
          }),
        })
      : null,
  };
}

async function contextoOuNada(admin: SupabaseClient, usuarioId: string): Promise<ContextoEstudante | null> {
  try {
    return await buscarContextoEstudante(admin, usuarioId);
  } catch {
    console.error("Tutor: contexto do estudante indisponível; respondendo sem ele");
    return null;
  }
}

export async function responderTutor(pedido: PedidoTutor): Promise<RespostaTutor> {
  const gemini = pedido.gemini ?? configGemini();
  await registrarUsoTutor(pedido.admin, pedido.usuarioId);
  const estudante = contextoOuNada(pedido.admin, pedido.usuarioId);

  try {
    const embedding = await gerarEmbedding(textoDeConsulta(pedido.mensagem), gemini);
    const relevantes = selecionarRelevantes(await buscarTrechos(pedido.admin, embedding));
    const [licoesRelacionadas, texto] = await Promise.all([
      buscarLicoesRelacionadas(pedido.admin, idsDeLicoes(relevantes)),
      gerarResposta(
        {
          modelo: gemini.modelo,
          instrucoes: montarInstrucoes(relevantes, await estudante),
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
