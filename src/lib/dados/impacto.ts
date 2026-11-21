import type { SupabaseClient } from "@supabase/supabase-js";
import { resumirPotencialHabitos } from "@/lib/calculos/impacto";
import { impactoSchema } from "@/lib/validacao/painel";

const agregadoSchema = impactoSchema.omit({ economiaEstimada: true }).extend({
  economiaEstimada: impactoSchema.shape.economiaEstimada.omit({ comoCalculamos: true }),
});

export async function obterImpacto(admin: SupabaseClient, periodo: { de: string; ate: string }) {
  const { data, error } = await admin.rpc("painel_impacto", { p_de: periodo.de, p_ate: periodo.ate });
  if (error) throw new Error("Não foi possível consultar o painel de impacto.");
  const resultado = agregadoSchema.safeParse(data);
  if (!resultado.success) throw new Error("Resposta inválida do painel de impacto.");
  const agregado = resultado.data;
  if (agregado.periodo.de !== periodo.de || agregado.periodo.ate !== periodo.ate) throw new Error("Período inválido do painel de impacto.");
  return impactoSchema.parse({ ...agregado, economiaEstimada: resumirPotencialHabitos(agregado.economiaEstimada.potencialHabitos) });
}
