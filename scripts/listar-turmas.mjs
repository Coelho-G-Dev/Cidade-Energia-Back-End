import { existsSync, readFileSync } from "node:fs";
import { parseArgs, parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const USO = 'Uso: npm run turmas:listar -- --inep 21016631 ou --bairro "Alemanha"';

async function executar() {
  let valores;
  try {
    valores = parseArgs({ options: { inep: { type: "string" }, bairro: { type: "string" }, help: { type: "boolean" } } }).values;
  } catch {
    throw new Error(USO);
  }
  if (valores.help) {
    console.log(USO);
    return;
  }
  const filtro = z.union([
    z.object({ inep: z.string().regex(/^\d{8}$/) }).strict(),
    z.object({ bairro: z.string().trim().min(1).max(200) }).strict(),
  ]).safeParse(valores);
  if (!filtro.success) throw new Error(USO);

  // Só lê a configuração local; nenhum segredo é incluído na saída ou em erros.
  const local = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
  const pegar = (...nomes) => nomes.map((nome) => process.env[nome] || local[nome]).find(Boolean);
  const url = pegar("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const chave = pegar("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  if (!url || !chave) throw new Error("Configure a URL do Supabase e a chave de serviço no .env.local.");

  const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const escolas = [];
  const tamanhoPagina = 1000;
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    let consulta = admin.from("escolas")
      .select("nome,codigo_turma,bairros!inner(nome)")
      .eq("ativa", true)
      .not("codigo_turma", "is", null)
      .order("nome").order("id")
      .range(inicio, inicio + tamanhoPagina - 1);
    consulta = "inep" in filtro.data
      ? consulta.eq("codigo_inep", filtro.data.inep)
      : consulta.eq("bairros.nome", filtro.data.bairro);
    const { data, error } = await consulta;
    if (error || !data) throw new Error("Não foi possível consultar os códigos de turma. Confira a configuração e tente novamente.");
    escolas.push(...data);
    if (data.length < tamanhoPagina) break;
  }
  if (escolas.length === 0) {
    console.log("Nenhuma escola ativa com código de turma encontrada para esse filtro.");
    return;
  }
  console.log("Escola\tBairro\tCódigo de turma");
  // Escapa quebras de linha e tabs vindos do banco para manter uma escola por linha.
  const celula = (valor) => String(valor).replace(/[\r\n\t]/g, " ");
  for (const escola of escolas) {
    console.log([escola.nome, escola.bairros.nome, escola.codigo_turma].map(celula).join("\t"));
  }
}

try {
  await executar();
} catch (erro) {
  // Não expõe mensagem de rede, URL, cabeçalhos ou respostas do Supabase.
  const mensagem = erro instanceof Error && (erro.message === USO || erro.message.startsWith("Configure ") || erro.message.startsWith("Não foi possível consultar "))
    ? erro.message : "Não foi possível listar os códigos de turma. Confira a configuração e tente novamente.";
  console.error(mensagem);
  process.exitCode = 1;
}
