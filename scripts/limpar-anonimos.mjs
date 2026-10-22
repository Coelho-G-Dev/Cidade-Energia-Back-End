import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DIAS_PADRAO = 30;

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
    secreta: pegar("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
  };
}

const apagar = process.argv.includes("--apagar");
const argumentoDias = process.argv.find((a) => a.startsWith("--dias="));
const dias = argumentoDias ? Number(argumentoDias.slice("--dias=".length)) : DIAS_PADRAO;
if (!Number.isInteger(dias) || dias < 7) {
  console.error("Use --dias=N com N inteiro, de 7 dias para cima.");
  process.exit(1);
}

const env = lerEnv();
if (!env.url || !env.secreta) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(env.url, env.secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.rpc("anonimos_inativos", { p_dias: dias });
if (error) {
  console.error(`Não foi possível listar os anônimos inativos: ${error.message}`);
  process.exit(1);
}

const porMes = new Map();
for (const u of data) {
  const mes = String(u.ultima_atividade).slice(0, 7);
  porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
}
console.log(`Anônimos sem primeiro nome e sem atividade há ${dias} dias: ${data.length}`);
for (const [mes, n] of [...porMes].sort()) console.log(`  última atividade em ${mes}: ${n}`);

if (!apagar) {
  console.log("\nSimulação: nada foi apagado. Para apagar, rode de novo com --apagar.");
} else {
  let apagados = 0;
  const falhas = [];
  for (const u of data) {
    const { error: erro } = await admin.auth.admin.deleteUser(u.id);
    if (erro) falhas.push(erro.message);
    else apagados++;
  }
  console.log(`\nApagados: ${apagados}. Falhas: ${falhas.length}.`);
  if (falhas.length) {
    console.log(`Primeira falha: ${falhas[0]}`);
    process.exitCode = 1;
  }
}
