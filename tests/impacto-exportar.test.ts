import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as exportar } from "@/app/api/impacto/exportar/route";
import { GET as impacto } from "@/app/api/impacto/route";
import { COMO_CALCULAMOS_POTENCIAL_HABITOS } from "@/lib/calculos/impacto";
import { escaparCelula, exportarImpactoCsv, gerarCsv } from "@/lib/exportacao/csv";
import { impactoSchema } from "@/lib/validacao/painel";
import { agregadoImpacto } from "./apoio/impacto";
import { supabaseFalso, usou } from "./apoio/supabase-falso";

const admin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ clienteAdmin: admin }));
let dados: unknown;
let banco: ReturnType<typeof supabaseFalso>;
const CHAVE = "chave-ficticia-impacto";
const periodo = "de=2026-11-20&ate=2026-11-20";
const pedido = (query = `${periodo}&formato=csv`, chave: string | null = CHAVE) => new Request(`http://localhost/api/impacto/exportar?${query}`, {
  headers: chave === null ? {} : { "X-Chave-Impacto": chave },
});
function lerCsv(csv: string): string[][] {
  const linhas: string[][] = []; let linha: string[] = []; let celula = ""; let aspas = false;
  const texto = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') {
      if (aspas && texto[i + 1] === '"') { celula += '"'; i++; } else aspas = !aspas;
    } else if (!aspas && c === ";") { linha.push(celula); celula = "";
    } else if (!aspas && c === "\n") { linha.push(celula); linhas.push(linha); linha = []; celula = "";
    } else if (!aspas && c === "\r" && texto[i + 1] === "\n") { continue;
    } else celula += c;
  }
  if (linha.length || celula) { linha.push(celula); linhas.push(linha); }
  return linhas;
}
function completo() {
  const bruto = agregadoImpacto();
  return impactoSchema.parse({ ...bruto, economiaEstimada: { ...bruto.economiaEstimada,
    comoCalculamos: { potencialHabitos: COMO_CALCULAMOS_POTENCIAL_HABITOS },
  } });
}
beforeEach(() => {
  vi.stubEnv("IMPACTO_CHAVE", CHAVE); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-21T14:00:00Z"));
  dados = agregadoImpacto(); banco = supabaseFalso(() => ({ data: dados })); admin.mockReset(); admin.mockReturnValue(banco.cliente);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("CSV: escape e injeção de fórmula", () => {
  it.each([
    ["normal", "normal"], ["a;b", '"a;b"'], ['a"b', '"a""b"'], ["a\nb", '"a\nb"'], ["a\r\nb", '"a\r\nb"'],
  ])("escapa %j sem perder o conteúdo", (valor, esperado) => {
    expect(escaparCelula(valor)).toBe(esperado);
    expect(lerCsv(gerarCsv([[valor]]))).toEqual([[valor]]);
  });
  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "  =1+1", "\t=1+1", "\r=1+1", "\n=1+1", '=HYPERLINK("https://exemplo.invalid";"abrir")'])("neutraliza fórmula %j antes de escapar", (valor) => {
    expect(lerCsv(gerarCsv([[valor]]))[0]![0]).toBe(`'${valor}`);
  });
  it("a observação de economia também passa pela proteção", () => {
    const i = completo(); i.economiaEstimada.comoCalculamos.potencialHabitos = '=1+1;"teste"\nlinha';
    const linhas = lerCsv(exportarImpactoCsv(i));
    expect(linhas.find((l) => l[0] === "Estudantes no potencial de hábitos")![5]).toBe(`'${i.economiaEstimada.comoCalculamos.potencialHabitos}`);
    expect(linhas.every((linha) => linha.length === 6)).toBe(true);
  });
});

describe("GET /api/impacto/exportar", () => {
  it("BOM UTF-8 real, tipo, separador, decimal pt-BR e nome do arquivo", async () => {
    const r = await exportar(pedido()); expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="cidade-energia-impacto-2026-11-21.csv"');
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    const bytes = new Uint8Array(await r.arrayBuffer()); expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    const texto = new TextDecoder().decode(bytes);
    expect(texto).toContain("indicador;valor;unidade;periodo_de;periodo_ate;observacao\r\n");
    expect(texto).toContain("Potencial de hábitos em reais por mês;41,2;R$/mês;");
    const linhas = lerCsv(texto); expect(linhas).toHaveLength(23); expect(linhas.every((l) => l.length === 6)).toBe(true);
  });
  it("todos os números e o período batem com GET /api/impacto, usando a mesma RPC", async () => {
    const json = await (await impacto(new Request(`http://localhost/api/impacto?${periodo}`, { headers: { "X-Chave-Impacto": CHAVE } }))).json();
    const csv = lerCsv(await (await exportar(pedido())).text());
    const esperados: Record<string, number | null> = {
      "Estudantes com perfil": json.estudantes.comPerfil, "Estudantes ativos no período": json.estudantes.ativosNoPeriodo,
      "Estudantes verificados por turma": json.estudantes.verificadosPorTurma,
      "Escolas com estudantes": json.escolas.comEstudantes, "Escolas com turma": json.escolas.comTurma,
      "Bairros com estudantes": json.bairros.comEstudantes, "Lições concluídas": json.aprendizado.licoesConcluidas,
      "Trilhas concluídas": json.aprendizado.trilhasConcluidas, "Respostas do quiz": json.aprendizado.respostasDoQuiz,
      "Acertos do quiz": json.aprendizado.percentualAcertos, "Noites de missão registradas": json.missoes.registros,
      "Missões concluídas": json.missoes.concluidas, "Simulações salvas": json.simulacoes.salvas,
      "Estudantes que simularam": json.simulacoes.estudantesQueSimularam,
      "Potencial de hábitos em kWh por mês": json.economiaEstimada.potencialHabitos.kwhMes,
      "Potencial de hábitos em reais por mês": json.economiaEstimada.potencialHabitos.reaisMes,
      "Estudantes no potencial de hábitos": json.economiaEstimada.potencialHabitos.estudantes,
      "Diagnóstico geral — estudantes pareados": json.aprendizado.diagnostico.estudantes,
      "Diagnóstico geral — acerto médio antes": json.aprendizado.diagnostico.acertoMedioAntes,
      "Diagnóstico geral — acerto médio depois": json.aprendizado.diagnostico.acertoMedioDepois,
      "Respostas do Energinho avaliadas": json.energinho.respostasAvaliadas,
      "Respostas do Energinho avaliadas como úteis": json.energinho.percentualUtil,
    };
    expect(csv.slice(1).map((l) => l[0]).sort()).toEqual(Object.keys(esperados).sort());
    for (const [indicador, valor, , de, ate, observacao] of csv.slice(1)) {
      const esperado = esperados[indicador!];
      expect(valor).toBe(esperado === null ? "" : String(esperado).replace(".", ","));
      expect({ de, ate }).toEqual(json.periodo);
      if (esperado === null) expect(observacao).toBe(indicador === "Acertos do quiz" || indicador?.includes("acerto médio") || indicador === "Respostas do Energinho avaliadas como úteis" ? "menos de 5 respondentes" : "menos de 3 estudantes");
    }
    expect(banco.operacoes.map((o) => [o.tabela, usou(o, "rpc")?.args])).toEqual([
      ["rpc:painel_impacto", [{ p_de: "2026-11-20", p_ate: "2026-11-20" }]],
      ["rpc:painel_impacto", [{ p_de: "2026-11-20", p_ate: "2026-11-20" }]],
    ]);
    for (const l of csv.filter((l) => l[0]?.includes("Potencial de hábitos") || l[0] === "Estudantes no potencial de hábitos")) expect(l[5]).toBe(json.economiaEstimada.comoCalculamos.potencialHabitos);
  });
  it("null sai vazio com aviso e explicação; zero visível permanece zero", () => {
    const i = completo(); i.economiaEstimada.potencialHabitos = { reaisMes: null, kwhMes: null, estudantes: null };
    i.aprendizado.percentualAcertos = 0;
    const linhas = lerCsv(exportarImpactoCsv(i));
    expect(linhas.find((l) => l[0] === "Acertos do quiz")![1]).toBe("0");
    for (const l of linhas.filter((l) => l[0]?.includes("Potencial de hábitos") || l[0] === "Estudantes no potencial de hábitos")) {
      expect(l[1]).toBe(""); expect(l[5]).toContain("menos de 3 estudantes");
      expect(l[5]).toContain(COMO_CALCULAMOS_POTENCIAL_HABITOS);
    }
  });
  it("percentual oculto usa o limiar de 5 no CSV, sem ocultar contagens com 3", async () => {
    const linhas = lerCsv(await (await exportar(pedido())).text());
    expect(linhas.find((l) => l[0] === "Acertos do quiz")!.slice(1)).toEqual(["", "%", "2026-11-20", "2026-11-20", "menos de 5 respondentes"]);
    expect(linhas.find((l) => l[0] === "Estudantes com perfil")![1]).toBe("3");
    expect(linhas.find((l) => l[0] === "Respostas do quiz")![1]).toBe("6");
  });
  it("formato omitido também gera CSV", async () => {
    expect((await exportar(pedido(periodo))).status).toBe(200);
  });
  it.each([`${periodo}&formato=pdf`, `${periodo}&formato=json`, `${periodo}&extra=1`, `${periodo}&formato=csv&formato=csv`, "de=2026-02-30"])("rejeita formato ou filtro inválido: %s", async (query) => {
    const r = await exportar(pedido(query)); expect(r.status).toBe(400);
    expect((await r.json()).erro.codigo).toBe("ENTRADA_INVALIDA"); expect(admin).not.toHaveBeenCalled();
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });
  it("sem variável: 503; chave errada/ausente: 401, sem banco nem CSV parcial", async () => {
    vi.stubEnv("IMPACTO_CHAVE", undefined);
    const desligado = await exportar(pedido()); expect(desligado.status).toBe(503);
    expect((await desligado.json()).erro.codigo).toBe("IMPACTO_DESLIGADO");
    vi.stubEnv("IMPACTO_CHAVE", CHAVE);
    for (const chave of [null, "errada"]) {
      const r = await exportar(pedido(undefined, chave)); expect(r.status).toBe(401);
      expect((await r.json()).erro.codigo).toBe("NAO_AUTENTICADO");
      expect(r.headers.get("content-disposition")).toBeNull();
    }
    expect(admin).not.toHaveBeenCalled();
  });
});
