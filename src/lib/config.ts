export const DIAS_POR_MES = 30;
export const TARIFA_PADRAO_R_KWH = 0.8888;
export const POTENCIA_PLACA_KWP = 0.55;
export const CUSTO_SISTEMA_POR_KWP = 2840;
export const FATOR_PERDAS = 0.8;
export const IRRADIACAO_MEDIA_SAO_LUIS = 5.226;
export const FATOR_EMISSAO_KG_CO2_KWH = 0.0385;
export const PERCENTUAL_ECONOMIA_PADRAO = 0.1;

export const REGRAS_ECONOMIA: Readonly<Record<string, { reducaoHorasDia: number; dica: string }>> = {
  ar_condicionado: { reducaoHorasDia: 1, dica: "Usar o ar-condicionado 1 hora a menos por dia" },
  chuveiro: { reducaoHorasDia: 10 / 60, dica: "Tomar banhos 10 minutos mais curtos por dia" },
};

export const FUSO_SAO_LUIS = "America/Fortaleza";
export const LATITUDE_SAO_LUIS = -2.53;
export const LONGITUDE_SAO_LUIS = -44.3;

export const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal";
export const DIAS_BUSCA_IRRADIACAO = 10;
export const HORAS_CACHE_IRRADIACAO = 6;
export const HORAS_CACHE_CLIMATOLOGIA = 24 * 30;
export const TIMEOUT_NASA_POWER_MS = 8000;
export const IRRADIACAO_MAXIMA_VALIDA = 15;
export const CODIGO_AR_CONDICIONADO = "ar_condicionado";

export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
export const MODELO_EMBEDDING = "gemini-embedding-2";
export const DIMENSAO_EMBEDDING = 768;
export const TIMEOUT_GEMINI_MS = 20000;
export const EMBEDDINGS_POR_LOTE = 50;

export const TRECHO_MAXIMO_CARACTERES = 800;
export const SOBREPOSICAO_MAXIMA_CARACTERES = 200;

export const TUTOR_TRECHOS_BUSCADOS = 4;
export const TUTOR_SIMILARIDADE_MINIMA = 0.62;
export const TUTOR_DISTANCIA_DO_MELHOR = 0.08;
export const TUTOR_LIMITE_POR_HORA = 20;
export const TUTOR_MENSAGEM_MAXIMA = 500;
export const TUTOR_HISTORICO_MAXIMO = 10;
export const TUTOR_HISTORICO_TEXTO_MAXIMO = 1000;
export const TUTOR_MAX_TOKENS_SAIDA = 1024;
export const TUTOR_RESPOSTA_MAXIMA = 1500;

export const PONTOS_POR_ORIGEM = {
  primeira_simulacao: 20,
  licao_concluida: 10,
  resposta_correta: 5,
  pedale_concluido: 15,
} as const;

export const HORAS_ENTRE_TENTATIVAS_QUIZ = 24;
export const LIMITE_SIMULACAO_PUBLICA_POR_MINUTO = 600;
export const LIMITE_PREVIA_POR_PERFIL = 120;
export const JANELA_LIMITE_PREVIA_POR_PERFIL = "10 minutes";
export const PONTOS_BAIRRO_UNIDO = 500;

export const TRILHA_ENERGIA_SOLAR = "energia-solar-em-sao-luis";
export const TRILHA_CONTA_DE_LUZ = "entendendo-a-sua-conta-de-luz";
export const MISSAO_AR_CONDICIONADO = "ar-desligado-antes-de-dormir";
export const MISSAO_DESCARTE = "descarte-de-lixo-eletronico";

export const FONTES = {
  TARIFA_PADRAO_R_KWH:
    "Tarifa residencial convencional B1 da Equatorial Maranhão: R$ 0,8888/kWh (TE + TUSD), sem ICMS, PIS/COFINS e contribuição de iluminação pública, vigente desde 28/ago/2026 (reajuste residencial de 5,20%). Considera bandeira verde, sem acréscimo. Fonte: ANEEL, valores homologados (dados públicos).",
  POTENCIA_PLACA_KWP: "Estimativa. Módulo residencial comum de 550 Wp. Fonte: catálogos de fabricantes.",
  CUSTO_SISTEMA_POR_KWP:
    "Estimativa. Sistema residencial de 4 kWp instalado custava em média R$ 11.360 em jun/2025 (≈ R$ 2.840/kWp). Fonte: Greener, Estudo Estratégico Geração Distribuída 2025.",
  FATOR_PERDAS:
    "Estimativa. Performance ratio didático de 0,8. Fonte: CRESESB, Manual de Engenharia para Sistemas Fotovoltaicos.",
  IRRADIACAO_MEDIA_SAO_LUIS:
    "Reserva usada quando a NASA POWER e o cache falham: média anual climatológica (2001–2025) de ALLSKY_SFC_SW_DWN no plano horizontal, 5,226 kWh/m²/dia (lat -2.53, lon -44.30), consultada em 16/out/2026. Fonte: NASA POWER, Climatology API.",
  SOL_DE_HOJE:
    "Estimativa. Irradiação diária ALLSKY_SFC_SW_DWN do último dia com dado nos últimos 10 dias (os dados chegam com alguns dias de atraso). Fonte: NASA POWER, Daily API, community RE.",
  FATOR_EMISSAO_KG_CO2_KWH:
    "Estimativa. Média anual do SIN em 2023 (38,5 kg CO₂/MWh). Fonte: MCTI/SIRENE, fatores de emissão de CO₂ do SIN.",
  PERCENTUAL_ECONOMIA_PADRAO: "Estimativa. Meta didática de 10% com mudança de hábitos. Fonte: PROCEL, dicas de economia.",
  REGRAS_ECONOMIA: "Estimativa didática: 1 h a menos de ar-condicionado e 10 min a menos de banho por dia.",
} as const;
