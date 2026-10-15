export const DIAS_POR_MES = 30;
export const TARIFA_PADRAO_R_KWH = 0.8888;
export const POTENCIA_PLACA_KWP = 0.55;
export const CUSTO_SISTEMA_POR_KWP = 2840;
export const FATOR_PERDAS = 0.8;
export const IRRADIACAO_MEDIA_SAO_LUIS = 5.4;
export const FATOR_EMISSAO_KG_CO2_KWH = 0.0385;
export const PERCENTUAL_ECONOMIA_PADRAO = 0.1;

export const REGRAS_ECONOMIA: Readonly<Record<string, { reducaoHorasDia: number; dica: string }>> = {
  ar_condicionado: { reducaoHorasDia: 1, dica: "Usar o ar-condicionado 1 hora a menos por dia" },
  chuveiro: { reducaoHorasDia: 10 / 60, dica: "Tomar banhos 10 minutos mais curtos por dia" },
};

export const FONTES = {
  TARIFA_PADRAO_R_KWH:
    "Tarifa residencial convencional B1 da Equatorial Maranhão: R$ 0,8888/kWh (TE + TUSD), sem ICMS, PIS/COFINS e contribuição de iluminação pública, vigente desde 28/ago/2026 (reajuste residencial de 5,20%). Considera bandeira verde, sem acréscimo. Fonte: ANEEL, valores homologados (dados públicos).",
  POTENCIA_PLACA_KWP: "Estimativa. Módulo residencial comum de 550 Wp. Fonte: catálogos de fabricantes.",
  CUSTO_SISTEMA_POR_KWP:
    "Estimativa. Sistema residencial de 4 kWp instalado custava em média R$ 11.360 em jun/2025 (≈ R$ 2.840/kWp). Fonte: Greener, Estudo Estratégico Geração Distribuída 2025.",
  FATOR_PERDAS:
    "Estimativa. Performance ratio didático de 0,8. Fonte: CRESESB, Manual de Engenharia para Sistemas Fotovoltaicos.",
  IRRADIACAO_MEDIA_SAO_LUIS:
    "Estimativa provisória, média anual no plano horizontal (lat -2.53, lon -44.30). Fonte: CRESESB SunData / NASA POWER.",
  FATOR_EMISSAO_KG_CO2_KWH:
    "Estimativa. Média anual do SIN em 2023 (38,5 kg CO₂/MWh). Fonte: MCTI/SIRENE, fatores de emissão de CO₂ do SIN.",
  PERCENTUAL_ECONOMIA_PADRAO: "Estimativa. Meta didática de 10% com mudança de hábitos. Fonte: PROCEL, dicas de economia.",
  REGRAS_ECONOMIA: "Estimativa didática: 1 h a menos de ar-condicionado e 10 min a menos de banho por dia.",
} as const;
