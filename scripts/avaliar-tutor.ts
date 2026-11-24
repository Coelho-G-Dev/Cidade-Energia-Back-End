import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { avaliarConjunto, CONTEXTO_FICTICIO, intervaloCliSchema, referenciaSchema, relatorioAvaliacao } from "@/lib/ia/avaliacao";
import { gravarRelatorioAvaliacao } from "@/lib/ia/relatorio-arquivo";
import { gerarRespostaTutor } from "@/lib/ia/rag";
import { clienteAdmin } from "@/lib/supabase/admin";
import { diaSaoLuis } from "@/lib/http/impacto";

async function main() {
  const { values } = parseArgs({ options: { help: { type: "boolean" }, "intervalo-ms": { type: "string" } } });
  if (values.help) { console.log("Uso: npm run tutor:avaliar -- --intervalo-ms 4000. Intervalo padrão 4000 ms entre casos; 429 e 503 do Gemini: até 3 tentativas totais com espera crescente. Lê ../docs/qa/energinho/referencia.json e grava relatorio-AAAA-MM-DD.md, -2.md etc. Usa cota Gemini; somente após autorização do Coelho. Sem escrita no banco."); return; }
  const intervaloMs = intervaloCliSchema.parse(values["intervalo-ms"]);
  for (const arquivo of [".env.local", ".env"]) if (existsSync(arquivo)) process.loadEnvFile(arquivo);
  const pasta = resolve("../docs/qa/energinho");
  const casos = referenciaSchema.parse(JSON.parse(await readFile(resolve(pasta, "referencia.json"), "utf8")));
  const agora = new Date();
  const admin = clienteAdmin();
  const resultados = await avaliarConjunto(casos, async (caso) => (await gerarRespostaTutor({
    admin, mensagem: caso.pergunta, historico: (caso.historico ?? []).map((m) => ({ papel: m.papel === "estudante" ? "usuario" as const : "energinho" as const, texto: m.texto })), estudante: caso.comContextoFicticio ? CONTEXTO_FICTICIO : null,
  })).resposta, { intervaloMs });
  const destino = await gravarRelatorioAvaliacao(pasta, diaSaoLuis(agora), relatorioAvaliacao(resultados, agora));
  console.log(`Relatório gravado: ${destino}. Casos: ${resultados.length}; reprovados: ${resultados.filter((r) => r.status === "reprovado").length}; não avaliados: ${resultados.filter((r) => r.status === "nao_avaliado").length}.`);
}
main().catch(() => { console.error("Avaliação não concluída. Confira o arquivo de referência, o intervalo e a configuração. Nenhum detalhe remoto foi publicado."); process.exitCode = 1; });
