import { existsSync } from "node:fs";
import { TUTOR_DISTANCIA_DO_MELHOR, TUTOR_SIMILARIDADE_MINIMA, TUTOR_TRECHOS_BUSCADOS } from "@/lib/config";
import { envGemini } from "@/lib/env";
import { gerarEmbeddings, textoDeConsulta } from "@/lib/ia/gemini";
import { buscarTrechos } from "@/lib/ia/rag";
import { selecionarRelevantes, type TrechoRecuperado } from "@/lib/ia/tutor";
import { clienteAdmin } from "@/lib/supabase/admin";

for (const arquivo of [".env.local", ".env"]) {
  if (existsSync(arquivo)) process.loadEnvFile(arquivo);
}

const NO_TEMA: [string, string][] = [
  ["Por que São Luís tem tanto sol?", "O sol de São Luís"],
  ["O sol daqui é mais forte que no sul do Brasil?", "O sol de São Luís"],
  ["Como uma placa solar transforma luz em energia?", "Como a placa solar funciona"],
  ["A placa solar funciona de noite?", "Como a placa solar funciona"],
  ["Quanta energia eu gero pedalando uma bicicleta?", "Pedale e veja"],
  ["Quantas pessoas pedalando precisaria para ligar um chuveiro?", "Pedale e veja"],
  ["Quantas placas solares eu preciso na minha casa?", "Quantas placas para a minha casa?"],
  ["Como calcular o número de placas para a conta de 150 kWh?", "Quantas placas para a minha casa?"],
  ["Tem parque eólico no Maranhão?", "Vento: os parques eólicos do litoral"],
  ["Como o vento vira energia elétrica?", "Vento: os parques eólicos do litoral"],
  ["Dá para gerar energia com as marés de São Luís?", "Marés: a força do mar de São Luís"],
  ["De onde vem a maior parte da energia do Brasil?", "Juntando tudo: a energia do Brasil"],
  ["Por que o ar-condicionado gasta tanta energia?", "Por que o ar pesa na conta"],
  ["Qual a melhor temperatura para deixar o ar?", "Temperatura certa e portas fechadas"],
  ["Deixar a porta aberta com o ar ligado gasta mais?", "Temperatura certa e portas fechadas"],
  ["Vale a pena desligar o ar antes de dormir?", "Desligar antes de dormir"],
  ["O que é kWh?", "O que é kWh"],
  ["Qual a diferença entre watt e kWh?", "O que é kWh"],
  ["Como eu leio a minha conta de luz?", "Lendo a conta"],
  ["O que significa a bandeira vermelha na conta?", "Bandeiras tarifárias"],
  ["Por que a conta tem bandeira amarela?", "Bandeiras tarifárias"],
  ["Quais impostos vêm na conta de luz?", "Impostos e taxas"],
  ["O que é lixo eletrônico?", "O que é lixo eletrônico"],
  ["Onde eu jogo um celular velho em São Luís?", "Onde descartar"],
  ["Onde descartar pilhas e baterias?", "Onde descartar"],
  ["O que fazer antes de descartar um celular?", "Antes de descartar"],
  ["pq a conta de luz veio tao alta esse mes", "Lendo a conta"],
  ["o ar condicionado gasta mt?", "Por que o ar pesa na conta"],
  ["onde jogo pilha velha", "Onde descartar"],
  ["placa solar vale a pena aqui em sao luis?", "Quantas placas para a minha casa?"],
  ["oq é kwh", "O que é kWh"],
  ["minha mae disse q a conta ta com bandeira vermelha, oq é isso", "Bandeiras tarifárias"],
];

const FORA_DO_TEMA = [
  "Qual a capital da França?",
  "Quem ganhou o último jogo do Sampaio Corrêa?",
  "Me ajuda com a lição de matemática de frações?",
  "Qual o melhor jogo de celular?",
  "Como fazer um bolo de chocolate?",
  "Quem descobriu o Brasil?",
  "Me conta uma piada",
  "Qual a música mais tocada hoje?",
  "Como cuidar de um cachorro?",
  "Qual é a fórmula da água?",
];

const DO_TEMA_SEM_LICAO = [
  "Como funciona uma usina nuclear?",
  "Carro elétrico polui menos?",
  "O que é energia geotérmica?",
];

const MINIMOS = [0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68];
const DISTANCIAS = [0.04, 0.06, 0.08, 0.1, 0.12];

async function calibrar() {
  const admin = clienteAdmin();
  const { data: licoes, error } = await admin.from("licoes").select("id, titulo");
  if (error) throw new Error(`Falha ao ler as lições: ${error.message}`);
  const tituloPorId = new Map((licoes as { id: string; titulo: string }[]).map((l) => [l.id, l.titulo]));

  const perguntas = [...NO_TEMA.map(([p]) => p), ...FORA_DO_TEMA, ...DO_TEMA_SEM_LICAO];
  const vetores = await gerarEmbeddings(perguntas.map(textoDeConsulta), { apiKey: envGemini().GEMINI_API_KEY });
  const buscas: TrechoRecuperado[][] = [];
  for (const v of vetores) buscas.push(await buscarTrechos(admin, v, TUTOR_TRECHOS_BUSCADOS));

  const melhor = (b: TrechoRecuperado[]) => Math.max(...b.map((t) => t.similaridade));
  const titulos = (b: TrechoRecuperado[]) => b.map((t) => tituloPorId.get(t.licaoId) ?? "?");
  const noTema = NO_TEMA.map(([pergunta, esperada], i) => ({ pergunta, esperada, busca: buscas[i]! }));
  const fora = FORA_DO_TEMA.map((pergunta, i) => ({ pergunta, busca: buscas[NO_TEMA.length + i]! }));
  const semLicao = DO_TEMA_SEM_LICAO.map((pergunta, i) => ({ pergunta, busca: buscas[NO_TEMA.length + FORA_DO_TEMA.length + i]! }));

  console.log("\nNo tema (melhor similaridade · lição esperada · onde ela ficou entre os 4):");
  for (const q of noTema) {
    const posicao = titulos(q.busca).indexOf(q.esperada);
    console.log(`  ${melhor(q.busca).toFixed(3)}  ${posicao >= 0 ? `#${posicao + 1}` : "fora"}  ${q.pergunta} → ${q.esperada}`);
  }
  console.log("\nFora do tema (melhor similaridade · lição mais parecida):");
  for (const q of fora) console.log(`  ${melhor(q.busca).toFixed(3)}  ${q.pergunta} → ${titulos(q.busca)[0]}`);
  console.log("\nDo tema, mas sem lição (melhor similaridade · lição mais parecida):");
  for (const q of semLicao) console.log(`  ${melhor(q.busca).toFixed(3)}  ${q.pergunta} → ${titulos(q.busca)[0]}`);

  type Resultado = { minimo: number; distancia: number; acertos: number; falsos: number; semLicaoComLicao: number; margem: number };
  const resultados: Resultado[] = [];
  for (const minimo of MINIMOS) {
    for (const distancia of DISTANCIAS) {
      const acertos = noTema.filter((q) => titulos(selecionarRelevantes(q.busca, minimo, distancia)).includes(q.esperada)).length;
      const falsos = fora.filter((q) => selecionarRelevantes(q.busca, minimo, distancia).length > 0).length;
      const semLicaoComLicao = semLicao.filter((q) => selecionarRelevantes(q.busca, minimo, distancia).length > 0).length;
      const margem = Math.min(...noTema.map((q) => melhor(q.busca))) - minimo;
      resultados.push({ minimo, distancia, acertos, falsos, semLicaoComLicao, margem });
    }
  }

  console.log(`\nCombinações (no tema: ${noTema.length}; fora do tema: ${fora.length}; sem lição: ${semLicao.length}):`);
  console.log("  mínimo  distância  acertos  fora com lição  sem lição com lição");
  for (const r of resultados) {
    const atual = r.minimo === TUTOR_SIMILARIDADE_MINIMA && r.distancia === TUTOR_DISTANCIA_DO_MELHOR ? "  ← atual" : "";
    console.log(`  ${r.minimo.toFixed(2)}    ${r.distancia.toFixed(2)}       ${String(r.acertos).padStart(2)}       ${String(r.falsos).padStart(2)}              ${r.semLicaoComLicao}${atual}`);
  }

  const semFalsos = resultados.filter((r) => r.falsos === 0);
  const sugestao = [...semFalsos].sort((a, b) => b.acertos - a.acertos || a.semLicaoComLicao - b.semLicaoComLicao || a.minimo - b.minimo)[0];
  const maiorFora = Math.max(...fora.map((q) => melhor(q.busca)));
  const menorNoTema = Math.min(...noTema.map((q) => melhor(q.busca)));
  console.log(`\nMaior similaridade fora do tema: ${maiorFora.toFixed(3)}. Menor no tema: ${menorNoTema.toFixed(3)}.`);
  if (sugestao) {
    console.log(`Sugestão: mínimo ${sugestao.minimo}, distância ${sugestao.distancia} (${sugestao.acertos}/${noTema.length} acertos, nenhum falso).`);
  } else {
    console.log("Nenhuma combinação sem falsos positivos: revise as perguntas ou os trechos.");
  }
}

calibrar().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
