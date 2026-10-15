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

try {
  const contexto = await verificarBanco();
  if (env.api) await verificarRotas(contexto);
  else console.log("\n(API_URL não definida: rotas não verificadas)");
} catch (e) {
  falhas++;
  console.error(`\n✘ Erro: ${e.message}`);
} finally {
  for (const id of criados) await admin.auth.admin.deleteUser(id);
  console.log(`\nUsuários de teste removidos: ${criados.length}`);
  console.log(falhas === 0 ? "TUDO OK" : `${falhas} verificação(ões) falharam`);
  process.exit(falhas === 0 ? 0 : 1);
}
