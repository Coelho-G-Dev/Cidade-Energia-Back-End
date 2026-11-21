# Constantes e premissas do Cidade Energia

Registro da T-010, em 2026-11-17, com base na [auditoria T-009](../docs/qa/fase1-constantes.md)
e nas ressalvas do maestro. Os valores são os atuais de `src/lib/config.ts` e
`supabase/seed.sql`. Na T-012, a D-010 aprovou a atualização do fator de emissão
para o ano-base 2025; os demais valores numéricos foram mantidos.

A coluna de consulta das fontes externas reproduz a data registrada pelo Hydrogen
na T-009. A conferência da planilha MCTI pelo maestro e a revisão de links por
`curl -L`, ambas em 17/11/2026, estão explicitadas abaixo; as demais referências
não representam nova conferência independente dos números pelo Codex.
Onde a auditoria só forneceu página inicial, catálogo ou referência sem documento
específico, consta **fonte a localizar**. Plausibilidade não substitui fonte do número.

Nas células entre crases, números usam ponto decimal e frações simples para comparação
automática por `tests/constantes.test.ts`. As tabelas cobrem também parâmetros internos
numéricos para que novos exports numéricos não fiquem fora do registro.

## Cálculos do simulador e do Sol de hoje

| Nome | Valor no código | Unidade | Onde aparece no app | Fonte e situação | Consulta registrada |
| --- | --- | --- | --- | --- | --- |
| `DIAS_POR_MES` | `30` | dias/mês | Consumo mensal, geração mensal e estimativa de placas | Convenção didática de mês de 30 dias; [REN ANEEL nº 1.000/2021 — PDF](https://www2.aneel.gov.br/cedoc/ren20211000.pdf) como referência de faturamento (HTTP 403 no curl em 17/11/2026, bloqueio de robô; link preservado). Acesso alternativo: [página oficial da Resolução 1.000 no portal da ANEEL](https://www.gov.br/aneel/pt-br/assuntos/campanhas/resolucao-1000-da-aneel-seus-direitos-sobre-energia-eletrica-agora-num-so-lugar-2022), HTTP 200. Não significa que todo ciclo real tenha 30 dias. | 2026-11-17 |
| `TARIFA_PADRAO_R_KWH` | `0.8888` | R$/kWh | Custo e economia quando não há tarifa calculada a partir da conta informada | B1 convencional Equatorial Maranhão, TE + TUSD, sem ICMS, PIS/COFINS e iluminação pública; bandeira verde; vigência informada desde 28/08/2026. A T-009 cita **REH ANEEL nº 3.604/2026** e [notícia da ANEEL](https://www.gov.br/aneel/pt-br/assuntos/noticias/2026-defeso-eleitoral/aneel-aprova-reajuste-tarifario-anual-da-equatorial-maranhao). Dataset Tarifas Homologadas: **fonte a localizar** (link anterior retornou 404). Link do ato e registro/linha B1 que sustentam o valor exato: **fonte a localizar**. | 2026-11-17 |
| `POTENCIA_PLACA_KWP` | `0.55` | kWp/placa | Energia por placa, número de placas e dimensionamento | Referência didática de módulo de 550 Wp. Documentos específicos trazidos na revisão da T-009: [Elgin 350550ZS0000, 550 W (PDF)](https://content.elgin.com.br/assets/arquivos/350550ZS0000-Placa-solar-550W.pdf) e [WEG WPV 550–555 HMM0 (PDF)](https://static.weg.net/medias/downloadcenter/h69/h16/WEG-wpv-550-555-hmm0-install-guides-pt.pdf). Não significa escolha ou recomendação de compra desses modelos. | 2026-11-17 |
| `CUSTO_SISTEMA_POR_KWP` | `2840` | R$/kWp | Custo do sistema e retorno estimado | Greener, Estudo Estratégico de Geração Distribuída, **1º semestre de 2025**, porte **4 kWp**, **jun/2025**: R$ 11.360 ÷ 4 kWp. Referência setorial privada; não é cotação atual nem vale para qualquer porte. Relatório/trecho específico: **fonte a localizar** (link anterior do catálogo retornou 404). | 2026-11-17 |
| `FATOR_PERDAS` | `0.8` | adimensional (PR de 80%) | Geração solar estimada no simulador e no Sol de hoje | Escolha didática de performance ratio; referência: CRESESB/CEPEL, Pinho e Galdino, [Manual de Engenharia para Sistemas Fotovoltaicos, edição revista de **2014**](https://cresesb.cepel.br/publicacoes/download/Manual_de_Engenharia_FV_2014.pdf). Não é rendimento garantido de uma instalação. | 2026-11-17 |
| `IRRADIACAO_MEDIA_SAO_LUIS` | `5.226` | kWh/m²/dia | Valor de reserva quando NASA/cache não estão disponíveis | NASA POWER, ALLSKY_SFC_SW_DWN, ANN da climatologia 2001–2025, community RE; [consulta direta](https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=-44.3&latitude=-2.53&format=JSON). Registro original no código: 16/10/2026; reconferência declarada pela T-009: 17/11/2026. | 2026-11-17 |
| `LATITUDE_SAO_LUIS` | `-2.53` | graus decimais | Ponto consultado no serviço NASA POWER | Ponto de referência adotado para São Luís; mesma [consulta NASA POWER](https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=-44.3&latitude=-2.53&format=JSON). Não é posição de uma residência. | 2026-11-17 |
| `LONGITUDE_SAO_LUIS` | `-44.3` | graus decimais | Ponto consultado no serviço NASA POWER | Ponto de referência adotado para São Luís; mesma [consulta NASA POWER](https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=-44.3&latitude=-2.53&format=JSON). | 2026-11-17 |
| `FATOR_EMISSAO_KG_CO2_KWH` | `0.0461` | kg CO₂/kWh | CO₂ evitado estimado no simulador e no Sol de hoje | **Ano-base 2025**, média anual do SIN, equivalente a 46,1 kg CO₂/MWh. Fonte: [planilha oficial MCTI/SIRENE, Inventario_2026_janset.xlsx](https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sirene/dados-e-ferramentas/fatores-de-emissao/arquivo/Inventario_2026_janset.xlsx), conferida pelo maestro e adotada pela decisão aprovada D-010. | 2026-11-17 |
| `PERCENTUAL_ECONOMIA_PADRAO` | `0.1` | fração (10%) | Economia potencial por hábitos na simulação pela conta | **Premissa didática do app, inspirada nas recomendações qualitativas do PROCEL/ENBPar**. Não é um número do PROCEL nem economia medida. Documento qualitativo específico do PROCEL/ENBPar: **fonte a localizar**. O Atlas EPE referenciado abaixo não valida esse percentual. | 2026-11-17 |

### Fator de emissão: ano-base 2025 aprovado na D-010

O maestro conferiu diretamente a planilha oficial MCTI/SIRENE
`Inventario_2026_janset.xlsx` em **17/nov/2026** e confirmou as médias anuais do SIN:
**2023 = 0,0385**, **2024 = 0,0545** e **2025 = 0,0461 tCO₂/MWh**.
Esses valores são numericamente iguais em kg CO₂/kWh.

O app usa **0,0461 kg CO₂/kWh (ano-base 2025)**, conforme a **decisão do Coelho
registrada na D-010**, de 17/nov/2026. Esse fator substitui o de 2023 nos cálculos
do simulador e do Sol de hoje; a lição sobre a rede brasileira acompanha o mesmo ano-base.

### Regras de economia por aparelho

As seis regras são **premissa didática do app, inspirada nas recomendações
qualitativas do PROCEL/ENBPar**. Os valores de 1 hora, 10 minutos e 10% não são números
publicados pelo PROCEL. A redução de horas é limitada ao uso informado no cálculo.

| Nome | Valor no código | Unidade | Onde aparece no app | Fonte e situação | Consulta registrada |
| --- | --- | --- | --- | --- | --- |
| `REGRAS_ECONOMIA.ar_condicionado.reducaoHorasDia` | `1` | h/dia | Economia por usar o ar-condicionado 1 hora a menos por dia | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. | 2026-11-17 |
| `REGRAS_ECONOMIA.chuveiro.reducaoHorasDia` | `10 / 60` | h/dia (10 min/dia) | Economia por banhos 10 minutos mais curtos por dia | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. | 2026-11-17 |
| `REGRAS_ECONOMIA.geladeira.reducaoPercentual` | `0.1` | fração do consumo (10%) | Economia por abrir a geladeira só quando precisar | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. Não é percentual comprovado de economia por abertura da porta. | 2026-11-17 |
| `REGRAS_ECONOMIA.tv.reducaoHorasDia` | `1` | h/dia | Economia por desligar a TV quando ninguém assiste | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. | 2026-11-17 |
| `REGRAS_ECONOMIA.lampada_led.reducaoHorasDia` | `1` | h/dia por lâmpada | Economia por apagar luzes de cômodos vazios | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. | 2026-11-17 |
| `REGRAS_ECONOMIA.ventilador.reducaoHorasDia` | `1` | h/dia | Economia por desligar o ventilador ao sair do cômodo | Premissa didática do app; orientação qualitativa PROCEL/ENBPar, documento específico: **fonte a localizar**. | 2026-11-17 |

## Catálogo de aparelhos

Valores atuais de [`supabase/seed.sql`](supabase/seed.sql), por unidade de aparelho.
Consumo de referência = potência × horas por dia × 30 dias ÷ 1.000. Horas padrão são
premissas iniciais do formulário, não medições do uso de famílias. A revisão da
T-009 trouxe referências gerais de Inmetro/PBE e EPE, listadas abaixo, mas continua
sem identificar um modelo ou estudo que sustente cada par de potência e horas.
Esses documentos não são apresentados como fonte dos números exatos do catálogo.

| Código | Potência (W) | Horas padrão (h/dia) | Consumo de referência (kWh/mês) | Onde aparece | Fonte e situação | Consulta registrada |
| --- | --- | --- | --- | --- | --- | --- |
| `ar_condicionado` | `1000` | `8` | 240 | Catálogo e simulador por aparelhos; comparação do Sol de hoje | **Valor de referência didático, sem fonte pública específica** para potência e horas; tabela/modelo/documento: **fonte a localizar**. | 2026-11-17 |
| `chuveiro` | `5500` | `0.5` | 82,5 | Catálogo e simulador por aparelhos | **Valor de referência didático, sem fonte pública específica** para potência e horas; tabela/modelo/documento: **fonte a localizar**. | 2026-11-17 |
| `geladeira` | `60` | `24` | 43,2 | Catálogo e simulador por aparelhos | **Valor de referência didático, sem fonte pública específica**; potência média equivalente, não potência nominal do compressor. Etiqueta/modelo específico: **fonte a localizar**. | 2026-11-17 |
| `tv` | `100` | `5` | 15 | Catálogo e simulador por aparelhos | **Valor de referência didático, sem fonte pública específica** para potência e horas; tabela/modelo/documento: **fonte a localizar**. | 2026-11-17 |
| `lampada_led` | `9` | `6` | 1,62 | Catálogo e simulador por aparelhos | **Valor de referência didático, sem fonte pública específica** para potência e horas; tabela/modelo/documento: **fonte a localizar**. | 2026-11-17 |
| `ventilador` | `60` | `8` | 14,4 | Catálogo e simulador por aparelhos | **Valor de referência didático, sem fonte pública específica** para potência e horas; tabela/modelo/documento: **fonte a localizar**. | 2026-11-17 |

Referências gerais acrescentadas pelo Hydrogen à T-009 (consulta declarada em
2026-11-17): [Inmetro — tabelas de condicionadores de ar](https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/condicionadores-de-ar),
[Inmetro — tabela de refrigeradores, edição 2025 (PDF)](https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/refrigeradores-frigobares-combinados-combinados-frost-free/refrigerador.pdf/@@download/file),
[EPE — Fact Sheet Consumo Residencial, PPH 2019 (PDF)](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-729/FactSheetConsumoPorClassesDeRenda_Final09032023.pdf)
e [EPE — Atlas da Eficiência Energética Brasil 2024 (PDF)](https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-857/Atlas%20da%20Efici%C3%AAncia%20Energ%C3%A9tica%20Brasil%202024.pdf).
Os links substitutos dos PDFs de refrigeradores e do Atlas foram conferidos com
`curl -L` em 17/11/2026: HTTP 200 e conteúdo `application/pdf` em ambos.
São referências de contexto e de metodologia, sem comprovação dos pares exatos acima.

**Geladeira:** 60 W × 24 h × 30 ÷ 1.000 = **43,2 kWh/mês**. Os 60 W são uma
**potência média equivalente** que representa o compressor ligando e desligando;
não significam compressor consumindo 60 W continuamente nem potência nominal da
etiqueta. A referência a procurar para um modelo real é seu consumo em kWh/mês na
ENCE/PBE. Reduzir as 24 horas no formulário altera essa aproximação e não representa
automaticamente uma economia real da geladeira. Nenhuma mudança de catálogo ou
interface foi feita nesta tarefa.

**Fase 2 (D-011, 2026-11-20):** a economia das missões em kWh e R$ foi retirada
do D-005. `KWH_POR_NOITE_MISSAO_AR` não será criada por falta de fonte pública
para os 1.000 W do ar-condicionado. Missões aparecem somente como contagens de
registros e conclusões, sem estimativa de economia.

## Parâmetros técnicos e regras internas

Não são constantes físicas auditadas nem percentuais de economia comprovados.
A fonte destas escolhas é o próprio [`src/lib/config.ts`](src/lib/config.ts);
as unidades e usos descrevem a implementação. Data abaixo: leitura do código em
2026-11-17. Nenhuma página inicial externa é usada para justificá-las.

| Nome | Valor no código | Unidade | Onde aparece no app | Fonte | Consulta |
| --- | --- | --- | --- | --- | --- |
| `minimo_respondentes_percentual()` (SQL) | `5` | estudantes distintos respondentes | Percentual de acertos geral e por pergunta nos painéis e CSV; contagens continuam com mínimo de 3 | Regra interna de privacidade aprovada no D-012; sem fonte externa | 2026-11-21 |
| `DIAS_BUSCA_IRRADIACAO` | `10` | dias | Janela de busca do último dia válido na NASA | Configuração técnica do app | 2026-11-17 |
| `HORAS_CACHE_IRRADIACAO` | `6` | h | Validade do cache diário após sucesso | Configuração técnica do app | 2026-11-17 |
| `MINUTOS_RETENTATIVA_NASA` | `30` | min | Nova tentativa após reserva sem sucesso (T-003) | Configuração técnica do app | 2026-11-17 |
| `HORAS_CACHE_CLIMATOLOGIA` | `720` | h (30 dias) | Validade do cache climatológico após sucesso | Configuração técnica do app | 2026-11-17 |
| `TIMEOUT_NASA_POWER_MS` | `8000` | ms | Tempo limite de chamada NASA | Configuração técnica do app | 2026-11-17 |
| `IRRADIACAO_MAXIMA_VALIDA` | `15` | kWh/m²/dia | Limite de sanidade para descartar leituras | Limite técnico do app; não é medição local ou máximo físico certificado | 2026-11-17 |
| `DIMENSAO_EMBEDDING` | `768` | dimensões | Representação dos trechos no RAG | Configuração técnica do app | 2026-11-17 |
| `TIMEOUT_GEMINI_MS` | `20000` | ms | Tempo limite das chamadas Gemini | Configuração técnica do app | 2026-11-17 |
| `EMBEDDINGS_POR_LOTE` | `50` | trechos/lote | Indexação dos trechos do tutor | Configuração técnica do app | 2026-11-17 |
| `TRECHO_MAXIMO_CARACTERES` | `800` | caracteres | Divisão do conteúdo para o tutor | Configuração técnica do app | 2026-11-17 |
| `SOBREPOSICAO_MAXIMA_CARACTERES` | `200` | caracteres | Sobreposição entre trechos do tutor | Configuração técnica do app | 2026-11-17 |
| `TUTOR_TRECHOS_BUSCADOS` | `4` | trechos | Busca de contexto do Energinho | Configuração técnica do app | 2026-11-17 |
| `TUTOR_SIMILARIDADE_MINIMA` | `0.64` | similaridade | Seleção de trechos para o tutor | Configuração técnica do app; não é métrica de acurácia | 2026-11-17 |
| `TUTOR_DISTANCIA_DO_MELHOR` | `0.08` | diferença de similaridade | Seleção de trechos próximos ao melhor | Configuração técnica do app | 2026-11-17 |
| `TUTOR_LIMITE_POR_HORA` | `20` | mensagens/h por estudante | Limite de uso do tutor | Regra interna do produto | 2026-11-17 |
| `TUTOR_MENSAGEM_MAXIMA` | `500` | caracteres | Validação da pergunta do tutor | Regra interna do produto | 2026-11-17 |
| `TUTOR_HISTORICO_MAXIMO` | `10` | mensagens | Histórico enviado ao tutor | Regra interna do produto | 2026-11-17 |
| `TUTOR_HISTORICO_TEXTO_MAXIMO` | `1000` | caracteres/mensagem | Validação do histórico do tutor | Regra interna do produto | 2026-11-17 |
| `TUTOR_MAX_TOKENS_SAIDA` | `1024` | tokens | Limite de geração do tutor | Configuração técnica do app | 2026-11-17 |
| `TUTOR_RESPOSTA_MAXIMA` | `1500` | caracteres | Limite de resposta do tutor | Regra interna do produto | 2026-11-17 |
| `PONTOS_POR_ORIGEM.primeira_simulacao` | `20` | pontos | Primeira simulação salva | Regra interna de gamificação | 2026-11-17 |
| `PONTOS_POR_ORIGEM.licao_concluida` | `10` | pontos | Lição concluída | Regra interna de gamificação | 2026-11-17 |
| `PONTOS_POR_ORIGEM.resposta_correta` | `5` | pontos | Primeira tentativa correta do quiz | Regra interna de gamificação | 2026-11-17 |
| `PONTOS_POR_ORIGEM.pedale_concluido` | `15` | pontos | Atividade Pedale concluída | Regra interna de gamificação | 2026-11-17 |
| `LIMITE_SIMULACAO_PUBLICA_POR_MINUTO` | `600` | requisições/min | Proteção das simulações públicas | Regra interna do produto | 2026-11-17 |
| `LIMITE_PREVIA_POR_PERFIL` | `120` | requisições/janela | Proteção da prévia por perfil | Regra interna do produto | 2026-11-17 |
| `LIMITE_ACOES_POR_PERFIL` | `120` | ações/janela | Proteção das ações autenticadas | Regra interna do produto | 2026-11-17 |
| `PONTOS_BAIRRO_UNIDO` | `500` | pontos | Critério da conquista Bairro unido | Regra interna de gamificação | 2026-11-17 |
| `CACHE_CONTEUDO_SEGUNDOS` | `300` | s | Cache de conteúdo público | Configuração técnica do app | 2026-11-17 |
| `CACHE_SOL_DE_HOJE_SEGUNDOS` | `600` | s | Cache HTTP do Sol de hoje | Configuração técnica do app | 2026-11-17 |
| `CACHE_DOCUMENTACAO_SEGUNDOS` | `3600` | s | Cache HTTP da documentação | Configuração técnica do app | 2026-11-17 |

Outras configurações de contexto: `FUSO_SAO_LUIS = "America/Fortaleza"`;
`JANELA_LIMITE_PREVIA_POR_PERFIL` e `JANELA_LIMITE_ACOES_POR_PERFIL` são ambas
`"10 minutes"`. URLs de serviços, identificadores de trilhas/missões, modelo Gemini
e textos de dicas permanecem no config; não são valores físicos de cálculo.

`FONTES.SOL_DE_HOJE` descreve dado variável, não uma constante: o último dia válido
de ALLSKY_SFC_SW_DWN nos 10 dias consultados, pela NASA POWER Daily API, community RE.
Consulta diária específica de suporte no relatório T-009: **fonte a localizar**;
o link direto presente na auditoria é o da climatologia, que está registrado acima.
O parâmetro `fonte` da resposta continua indicando NASA, cache
ou valor de reserva; o atraso do dado não é alterado por esta documentação.
