import { describe, expect, it } from "vitest";
import { impactoSchema } from "@/lib/validacao/painel";
import { obterImpacto } from "@/lib/dados/impacto";
import { exportarImpactoCsv } from "@/lib/exportacao/csv";
import { agregadoImpacto } from "./apoio/impacto";
import { supabaseFalso } from "./apoio/supabase-falso";
describe("acréscimos dos painéis D-013", () => {
  it.each([2, 3, 4, 5])("preserva diagnóstico e votos agregados/ocultos de %s estudantes, sem recalcular na API", async (n) => {
    const bruto = agregadoImpacto();
    const porTrilha = [{ slug: "solar", titulo: "Solar; teste", estudantes: n >= 3 ? n : null, acertoMedioAntes: n >= 5 ? 50 : null, acertoMedioDepois: n >= 5 ? 100 : null }];
    const geral = { estudantes: n >= 3 ? n : null, acertoMedioAntes: n >= 5 ? 50 : null, acertoMedioDepois: n >= 5 ? 100 : null, porTrilha };
    const respostaBanco = { ...bruto, aprendizado: { ...bruto.aprendizado, diagnostico: geral }, energinho: { respostasAvaliadas: n >= 3 ? n : null, percentualUtil: n >= 5 ? 80 : null } };
    const { cliente, operacoes } = supabaseFalso(() => ({ data: respostaBanco }));
    const r = await obterImpacto(cliente, bruto.periodo);
    expect(r.aprendizado.diagnostico).toEqual(geral); expect(r.energinho).toEqual(respostaBanco.energinho);
    expect(operacoes.map((o) => o.tabela)).toEqual(["rpc:painel_impacto"]);
    const csv = exportarImpactoCsv(r);
    expect(csv).toContain(`Diagnóstico geral — estudantes pareados;${n >= 3 ? n : ""};`);
    expect(csv).toContain(`Diagnóstico geral — acerto médio antes;${n >= 5 ? 50 : ""};`);
    expect(csv).toContain('"Diagnóstico: Solar; teste — acerto médio depois";');
    expect(csv).toContain(`Respostas do Energinho avaliadas como úteis;${n >= 5 ? 80 : ""};`);
    if (n < 5) expect(csv).toContain("menos de 5 respondentes");
  });
  it("novo formato continua estrito e não aceita linha de perfil", () => {
    const bruto = agregadoImpacto(); const dados = { ...bruto, economiaEstimada: { ...bruto.economiaEstimada, comoCalculamos: { potencialHabitos: "Teste" } } };
    expect(impactoSchema.safeParse(dados).success).toBe(true);
    expect(impactoSchema.safeParse({ ...dados, energinho: { ...dados.energinho, perfilId: "proibido" } }).success).toBe(false);
  });
});
