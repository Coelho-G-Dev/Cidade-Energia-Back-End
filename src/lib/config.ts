export const DIAS_POR_MES = 30;
export const TARIFA_PADRAO_R_KWH = 0.8888;
export const POTENCIA_PLACA_KWP = 0.55;
export const CUSTO_SISTEMA_POR_KWP = 2840;
export const FATOR_PERDAS = 0.8;
export const IRRADIACAO_MEDIA_SAO_LUIS = 5.226;
export const FATOR_EMISSAO_KG_CO2_KWH = 0.0461;
export const PERCENTUAL_ECONOMIA_PADRAO = 0.1;

export type RegraEconomia = { dica: string } & ({ reducaoHorasDia: number } | { reducaoPercentual: number });

export const REGRAS_ECONOMIA: Readonly<Record<string, RegraEconomia>> = {
  ar_condicionado: { reducaoHorasDia: 1, dica: "Usar o ar-condicionado 1 hora a menos por dia" },
  chuveiro: { reducaoHorasDia: 10 / 60, dica: "Tomar banhos 10 minutos mais curtos por dia" },
  geladeira: { reducaoPercentual: 0.1, dica: "Abrir a geladeira só quando precisar" },
  tv: { reducaoHorasDia: 1, dica: "Desligar a TV quando ninguém estiver assistindo" },
  lampada_led: { reducaoHorasDia: 1, dica: "Apagar as luzes de cômodos vazios" },
  ventilador: { reducaoHorasDia: 1, dica: "Desligar o ventilador ao sair do cômodo" },
};

export const FUSO_SAO_LUIS = "America/Fortaleza";
export const LATITUDE_SAO_LUIS = -2.53;
export const LONGITUDE_SAO_LUIS = -44.3;

export const NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal";
export const DIAS_BUSCA_IRRADIACAO = 10;
export const HORAS_CACHE_IRRADIACAO = 6;
// Espera técnica após uma tentativa sem sucesso, inclusive uma reserva interrompida.
export const MINUTOS_RETENTATIVA_NASA = 30;
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
export const TUTOR_SIMILARIDADE_MINIMA = 0.64;
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

export const LIMITE_SIMULACAO_PUBLICA_POR_MINUTO = 600;
export const LIMITE_PREVIA_POR_PERFIL = 120;
export const JANELA_LIMITE_PREVIA_POR_PERFIL = "10 minutes";
export const LIMITE_ACOES_POR_PERFIL = 120;
export const JANELA_LIMITE_ACOES_POR_PERFIL = "10 minutes";
export const PONTOS_BAIRRO_UNIDO = 500;

export const CACHE_CONTEUDO_SEGUNDOS = 300;
export const CACHE_SOL_DE_HOJE_SEGUNDOS = 600;
export const CACHE_DOCUMENTACAO_SEGUNDOS = 3600;

export const TRILHA_ENERGIA_SOLAR = "energia-solar-em-sao-luis";
export const TRILHA_CONTA_DE_LUZ = "entendendo-a-sua-conta-de-luz";
export const MISSAO_AR_CONDICIONADO = "ar-desligado-antes-de-dormir";
export const MISSAO_DESCARTE = "descarte-de-lixo-eletronico";

export const FONTES = {
  DIAS_POR_MES:
    "Convenção didática de 30 dias por mês para estimar consumo e geração; não é a duração de todo ciclo real. Referência de faturamento: REN ANEEL nº 1.000/2021. https://www2.aneel.gov.br/cedoc/ren20211000.pdf (HTTP 403 no curl em 17/nov/2026, bloqueio de robô; link preservado). Página oficial alternativa (HTTP 200 em 17/nov/2026): https://www.gov.br/aneel/pt-br/assuntos/campanhas/resolucao-1000-da-aneel-seus-direitos-sobre-energia-eletrica-agora-num-so-lugar-2022",
  TARIFA_PADRAO_R_KWH:
    "Tarifa residencial convencional B1 da Equatorial Maranhão: R$ 0,8888/kWh (TE + TUSD), sem ICMS, PIS/COFINS e contribuição de iluminação pública, vigente desde 28/ago/2026 (reajuste residencial de 5,20%). Considera bandeira verde, sem acréscimo. Referência da T-009: ANEEL, REH nº 3.604/2026; ato e tabela tarifária específicos: fonte a localizar. Ver CONSTANTES.md.",
  POTENCIA_PLACA_KWP:
    "Estimativa didática de módulo de 550 Wp. Referência documental da T-009: Elgin, modelo 350550ZS0000. https://content.elgin.com.br/assets/arquivos/350550ZS0000-Placa-solar-550W.pdf (consulta registrada na T-009: 17/nov/2026).",
  CUSTO_SISTEMA_POR_KWP:
    "Estimativa. Sistema residencial de 4 kWp instalado custava em média R$ 11.360 em jun/2025 (≈ R$ 2.840/kWp). Referência setorial: Greener, Estudo Estratégico de Geração Distribuída, 1º semestre de 2025; não é cotação atual nem de qualquer porte. Relatório específico: fonte a localizar; o link do catálogo da T-009 retornou HTTP 404 em 17/nov/2026.",
  FATOR_PERDAS:
    "Estimativa. Performance ratio didático de 0,8. Referência: CRESESB/CEPEL, Manual de Engenharia para Sistemas Fotovoltaicos, edição revista de 2014 (Pinho e Galdino). https://cresesb.cepel.br/publicacoes/download/Manual_de_Engenharia_FV_2014.pdf (consulta registrada na T-009: 17/nov/2026).",
  IRRADIACAO_MEDIA_SAO_LUIS:
    "Reserva usada quando a NASA POWER e o cache falham: média anual climatológica (2001–2025) de ALLSKY_SFC_SW_DWN no plano horizontal, 5,226 kWh/m²/dia (lat -2.53, lon -44.30), consultada em 16/out/2026. Fonte: NASA POWER, Climatology API.",
  SOL_DE_HOJE:
    "Estimativa. Irradiação diária ALLSKY_SFC_SW_DWN do último dia com dado nos últimos 10 dias (os dados chegam com alguns dias de atraso). Fonte: NASA POWER, Daily API, community RE.",
  FATOR_EMISSAO_KG_CO2_KWH:
    "Estimativa. Média anual do SIN em 2025: 0,0461 kg CO₂/kWh (46,1 kg CO₂/MWh). Fonte: MCTI/SIRENE, planilha oficial Inventario_2026_janset.xlsx, conferida pelo maestro em 17/nov/2026 e adotada na D-010. https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sirene/dados-e-ferramentas/fatores-de-emissao/arquivo/Inventario_2026_janset.xlsx",
  PERCENTUAL_ECONOMIA_PADRAO:
    "Estimativa de 10%: premissa didática do app, inspirada nas recomendações qualitativas do PROCEL/ENBPar. O percentual não é um número publicado pelo PROCEL. Documento qualitativo específico: fonte a localizar.",
  REGRAS_ECONOMIA:
    "As seis regras são premissa didática do app, inspirada nas recomendações qualitativas do PROCEL/ENBPar: 1 h a menos por dia de ar-condicionado, TV, lâmpada e ventilador, 10 min a menos de banho e 10% a menos de consumo da geladeira. Esses valores não são números publicados pelo PROCEL. Documento qualitativo específico: fonte a localizar.",
} as const;
