import { existsSync } from "node:fs";
import { envGemini, envServidor } from "@/lib/env";
import { gerarEmbeddings, textoDeDocumento } from "@/lib/ia/gemini";
import { dividirEmTrechos } from "@/lib/ia/trechos";
import { clienteAdmin } from "@/lib/supabase/admin";

for (const arquivo of [".env.local", ".env"]) {
  if (existsSync(arquivo)) process.loadEnvFile(arquivo);
}

const LINHAS_POR_INSERCAO = 100;
const simular = process.argv.includes("--simular");

type LinhaLicao = { id: string; titulo: string; conteudo: string; trilhas: { titulo: string } | { titulo: string }[] | null };

async function indexar() {
  const destino = new URL(envServidor().NEXT_PUBLIC_SUPABASE_URL).host;
  const admin = clienteAdmin();

  const { data, error } = await admin.from("licoes").select("id, titulo, conteudo, trilhas(titulo)").order("id");
  if (error) throw new Error(`Falha ao ler as lições: ${error.message}`);

  const trechos = (data as LinhaLicao[]).flatMap((l) => {
    const trilha = Array.isArray(l.trilhas) ? l.trilhas[0] : l.trilhas;
    return dividirEmTrechos({ id: l.id, titulo: l.titulo, trilha: trilha?.titulo ?? "", conteudo: l.conteudo });
  });
  const tamanhos = trechos.map((t) => t.texto.length);
  console.log(`${data.length} lições → ${trechos.length} trechos (de ${Math.min(...tamanhos)} a ${Math.max(...tamanhos)} caracteres) em ${destino}`);

  if (simular) {
    for (const t of trechos.slice(0, 3)) console.log(`\n--- ${t.titulo}\n${t.texto}`);
    console.log("\nModo --simular: nada foi enviado ao Gemini nem gravado no banco.");
    return;
  }

  const vetores = await gerarEmbeddings(
    trechos.map((t) => textoDeDocumento(t.titulo, t.texto)),
    { apiKey: envGemini().GEMINI_API_KEY },
  );
  console.log(`${vetores.length} embeddings gerados.`);

  const apagar = await admin.from("documentos_rag").delete().gte("id", 0);
  if (apagar.error) throw new Error(`Falha ao limpar documentos_rag: ${apagar.error.message}`);

  const linhas = trechos.map((t, i) => ({ licao_id: t.licaoId, trecho: t.texto, embedding: JSON.stringify(vetores[i]) }));
  for (let i = 0; i < linhas.length; i += LINHAS_POR_INSERCAO) {
    const { error: erroInsercao } = await admin.from("documentos_rag").insert(linhas.slice(i, i + LINHAS_POR_INSERCAO));
    if (erroInsercao) throw new Error(`Falha ao gravar trechos: ${erroInsercao.message}`);
  }
  console.log(`${linhas.length} trechos gravados em documentos_rag.`);
}

indexar().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
