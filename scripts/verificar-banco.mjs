import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function lerEnv() {
  const valores = {};
  for (const arquivo of [".env", ".env.local"]) {
    if (!existsSync(arquivo)) continue;
    for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
      if (m) valores[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
  const pegar = (...nomes) => nomes.map((n) => process.env[n] ?? valores[n]).find(Boolean);
  return {
    url: pegar("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    anon: pegar("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"),
    secreta: pegar("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
    api: process.env.API_URL,
  };
}

const env = lerEnv();
if (!env.url || !env.anon || !env.secreta) {
  console.error("Faltam variáveis do Supabase (URL, chave pública e chave secreta).");
  process.exit(1);
}

const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };
const novoCliente = () => createClient(env.url, env.anon, semSessao);
const admin = createClient(env.url, env.secreta, semSessao);

let falhas = 0;
function checar(descricao, ok, detalhe = "") {
  console.log(`${ok ? "✔" : "✘"} ${descricao}${!ok && detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas++;
}

const criados = [];

async function entrarAnonimo() {
  const cliente = novoCliente();
  const { data, error } = await cliente.auth.signInAnonymously();
  if (error) throw new Error(`Login anônimo falhou: ${error.message}`);
  criados.push(data.user.id);
  return { cliente, id: data.user.id, token: data.session.access_token };
}

async function verificarBanco() {
  const anon = novoCliente();

  console.log("\n— Catálogos (sem login)");
  const bairros = await anon.from("bairros").select("id, nome");
  checar("lê bairros", !bairros.error && bairros.data.length >= 12, bairros.error?.message);
  const aparelhos = await anon.from("aparelhos").select("id, codigo, potencia_w");
  checar("lê os 6 aparelhos", !aparelhos.error && aparelhos.data.length === 6, aparelhos.error?.message);
  const escolas = await anon.from("escolas").select("id, nome, bairro_id");
  checar("lê escolas (colunas públicas)", !escolas.error && escolas.data.length === 3, escolas.error?.message);
  const codigo = await anon.from("escolas").select("codigo_turma");
  checar("NÃO lê codigo_turma", Boolean(codigo.error));
  const estrela = await anon.from("escolas").select("*");
  checar("NÃO lê escolas com select *", Boolean(estrela.error));
  const grava = await anon.from("bairros").insert({ nome: "Bairro Teste" });
  checar("NÃO grava em bairros", Boolean(grava.error));
  const perfisAnon = await anon.from("perfis").select("id");
  checar("NÃO vê perfis sem login", !perfisAnon.error && perfisAnon.data.length === 0, perfisAnon.error?.message);
  const rpcAnon = await anon.rpc("salvar_simulacao", {
    p_modo: "conta", p_consumo_kwh: 100, p_valor_conta: null, p_resultado: {},
  });
  checar("NÃO salva simulação sem login", Boolean(rpcAnon.error));

  console.log("\n— Usuários anônimos A e B");
  const A = await entrarAnonimo();
  const B = await entrarAnonimo();
  checar("login anônimo funciona", Boolean(A.id && B.id));

  const perfilA = await A.cliente.from("perfis").select("*").eq("id", A.id).maybeSingle();
  checar("trigger criou o perfil de A (sem nome)", perfilA.data?.primeiro_nome === null, perfilA.error?.message);

  const turma = await A.cliente.rpc("resolver_codigo_turma", { p_codigo: "sol2026" });
  checar("resolve código de turma válido", typeof turma.data === "string", turma.error?.message);
  const turmaInvalida = await A.cliente.rpc("resolver_codigo_turma", { p_codigo: "NAOEXISTE" });
  checar("código inexistente retorna null", turmaInvalida.data === null, turmaInvalida.error?.message);
  const turmaAnon = await anon.rpc("resolver_codigo_turma", { p_codigo: "SOL2026" });
  checar("NÃO resolve código sem login", Boolean(turmaAnon.error));

  const bairroId = bairros.data[0].id;
  const atualiza = await A.cliente
    .from("perfis")
    .update({ primeiro_nome: "Teste", bairro_id: bairroId, escola_id: turma.data })
    .eq("id", A.id)
    .select();
  checar("A atualiza o próprio perfil", atualiza.data?.length === 1, atualiza.error?.message);

  const tv = aparelhos.data.find((a) => a.codigo === "tv");
  const sim = await A.cliente.rpc("salvar_simulacao", {
    p_modo: "aparelhos",
    p_consumo_kwh: 15,
    p_valor_conta: null,
    p_resultado: { consumoKwh: 15 },
    p_itens: [{ aparelho_id: tv.id, quantidade: 1, horas_dia: 5 }],
  });
  checar("A salva simulação com itens", typeof sim.data === "string", sim.error?.message);

  console.log("\n— Isolamento entre A e B");
  const bVePerfil = await B.cliente.from("perfis").select("id").eq("id", A.id);
  checar("B NÃO vê o perfil de A", bVePerfil.data?.length === 0, bVePerfil.error?.message);
  const bAltera = await B.cliente.from("perfis").update({ primeiro_nome: "Hacker" }).eq("id", A.id).select();
  checar("B NÃO altera o perfil de A", bAltera.data?.length === 0, bAltera.error?.message);
  const bVeSim = await B.cliente.from("simulacoes").select("id");
  checar("B NÃO vê simulações de A", bVeSim.data?.length === 0, bVeSim.error?.message);
  const bVeItens = await B.cliente.from("simulacao_itens").select("simulacao_id");
  checar("B NÃO vê itens de A", bVeItens.data?.length === 0, bVeItens.error?.message);
  const bInsereEmA = await B.cliente.from("simulacoes").insert({
    perfil_id: A.id, modo: "conta", consumo_kwh: 1, resultado: {},
  });
  checar("B NÃO cria simulação em nome de A", Boolean(bInsereEmA.error));
  const bItemEmA = await B.cliente.from("simulacao_itens").insert({
    simulacao_id: sim.data, aparelho_id: tv.id, quantidade: 1, horas_dia: 1,
  });
  checar("B NÃO adiciona item na simulação de A", Boolean(bItemEmA.error));
  const aVe = await A.cliente.from("simulacao_itens").select("simulacao_id");
  checar("A vê os próprios itens", aVe.data?.length === 1, aVe.error?.message);

  return { A, B, bairroId };
}

async function verificarRotas({ A, B, bairroId }) {
  console.log(`\n— Rotas da API (${env.api})`);
  const chamar = async (metodo, caminho, { token, body } = {}) => {
    const r = await fetch(`${env.api}${caminho}`, {
      method: metodo,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    return { status: r.status, corpo: await r.json() };
  };

  const bairros = await chamar("GET", "/api/bairros");
  checar("GET /api/bairros → 200", bairros.status === 200 && bairros.corpo.length >= 12);
  const escolas = await chamar("GET", `/api/escolas?bairro=${bairroId}`);
  checar("GET /api/escolas?bairro= → 200", escolas.status === 200 && Array.isArray(escolas.corpo));
  const escolaRuim = await chamar("GET", "/api/escolas?bairro=xyz");
  checar("GET /api/escolas?bairro=xyz → 400", escolaRuim.status === 400 && escolaRuim.corpo.erro?.codigo === "ENTRADA_INVALIDA");
  const aparelhos = await chamar("GET", "/api/aparelhos");
  checar("GET /api/aparelhos → 6 itens", aparelhos.status === 200 && aparelhos.corpo.length === 6);

  const semToken = await chamar("GET", "/api/perfil");
  checar("GET /api/perfil sem token → 401", semToken.status === 401 && semToken.corpo.erro?.codigo === "NAO_AUTENTICADO");
  const tokenFalso = await chamar("GET", "/api/perfil", { token: "abc.def.ghi" });
  checar("GET /api/perfil com token inválido → 401", tokenFalso.status === 401);

  const perfilB = await chamar("GET", "/api/perfil", { token: B.token });
  checar("B sem perfil: tem_perfil = false", perfilB.status === 200 && perfilB.corpo.tem_perfil === false);

  const comTurma = await chamar("PUT", "/api/perfil", {
    token: B.token,
    body: { primeiro_nome: "Bia", bairro_id: bairroId, codigo_turma: "vento26" },
  });
  checar("PUT /api/perfil com codigo_turma → 200", comTurma.status === 200 && comTurma.corpo.tem_perfil && comTurma.corpo.escola_id);
  const turmaRuim = await chamar("PUT", "/api/perfil", {
    token: B.token,
    body: { primeiro_nome: "Bia", bairro_id: bairroId, codigo_turma: "ZZZZ99" },
  });
  checar("PUT com turma inexistente → 404", turmaRuim.status === 404 && turmaRuim.corpo.erro?.codigo === "TURMA_NAO_ENCONTRADA");
  const bairroRuim = await chamar("PUT", "/api/perfil", {
    token: B.token,
    body: { primeiro_nome: "Bia", bairro_id: "00000000-0000-4000-8000-000000000000" },
  });
  checar("PUT com bairro inexistente → 404", bairroRuim.status === 404);
  const jsonRuim = await chamar("PUT", "/api/perfil", { token: B.token, body: "{" });
  checar("PUT com JSON malformado → 400", jsonRuim.status === 400 && jsonRuim.corpo.erro?.codigo === "JSON_INVALIDO");

  const nenhuma = await chamar("GET", "/api/simulacoes/ultima", { token: B.token });
  checar("GET /ultima sem simulações → 404", nenhuma.status === 404 && nenhuma.corpo.erro?.codigo === "NENHUMA_SIMULACAO");

  const anonima = await chamar("POST", "/api/simulacoes", { body: { modo: "conta", consumoKwh: 380, valorConta: 312 } });
  checar(
    "POST conta sem login: calcula e não salva",
    anonima.status === 200 && anonima.corpo.placas === 6 && anonima.corpo.simulacaoId === null,
    JSON.stringify(anonima.corpo),
  );

  const chuveiro = aparelhos.corpo.find((a) => a.codigo === "chuveiro");
  const ar = aparelhos.corpo.find((a) => a.codigo === "ar_condicionado");
  const porAparelhos = await chamar("POST", "/api/simulacoes", {
    token: B.token,
    body: {
      modo: "aparelhos",
      itens: [
        { aparelhoId: ar.id, quantidade: 1, horasDia: 8 },
        { aparelhoId: chuveiro.id, quantidade: 1, horasDia: 0.5 },
      ],
    },
  });
  checar(
    "POST aparelhos com login: salva e devolve pesos",
    porAparelhos.status === 200 && typeof porAparelhos.corpo.simulacaoId === "string" && porAparelhos.corpo.pesos.length === 2,
    JSON.stringify(porAparelhos.corpo),
  );

  const ultima = await chamar("GET", "/api/simulacoes/ultima", { token: B.token });
  checar(
    "GET /ultima devolve a simulação recém-salva",
    ultima.status === 200 && ultima.corpo.id === porAparelhos.corpo.simulacaoId,
    JSON.stringify(ultima.corpo),
  );
  const ultimaA = await chamar("GET", "/api/simulacoes/ultima", { token: A.token });
  checar("A NÃO recebe a simulação de B", ultimaA.status === 200 && ultimaA.corpo.id !== porAparelhos.corpo.simulacaoId);

  const aparelhoFalso = await chamar("POST", "/api/simulacoes", {
    body: { modo: "aparelhos", itens: [{ aparelhoId: "00000000-0000-4000-8000-000000000000", quantidade: 1, horasDia: 1 }] },
  });
  checar("POST com aparelho inexistente → 404", aparelhoFalso.status === 404 && aparelhoFalso.corpo.erro?.codigo === "APARELHO_NAO_ENCONTRADO");
  const invalida = await chamar("POST", "/api/simulacoes", { body: { modo: "conta", consumoKwh: -5 } });
  checar("POST com consumo negativo → 400", invalida.status === 400 && invalida.corpo.erro?.codigo === "ENTRADA_INVALIDA");
}

async function verificarBancoDia2({ A, B }) {
  const anon = novoCliente();

  console.log("\n— Dia 2: conteúdo público e gabarito escondido");
  const trilhas = await anon.from("trilhas").select("id, slug");
  checar("lê as 5 trilhas", !trilhas.error && trilhas.data.length === 5, trilhas.error?.message);
  const perguntas = await anon.from("perguntas").select("id, enunciado, opcoes");
  checar("lê perguntas sem o gabarito", !perguntas.error && perguntas.data.length === 20, perguntas.error?.message);
  checar("NÃO lê indice_correto", Boolean((await anon.from("perguntas").select("indice_correto")).error));
  checar("NÃO lê explicacao", Boolean((await A.cliente.from("perguntas").select("explicacao")).error));
  checar("NÃO lê perguntas com select *", Boolean((await A.cliente.from("perguntas").select("*")).error));
  for (const [tabela, total] of [["missoes", 2], ["conquistas", 6], ["pontos_mapa", 6]]) {
    const r = await anon.from(tabela).select("*");
    checar(`lê ${tabela} (${total})`, !r.error && r.data.length === total, r.error?.message);
  }
  const ranking = await anon.from("ranking_escolas").select("escola_id, nome, pontos, participantes, posicao");
  checar("lê ranking_escolas (só quem tem pontos)", !ranking.error && ranking.data.every((r) => r.pontos > 0), ranking.error?.message);
  checar("ranking_escolas não expõe perfil_id", Boolean((await anon.from("ranking_escolas").select("perfil_id")).error));
  checar("ranking_escolas não expõe primeiro_nome", Boolean((await anon.from("ranking_escolas").select("primeiro_nome")).error));
  const resumoAnon = await anon.from("perfil_resumo").select("*");
  checar("NÃO lê perfil_resumo sem login", Boolean(resumoAnon.error) || resumoAnon.data.length === 0);

  console.log("\n— Dia 2: o cliente não grava dados de jogo");
  const licao = (await anon.from("licoes").select("id").limit(1)).data[0];
  const pergunta = perguntas.data[0];
  const tentativas = [
    ["pontos_eventos", { perfil_id: A.id, origem: "licao_concluida", referencia_id: licao.id, pontos: 999 }],
    ["respostas", { perfil_id: A.id, pergunta_id: pergunta.id, opcao: 0, correta: true }],
    ["progresso_licoes", { perfil_id: A.id, licao_id: licao.id }],
    ["conquistas_usuario", { perfil_id: A.id, conquista_slug: "bairro_unido" }],
  ];
  for (const [tabela, linha] of tentativas) {
    checar(`A NÃO insere em ${tabela}`, Boolean((await A.cliente.from(tabela).insert(linha)).error));
  }
  const altera = await B.cliente.from("trilhas").update({ titulo: "Hack" }).eq("id", trilhas.data[0].id).select();
  checar("B NÃO altera trilhas", Boolean(altera.error) || altera.data.length === 0);
}

async function verificarRotasDia2({ A, B }) {
  console.log(`\n— Dia 2: rotas (${env.api})`);
  const chamar = async (metodo, caminho, { token, body } = {}) => {
    const r = await fetch(`${env.api}${caminho}`, {
      method: metodo,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, corpo: await r.json() };
  };

  const trilhas = await chamar("GET", "/api/trilhas");
  checar("GET /api/trilhas sem login → 5 trilhas", trilhas.status === 200 && trilhas.corpo.length === 5);
  const solar = await chamar("GET", "/api/trilhas/energia-solar-em-sao-luis", { token: A.token });
  checar("GET /api/trilhas/{slug} → 4 lições, 1 pedale", solar.status === 200 && solar.corpo.licoes.length === 4 && solar.corpo.licoes.filter((l) => l.tipo === "pedale").length === 1);
  const inexistente = await chamar("GET", "/api/trilhas/nao-existe");
  checar("GET trilha inexistente → 404", inexistente.status === 404 && inexistente.corpo.erro?.codigo === "TRILHA_NAO_ENCONTRADA");

  const [l1, l2, pedale] = [solar.corpo.licoes[0], solar.corpo.licoes[1], solar.corpo.licoes.find((l) => l.tipo === "pedale")];
  const licao = await chamar("GET", `/api/licoes/${l1.id}`);
  checar("GET /api/licoes/{id} → conteúdo em markdown", licao.status === 200 && licao.corpo.conteudo.includes("[REVISAR]") && licao.corpo.proximaLicaoId === l2.id);

  const quiz = await chamar("GET", `/api/licoes/${l2.id}/quiz`, { token: A.token });
  checar("GET quiz → 2 perguntas, sem gabarito", quiz.status === 200 && quiz.corpo.perguntas.length === 2 && !/indice_correto|explicacao/.test(JSON.stringify(quiz.corpo)));
  const [p1, p2] = quiz.corpo.perguntas;
  const gabarito = new Map(
    (await admin.from("perguntas").select("id, indice_correto").in("id", [p1.id, p2.id])).data.map((p) => [p.id, p.indice_correto]),
  );

  const perfilA = await chamar("GET", "/api/perfil", { token: A.token });
  const pontosEscola = async () =>
    (await chamar("GET", "/api/rankings?tipo=escolas")).corpo.find((e) => e.id === perfilA.corpo.escola_id)?.pontos ?? 0;
  const escolaAntes = await pontosEscola();

  const certa = await chamar("POST", "/api/quiz/responder", { token: A.token, body: { perguntaId: p1.id, opcao: gabarito.get(p1.id) } });
  checar("resposta certa na 1ª tentativa → 5 pontos", certa.status === 200 && certa.corpo.correta && certa.corpo.pontosGanhos === 5, JSON.stringify(certa.corpo));
  const escolaDepois = await pontosEscola();
  checar(`ranking da escola muda depois da resposta certa (${escolaAntes} → ${escolaDepois})`, escolaDepois === escolaAntes + 5);
  const repetida = await chamar("POST", "/api/quiz/responder", { token: A.token, body: { perguntaId: p1.id, opcao: gabarito.get(p1.id) } });
  checar("repetir a resposta certa → 0 pontos", repetida.status === 200 && repetida.corpo.pontosGanhos === 0 && !repetida.corpo.tentativaPontuavel);
  checar("ranking não muda com a repetição", (await pontosEscola()) === escolaDepois);

  const errada = await chamar("POST", "/api/quiz/responder", { token: A.token, body: { perguntaId: p2.id, opcao: (gabarito.get(p2.id) + 1) % p2.opcoes.length } });
  checar("resposta errada → explicação e nova tentativa em 24 h", errada.status === 200 && !errada.corpo.correta && errada.corpo.explicacao && errada.corpo.proximaTentativaEm);
  const corrigida = await chamar("POST", "/api/quiz/responder", { token: A.token, body: { perguntaId: p2.id, opcao: gabarito.get(p2.id) } });
  checar("acertar logo depois de errar NÃO pontua", corrigida.status === 200 && corrigida.corpo.correta && corrigida.corpo.pontosGanhos === 0 && !corrigida.corpo.tentativaPontuavel);
  const foraDaLista = await chamar("POST", "/api/quiz/responder", { token: A.token, body: { perguntaId: p1.id, opcao: 4 } });
  checar("opção fora da lista → 400", foraDaLista.status === 400);

  const concluir = await chamar("POST", `/api/licoes/${l1.id}/concluir`, { token: A.token });
  const concluirDeNovo = await chamar("POST", `/api/licoes/${l1.id}/concluir`, { token: A.token });
  checar("concluir lição → 10 pontos; de novo → 0", concluir.corpo.pontosGanhos === 10 && concluirDeNovo.corpo.pontosGanhos === 0);
  const pedaleComoTexto = await chamar("POST", `/api/licoes/${pedale.id}/concluir`, { token: A.token });
  checar("lição pedale pelo concluir → 400 LICAO_E_PEDALE", pedaleComoTexto.status === 400 && pedaleComoTexto.corpo.erro?.codigo === "LICAO_E_PEDALE");
  const pedal = await chamar("POST", "/api/pedale/concluir", { token: A.token, body: { licaoId: pedale.id } });
  const pedalDeNovo = await chamar("POST", "/api/pedale/concluir", { token: A.token, body: { licaoId: pedale.id } });
  checar("pedale → 15 pontos; de novo → 0", pedal.corpo.pontosGanhos === 15 && pedalDeNovo.corpo.pontosGanhos === 0);
  const textoComoPedale = await chamar("POST", "/api/pedale/concluir", { token: A.token, body: { licaoId: l1.id } });
  checar("lição de texto no pedale → 400", textoComoPedale.status === 400 && textoComoPedale.corpo.erro?.codigo === "LICAO_NAO_E_PEDALE");

  const missoes = await chamar("GET", "/api/missoes", { token: A.token });
  const descarte = missoes.corpo.find((m) => m.slug === "descarte-de-lixo-eletronico");
  const arMissao = missoes.corpo.find((m) => m.slug === "ar-desligado-antes-de-dormir");
  const registro = await chamar("POST", `/api/missoes/${descarte.id}/registrar`, { token: A.token });
  checar(
    "missão de 1 dia → concluída, 30 pontos e conquista Descarte certo",
    registro.status === 200 && registro.corpo.concluida && registro.corpo.pontosGanhos === 30 && registro.corpo.conquistasNovas.some((c) => c.slug === "descarte_certo"),
    JSON.stringify(registro.corpo),
  );
  const registroDeNovo = await chamar("POST", `/api/missoes/${descarte.id}/registrar`, { token: A.token });
  checar("registrar de novo no mesmo dia → sem novo registro e 0 pontos", !registroDeNovo.corpo.novoRegistro && registroDeNovo.corpo.pontosGanhos === 0);
  const ar = await chamar("POST", `/api/missoes/${arMissao.id}/registrar`, { token: A.token });
  checar("missão de 3 dias → 1/3, sem pontos", ar.corpo.diasRegistrados === 1 && !ar.corpo.concluida && ar.corpo.pontosGanhos === 0);

  const resumoA = await chamar("GET", "/api/perfil/resumo", { token: A.token });
  checar(
    "resumo de A: 60 pontos, missão, conquista e posição da escola",
    resumoA.status === 200 && resumoA.corpo.pontos === 60 && resumoA.corpo.missoesConcluidas === 1 && resumoA.corpo.licoesConcluidas === 2 &&
      resumoA.corpo.conquistas.find((c) => c.slug === "descarte_certo")?.obtida && resumoA.corpo.escola?.posicao >= 1,
    JSON.stringify(resumoA.corpo),
  );
  const resumoB = await chamar("GET", "/api/perfil/resumo", { token: B.token });
  checar(
    "resumo de B: 20 pontos da primeira simulação e a conquista",
    resumoB.status === 200 && resumoB.corpo.pontos === 20 && resumoB.corpo.conquistas.find((c) => c.slug === "primeira_simulacao")?.obtida,
    JSON.stringify(resumoB.corpo),
  );

  console.log("\n— Dia 2: isolamento entre A e B");
  for (const tabela of ["respostas", "progresso_licoes", "missoes_registros", "conquistas_usuario"]) {
    const r = await B.cliente.from(tabela).select("perfil_id");
    checar(`B NÃO lê ${tabela} de A`, !r.error && r.data.every((linha) => linha.perfil_id === B.id), r.error?.message);
  }
  const pontosB = await B.cliente.from("pontos_eventos").select("perfil_id");
  checar("B só vê os próprios pontos", !pontosB.error && pontosB.data.length === 1 && pontosB.data[0].perfil_id === B.id);
  const quizB = await chamar("GET", `/api/licoes/${l2.id}/quiz`, { token: B.token });
  checar("quiz de B não mostra as respostas de A", quizB.corpo.perguntas.every((p) => !p.jaRespondida && p.podePontuar));
  const missoesB = await chamar("GET", "/api/missoes", { token: B.token });
  checar("missões de B não mostram os registros de A", missoesB.corpo.every((m) => m.diasRegistrados === 0));

  const mapa = await chamar("GET", "/api/mapa/pontos?tipo=coleta");
  checar("GET /api/mapa/pontos?tipo=coleta → 2 pontos", mapa.status === 200 && mapa.corpo.length === 2);
  const bairros = await chamar("GET", "/api/rankings?tipo=bairros");
  checar(
    "GET /api/rankings?tipo=bairros → só bairros com pontos, a partir da posição 1",
    bairros.status === 200 && bairros.corpo.length >= 1 && bairros.corpo.every((b) => b.pontos > 0) && bairros.corpo[0].posicao === 1,
    JSON.stringify(bairros.corpo),
  );
  const escolas = await chamar("GET", "/api/rankings?tipo=escolas");
  checar("GET /api/rankings?tipo=escolas → nenhuma escola com 0 pontos", escolas.status === 200 && escolas.corpo.every((e) => e.pontos > 0));
}

async function verificarTrocasECors({ A, B }) {
  console.log(`\n— Limite de trocas e CORS (${env.api})`);
  const chamar = async (metodo, caminho, { token, body, origem } = {}) => {
    const r = await fetch(`${env.api}${caminho}`, {
      method: metodo,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(origem ? { origin: origem } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const texto = await r.text();
    return { status: r.status, corpo: texto ? JSON.parse(texto) : null, cabecalhos: r.headers };
  };

  const inicial = await chamar("GET", "/api/perfil", { token: B.token });
  checar(
    "GET /api/perfil informa 3 trocas restantes, sem data",
    inicial.corpo.limite_trocas === 3 && inicial.corpo.trocas_restantes === 3 && inicial.corpo.proxima_troca_em === null,
    JSON.stringify(inicial.corpo),
  );

  const bairros = (await chamar("GET", "/api/bairros")).corpo.map((b) => b.id);
  const [b1, b2, b3, b4] = bairros.slice(1, 5);
  for (const [i, bairro] of [b1, b2, b3].entries()) {
    const r = await chamar("PUT", "/api/perfil", { token: B.token, body: { primeiro_nome: "Bia", bairro_id: bairro } });
    checar(
      `troca ${i + 1} de bairro permitida (restam ${2 - i})`,
      r.status === 200 && r.corpo.bairro_id === bairro && r.corpo.trocas_restantes === 2 - i,
      JSON.stringify(r.corpo),
    );
  }
  const esgotado = await chamar("GET", "/api/perfil", { token: B.token });
  checar(
    "sem trocas restantes, GET /api/perfil traz a data de liberação",
    esgotado.corpo.trocas_restantes === 0 && typeof esgotado.corpo.proxima_troca_em === "string",
    JSON.stringify(esgotado.corpo),
  );
  const quarta = await chamar("PUT", "/api/perfil", { token: B.token, body: { primeiro_nome: "Bia", bairro_id: b4 } });
  checar(
    "4ª troca em 30 dias → 429 LIMITE_DE_TROCAS com a data de liberação",
    quarta.status === 429 && quarta.corpo.erro?.codigo === "LIMITE_DE_TROCAS" && /a partir de \d{2}\/\d{2} às \d{2}:\d{2}/.test(quarta.corpo.erro.mensagem),
    JSON.stringify(quarta.corpo),
  );
  const soNome = await chamar("PUT", "/api/perfil", { token: B.token, body: { primeiro_nome: "Beatriz", bairro_id: b3 } });
  checar("mudar só o nome continua permitido", soNome.status === 200 && soNome.corpo.primeiro_nome === "Beatriz");
  const direto = await B.cliente.from("perfis").update({ bairro_id: b4 }).eq("id", B.id).select();
  checar("NÃO burla o limite gravando direto no Supabase", direto.error?.code === "CE001", JSON.stringify(direto.error ?? direto.data));
  const trocasB = await B.cliente.from("trocas_local").select("perfil_id");
  checar("B lê as próprias 3 trocas", !trocasB.error && trocasB.data.length === 3, trocasB.error?.message);
  const trocasA = await A.cliente.from("trocas_local").select("perfil_id");
  checar("A NÃO lê as trocas de B", !trocasA.error && trocasA.data.every((t) => t.perfil_id === A.id));
  checar("B NÃO apaga o histórico de trocas", Boolean((await B.cliente.from("trocas_local").delete().eq("perfil_id", B.id).select()).error));

  const preflight = await chamar("OPTIONS", "/api/bairros", { origem: "http://localhost:5173" });
  checar(
    "CORS: preflight da origem permitida → 204 com Access-Control-Allow-Origin",
    preflight.status === 204 && preflight.cabecalhos.get("access-control-allow-origin") === "http://localhost:5173",
  );
  const estranha = await chamar("GET", "/api/bairros", { origem: "https://site-estranho.com" });
  checar("CORS: origem fora da lista não é liberada", !estranha.cabecalhos.get("access-control-allow-origin"));
}

try {
  const contexto = await verificarBanco();
  await verificarBancoDia2(contexto);
  if (env.api) {
    await verificarRotas(contexto);
    await verificarRotasDia2(contexto);
    await verificarTrocasECors(contexto);
  } else console.log("\n(API_URL não definida: rotas não verificadas)");
} catch (e) {
  falhas++;
  console.error(`\n✘ Erro: ${e.message}`);
} finally {
  for (const id of criados) await admin.auth.admin.deleteUser(id);
  console.log(`\nUsuários de teste removidos: ${criados.length}`);
  console.log(falhas === 0 ? "TUDO OK" : `${falhas} verificação(ões) falharam`);
  process.exit(falhas === 0 ? 0 : 1);
}
