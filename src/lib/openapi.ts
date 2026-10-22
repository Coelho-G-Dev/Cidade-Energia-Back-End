const json = <E extends object = object>(schema: object, extras?: E) => ({
  "application/json": { schema, ...(extras as E) },
});

const ref = (nome: string) => ({ $ref: `#/components/schemas/${nome}` });

const respostaErro = (descricao: string, codigo: string, mensagem: string) => ({
  description: descricao,
  content: json(ref("Erro"), { example: { erro: { codigo, mensagem } } }),
});

const UUID_BAIRRO = "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f";
const UUID_ESCOLA = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const UUID_APARELHO = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const UUID_USUARIO = "0e9d8c7b-6a5f-4e4d-9c3b-2a1f0e9d8c7b";
const UUID_SIMULACAO = "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e";
const UUID_TRILHA = "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f";
const UUID_LICAO = "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70";
const UUID_LICAO_2 = "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081";
const UUID_PERGUNTA = "f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192";
const UUID_MISSAO = "a7b8c9d0-e1f2-4a3b-8c4d-5e6f708192a3";
const UUID_PONTO = "b8c9d0e1-f2a3-4b4c-9d5e-6f708192a3b4";

const parametroId = (descricao: string) => ({
  name: "id",
  in: "path",
  required: true,
  description: descricao,
  schema: { type: "string", format: "uuid" },
});

const semEvento = { pontosGanhos: 0, conquistasNovas: [] };
const eventoComConquista = {
  pontosGanhos: 20,
  conquistasNovas: [{ slug: "primeira_simulacao", nome: "Primeira simulação" }],
};

const resultadoConta = {
  consumoKwh: 380,
  gastoMensal: 312,
  economiaHabitosMensal: 31.2,
  economiaSolarMensal: 312,
  kwhGeradoMes: 413.9,
  custoSistemaSolar: 9372,
  retornoSolarAnos: 2.5,
  economiaMensal: 31.2,
  placas: 6,
  retornoAnos: 2.5,
  co2EvitadoKgAno: 191.2,
  pesos: [],
  comoCalculamos: {
    economiaHabitos: "Meta de 10% da conta com mudança de hábitos, sem investimento: R$ 312,00 × 10%.",
    economiaSolar:
      "Cada placa de 550 W gera cerca de 69 kWh por mês com o sol de São Luís (5,23 kWh/m² por dia × 0,55 kWp × 0,8 × 30 dias). " +
      "6 placas geram 413,9 kWh. A economia é a energia gerada, até o seu consumo de 380 kWh, × R$ 0,8211 por kWh. A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
    custoSistemaSolar: "6 × 0,55 kWp × R$ 2.840,00 por kWp instalado = R$ 9.372,00 (preço médio de mercado, estimativa).",
    retornoSolar: "R$ 9.372,00 ÷ (R$ 312,00 × 12 meses) = 2,5 anos. Usa a economia com energia solar, não a de hábitos.",
  },
};

const resultadoAparelhos = {
  consumoKwh: 82.5,
  gastoMensal: 73.33,
  economiaHabitosMensal: 24.44,
  economiaSolarMensal: 73.33,
  kwhGeradoMes: 138,
  custoSistemaSolar: 3124,
  retornoSolarAnos: 3.6,
  economiaMensal: 24.44,
  placas: 2,
  retornoAnos: 3.6,
  co2EvitadoKgAno: 63.7,
  pesos: [{ aparelho: "Chuveiro elétrico", percentual: 100 }],
  comoCalculamos: {
    economiaHabitos:
      "Mudança de hábitos, sem investimento: tomar banhos 10 minutos mais curtos por dia. São 27,5 kWh a menos por mês × R$ 0,8888 por kWh.",
    economiaSolar:
      "Cada placa de 550 W gera cerca de 69 kWh por mês com o sol de São Luís (5,23 kWh/m² por dia × 0,55 kWp × 0,8 × 30 dias). " +
      "2 placas geram 138 kWh. A economia é a energia gerada, até o seu consumo de 82,5 kWh, × R$ 0,8888 por kWh. A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
    custoSistemaSolar: "2 × 0,55 kWp × R$ 2.840,00 por kWp instalado = R$ 3.124,00 (preço médio de mercado, estimativa).",
    retornoSolar: "R$ 3.124,00 ÷ (R$ 73,33 × 12 meses) = 3,6 anos. Usa a economia com energia solar, não a de hábitos.",
  },
};

export const especificacaoOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "Cidade Energia API",
    version: "0.1.0",
    description: [
      "API do app educacional **Cidade Energia**: simulador da conta de luz, trilhas com lições e quiz,",
      "Pedale e veja, missões, pontos, conquistas, rankings, mapa e perfil do estudante.",
      "",
      "**Pontos** são calculados só no servidor e nunca duplicam: repetir a mesma ação devolve `pontosGanhos: 0`.",
      "As rotas que pontuam devolvem `pontosGanhos` e `conquistasNovas` para o front comemorar.",
      "",
      "**Autenticação:** o front faz login anônimo com `supabase.auth.signInAnonymously()` e envia",
      "`Authorization: Bearer <access_token>`. Clique em **Authorize** e cole só o token, sem a palavra `Bearer`.",
      "",
      "**Erros** sempre no formato `{ \"erro\": { \"codigo\": string, \"mensagem\": string } }`.",
      "",
      "Todos os valores do simulador são **estimativas didáticas**.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Servidor atual" }],
  tags: [
    { name: "Catálogos", description: "Listas públicas, sem login." },
    { name: "Perfil", description: "Dados do estudante logado (só primeiro nome, bairro e escola)." },
    { name: "Simulador", description: "Cálculo da conta de luz, economia e energia solar." },
    { name: "Sol de hoje", description: "Irradiação solar recente em São Luís (NASA POWER)." },
    { name: "Tutor", description: "Energinho: tutor com IA que responde com base nas lições do app." },
    { name: "Trilhas e quiz", description: "Trilhas, lições, quiz e Pedale e veja." },
    { name: "Missões", description: "Missões de hábitos com registro diário." },
    { name: "Rankings e mapa", description: "Rankings agregados (sem dados individuais) e pontos no mapa." },
  ],
  paths: {
    "/api/bairros": {
      get: {
        tags: ["Catálogos"],
        summary: "Lista os bairros",
        operationId: "listarBairros",
        security: [],
        responses: {
          "200": {
            description: "Bairros em ordem alfabética.",
            content: json(
              { type: "array", items: ref("Bairro") },
              { example: [{ id: UUID_BAIRRO, nome: "Anil" }] },
            ),
          },
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/escolas": {
      get: {
        tags: ["Catálogos"],
        summary: "Lista as escolas, com filtro opcional por bairro",
        description:
          "Só lista escolas ativas. Quando a lista real de escolas é carregada, as fictícias ficam inativas: saem desta lista, do código de turma e do ranking.",
        operationId: "listarEscolas",
        security: [],
        parameters: [
          {
            name: "bairro",
            in: "query",
            required: false,
            description: "ID do bairro (UUID) para filtrar.",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Escolas em ordem alfabética.",
            content: json(
              { type: "array", items: ref("Escola") },
              { example: [{ id: UUID_ESCOLA, nome: "Escola Estadual Sol Nascente (fictícia)", bairro_id: UUID_BAIRRO }] },
            ),
          },
          "400": respostaErro("Filtro inválido.", "ENTRADA_INVALIDA", "bairro: Bairro inválido."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/aparelhos": {
      get: {
        tags: ["Catálogos"],
        summary: "Lista os aparelhos do simulador",
        description: "Use `horas_padrao` para preencher o formulário. A potência é sempre a do banco.",
        operationId: "listarAparelhos",
        security: [],
        responses: {
          "200": {
            description: "Aparelhos em ordem alfabética.",
            content: json(
              { type: "array", items: ref("Aparelho") },
              {
                example: [
                  {
                    id: UUID_APARELHO,
                    codigo: "chuveiro",
                    nome: "Chuveiro elétrico",
                    potencia_w: 5500,
                    horas_padrao: 0.5,
                    icone: "chuveiro",
                  },
                ],
              },
            ),
          },
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/perfil": {
      get: {
        tags: ["Perfil"],
        summary: "Retorna o perfil do usuário logado",
        description:
          [
            "Todo usuário logado já tem um perfil, criado automaticamente. `tem_perfil` é `false` até o estudante informar o primeiro nome.",
            "",
            "`trocas_restantes` diz quantas trocas de bairro ou escola ainda cabem nos últimos 30 dias (de `limite_trocas`).",
            "Quando não resta nenhuma, `proxima_troca_em` diz quando a próxima é liberada.",
          ].join("\n"),
        operationId: "obterPerfil",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Perfil do usuário.",
            content: json(ref("Perfil"), {
              examples: {
                semNome: {
                  summary: "Logo após o login anônimo",
                  value: {
                    id: UUID_USUARIO,
                    primeiro_nome: null,
                    bairro_id: null,
                    escola_id: null,
                    escola_verificada: false,
                    criado_em: "2026-10-15T12:00:00.000Z",
                    tem_perfil: false,
                    limite_trocas: 3,
                    trocas_restantes: 3,
                    proxima_troca_em: null,
                  },
                },
                completo: {
                  summary: "Perfil preenchido",
                  value: {
                    id: UUID_USUARIO,
                    primeiro_nome: "Ana",
                    bairro_id: UUID_BAIRRO,
                    escola_id: UUID_ESCOLA,
                    escola_verificada: true,
                    criado_em: "2026-10-15T12:00:00.000Z",
                    tem_perfil: true,
                    limite_trocas: 3,
                    trocas_restantes: 2,
                    proxima_troca_em: null,
                  },
                },
                semTrocas: {
                  summary: "Usou as 3 trocas dos últimos 30 dias",
                  value: {
                    id: UUID_USUARIO,
                    primeiro_nome: "Ana",
                    bairro_id: UUID_BAIRRO,
                    escola_id: UUID_ESCOLA,
                    escola_verificada: true,
                    criado_em: "2026-10-15T12:00:00.000Z",
                    tem_perfil: true,
                    limite_trocas: 3,
                    trocas_restantes: 0,
                    proxima_troca_em: "2026-11-14T18:30:00.000Z",
                  },
                },
              },
            }),
          },
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Perfil não encontrado.", "PERFIL_NAO_ENCONTRADO", "Perfil não encontrado."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
      put: {
        tags: ["Perfil"],
        summary: "Cria ou atualiza o perfil",
        description:
          [
            "Envie `escola_id` **ou** `codigo_turma` (nunca os dois), ou nenhum deles. O código de turma é convertido para maiúsculas.",
            "Só quem entra pelo `codigo_turma` fica com `escola_verificada: true` e soma pontos no ranking de escolas. Trocar de escola desfaz a verificação.",
            "",
            "**Limite de trocas:** cada estudante pode trocar de bairro ou de escola **3 vezes a cada 30 dias**.",
            "Definir o bairro ou a escola pela primeira vez, reenviar os mesmos valores ou mudar só o nome não conta.",
            "Os pontos acompanham o bairro e a escola atuais.",
          ].join("\n"),
        operationId: "atualizarPerfil",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(ref("AtualizarPerfil"), {
            examples: {
              comEscola: {
                summary: "Escolhendo a escola na lista",
                value: { primeiro_nome: "Ana", bairro_id: UUID_BAIRRO, escola_id: UUID_ESCOLA },
              },
              comCodigoTurma: {
                summary: "Usando o código da turma",
                value: { primeiro_nome: "João", bairro_id: UUID_BAIRRO, codigo_turma: "SOL2026" },
              },
              semEscola: {
                summary: "Sem escola",
                value: { primeiro_nome: "Maria", bairro_id: UUID_BAIRRO },
              },
            },
          }),
        },
        responses: {
          "200": { description: "Perfil salvo.", content: json(ref("Perfil")) },
          "400": respostaErro(
            "Dados inválidos.",
            "ENTRADA_INVALIDA",
            "primeiro_nome: Informe só o primeiro nome, sem espaços ou números.",
          ),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": {
            description: "Turma, bairro ou escola não encontrados.",
            content: json(ref("Erro"), {
              examples: {
                turma: {
                  summary: "Código de turma inexistente",
                  value: {
                    erro: { codigo: "TURMA_NAO_ENCONTRADA", mensagem: "Não encontramos uma turma com esse código." },
                  },
                },
                bairroOuEscola: {
                  summary: "Bairro ou escola inexistente",
                  value: {
                    erro: { codigo: "BAIRRO_OU_ESCOLA_NAO_ENCONTRADO", mensagem: "Bairro ou escola não encontrado." },
                  },
                },
              },
            }),
          },
          "409": respostaErro(
            "A escola escolhida não está mais ativa.",
            "ESCOLA_INATIVA",
            "Essa escola não está mais disponível. Escolha outra.",
          ),
          "429": respostaErro(
            "Limite de trocas de bairro ou escola atingido (`LIMITE_DE_TROCAS`) ou muitas ações seguidas do mesmo perfil (`LIMITE_DE_REQUISICOES`, 120 a cada 10 minutos).",
            "LIMITE_DE_TROCAS",
            "Você atingiu o limite de trocas de bairro ou escola. Você poderá trocar de novo a partir de 14/11 às 15:30.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/simulacoes": {
      post: {
        tags: ["Simulador"],
        summary: "Simula a conta de luz",
        description: [
          "Dois modos:",
          "- `conta`: o estudante informa o consumo da conta (kWh) e, se quiser, o valor (R$).",
          "- `aparelhos`: o estudante monta a lista de aparelhos de casa.",
          "",
          "O login é **opcional**: com token válido a simulação é salva e `simulacaoId` vem preenchido;",
          "sem token (ou com token inválido) o cálculo é feito, mas nada é salvo e `simulacaoId` é `null`.",
          "Para a estimativa ao vivo, use `POST /api/simulacoes/previa`, que nunca salva.",
          "",
          "A primeira simulação salva vale pontos e a conquista *Primeira simulação*.",
        ].join("\n"),
        operationId: "criarSimulacao",
        security: [{}, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(
            { oneOf: [ref("SimulacaoConta"), ref("SimulacaoAparelhos")], discriminator: { propertyName: "modo" } },
            {
              examples: {
                conta: {
                  summary: "Modo conta, com valor",
                  value: { modo: "conta", consumoKwh: 380, valorConta: 312 },
                },
                contaSemValor: {
                  summary: "Modo conta, só o consumo",
                  value: { modo: "conta", consumoKwh: 150 },
                },
                aparelhos: {
                  summary: "Modo aparelhos",
                  value: { modo: "aparelhos", itens: [{ aparelhoId: UUID_APARELHO, quantidade: 1, horasDia: 0.5 }] },
                },
              },
            },
          ),
        },
        responses: {
          "200": {
            description: "Resultado da simulação.",
            content: json(ref("RespostaSimulacao"), {
              examples: {
                conta: {
                  summary: "Modo conta (380 kWh, R$ 312,00) sem login",
                  value: { ...resultadoConta, simulacaoId: null, ...semEvento },
                },
                aparelhos: {
                  summary: "Primeira simulação com login",
                  value: { ...resultadoAparelhos, simulacaoId: UUID_SIMULACAO, ...eventoComConquista },
                },
              },
            }),
          },
          "400": {
            description: "Dados inválidos ou JSON malformado.",
            content: json(ref("Erro"), {
              examples: {
                entrada: {
                  summary: "Campo inválido",
                  value: { erro: { codigo: "ENTRADA_INVALIDA", mensagem: "consumoKwh: O consumo deve ser maior que zero." } },
                },
                json: {
                  summary: "JSON malformado",
                  value: { erro: { codigo: "JSON_INVALIDO", mensagem: "O corpo da requisição não é um JSON válido." } },
                },
              },
            }),
          },
          "404": respostaErro(
            "Algum aparelho enviado não existe.",
            "APARELHO_NAO_ENCONTRADO",
            `Aparelho ${UUID_APARELHO} não existe.`,
          ),
          "429": respostaErro(
            "Sem login: muitas simulações do mesmo endereço no último minuto. Com login: muitas ações do mesmo perfil (120 a cada 10 minutos, somando as rotas que gravam; a mensagem fala em ações).",
            "LIMITE_DE_REQUISICOES",
            "Muitas simulações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/simulacoes/previa": {
      post: {
        tags: ["Simulador"],
        summary: "Calcula a simulação sem salvar (prévia ao vivo)",
        description: [
          "Mesmo corpo e mesma resposta de `POST /api/simulacoes`, mas **nunca salva** e não pontua,",
          "mesmo com token. Serve para a estimativa ao vivo enquanto o estudante ajusta os valores.",
          "Use `POST /api/simulacoes` com token só quando ele tocar em \"Ver meu resultado\".",
          "",
          "Login opcional. Com token válido, o limite conta por perfil (120 a cada 10 minutos); sem token, conta",
          "por endereço de rede, junto com as simulações sem login (600 por minuto).",
        ].join("\n"),
        operationId: "previaSimulacao",
        security: [{}, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(
            { oneOf: [ref("SimulacaoConta"), ref("SimulacaoAparelhos")], discriminator: { propertyName: "modo" } },
            {
              examples: {
                conta: { summary: "Modo conta", value: { modo: "conta", consumoKwh: 380, valorConta: 312 } },
                aparelhos: {
                  summary: "Modo aparelhos",
                  value: { modo: "aparelhos", itens: [{ aparelhoId: UUID_APARELHO, quantidade: 1, horasDia: 0.5 }] },
                },
              },
            },
          ),
        },
        responses: {
          "200": {
            description: "Resultado da simulação, com `simulacaoId: null` e `pontosGanhos: 0`.",
            content: json(ref("RespostaSimulacao"), { example: { ...resultadoConta, simulacaoId: null, ...semEvento } }),
          },
          "400": respostaErro("Dados inválidos ou JSON malformado.", "ENTRADA_INVALIDA", "consumoKwh: O consumo deve ser maior que zero."),
          "404": respostaErro(
            "Algum aparelho enviado não existe.",
            "APARELHO_NAO_ENCONTRADO",
            `Aparelho ${UUID_APARELHO} não existe.`,
          ),
          "429": respostaErro(
            "Muitas simulações seguidas: sem login, do mesmo endereço no último minuto; com login, do mesmo perfil em 10 minutos.",
            "LIMITE_DE_REQUISICOES",
            "Muitas simulações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/simulacoes/ultima": {
      get: {
        tags: ["Simulador"],
        summary: "Retorna a última simulação salva do usuário",
        operationId: "ultimaSimulacao",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Última simulação.",
            content: json(ref("SimulacaoSalva"), {
              example: {
                id: UUID_SIMULACAO,
                modo: "conta",
                consumoKwh: 380,
                valorConta: 312,
                criadoEm: "2026-10-15T12:30:00.000Z",
                resultado: resultadoConta,
              },
            }),
          },
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro(
            "O usuário ainda não salvou nenhuma simulação.",
            "NENHUMA_SIMULACAO",
            "Você ainda não fez nenhuma simulação.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/sol-de-hoje": {
      get: {
        tags: ["Sol de hoje"],
        summary: "Quanto uma placa solar gera com o sol mais recente de São Luís",
        description: [
          "Usa a irradiação diária da NASA POWER (`ALLSKY_SFC_SW_DWN`, community RE) do dia mais recente com dado",
          "nos últimos 10 dias, já que os dados chegam com alguns dias de atraso. O servidor tenta renovar o valor",
          "quando o guardado passa de 6 horas. Se a NASA POWER falhar ou não tiver dia válido, usa o último dia válido",
          "guardado ou, sem ele, a média anual padrão.",
        ].join(" "),
        operationId: "solDeHoje",
        security: [],
        responses: {
          "200": {
            description: "Estimativa para uma placa de 550 Wp.",
            content: json(ref("SolDeHoje"), {
              example: {
                data: "2026-10-16",
                atualizadoEm: "2026-10-21T14:05:12.000Z",
                diasDeAtraso: 5,
                irradiacao: 7.09,
                kwhPorPlaca: 3.12,
                horasArCondicionado: 3.1,
                co2EvitadoKg: 0.12,
                estimativa: true,
                fonte: "cache",
              },
            }),
          },
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/tutor": {
      post: {
        tags: ["Tutor"],
        summary: "Pergunta ao Energinho",
        description: [
          "Busca os 4 trechos de lição mais parecidos com a pergunta e responde com o Gemini, só sobre energia,",
          "conta de luz e sustentabilidade. Limite de 20 mensagens por hora por usuário. O texto das conversas não é gravado:",
          "para manter o contexto, o front envia as últimas mensagens em `historico`. Pelo token, o servidor inclui no",
          "contexto do modelo o bairro do estudante e o resumo da última simulação (consumo, gasto e o aparelho que mais",
          "pesa), sem o nome. Sem simulação, o tutor responde normalmente.",
        ].join(" "),
        operationId: "perguntarAoTutor",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(ref("PerguntaTutor"), {
            examples: {
              simples: { summary: "Só a pergunta", value: { mensagem: "Por que o sol de São Luís é tão forte?" } },
              comHistorico: {
                summary: "Com histórico",
                value: {
                  mensagem: "E quantas placas uma casa precisa?",
                  historico: [
                    { papel: "usuario", texto: "Como a placa solar funciona?" },
                    { papel: "energinho", texto: "A placa transforma a luz do sol em energia elétrica." },
                  ],
                },
              },
            },
          }),
        },
        responses: {
          "200": {
            description: "Resposta do Energinho e lições para aprofundar.",
            content: json(ref("RespostaTutor"), {
              example: {
                resposta:
                  "São Luís fica pertinho da linha do Equador, então o sol passa bem alto o ano todo.",
                licoesRelacionadas: [{ id: UUID_LICAO, titulo: "O sol de São Luís", trilhaSlug: "energia-solar-em-sao-luis" }],
              },
            }),
          },
          "400": respostaErro("Mensagem vazia, longa demais ou histórico inválido.", "ENTRADA_INVALIDA", "mensagem: A mensagem pode ter até 500 caracteres."),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "429": respostaErro(
            "Limite de 20 mensagens por hora atingido.",
            "LIMITE_TUTOR",
            "Você já mandou 20 mensagens ao Energinho na última hora. Tente de novo a partir das 13:30.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
          "503": respostaErro(
            "O serviço de IA não respondeu.",
            "TUTOR_INDISPONIVEL",
            "O Energinho está descansando agora. Tente de novo em alguns minutos.",
          ),
        },
      },
    },
    "/api/trilhas": {
      get: {
        tags: ["Trilhas e quiz"],
        summary: "Lista as trilhas com o progresso do usuário",
        description: "Login opcional: sem token, `licoesConcluidas` vem 0 e `concluida` vem `false`.",
        operationId: "listarTrilhas",
        security: [{}, { bearerAuth: [] }],
        responses: {
          "200": {
            description: "Trilhas na ordem sugerida.",
            content: json(
              { type: "array", items: ref("ResumoTrilha") },
              {
                example: [
                  {
                    id: UUID_TRILHA,
                    slug: "energia-solar-em-sao-luis",
                    titulo: "Energia solar em São Luís",
                    descricao: "Por que o sol daqui é tão forte e como ele vira energia.",
                    tema: "solar",
                    minutos: 15,
                    totalLicoes: 4,
                    licoesConcluidas: 1,
                    concluida: false,
                  },
                ],
              },
            ),
          },
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/trilhas/{slug}": {
      get: {
        tags: ["Trilhas e quiz"],
        summary: "Detalha uma trilha com as lições",
        description: [
          "Login opcional. O conteúdo de cada lição vem em `GET /api/licoes/{id}`.",
          "",
          "As lições são concluídas **na ordem**: `liberada` é `true` quando todas as anteriores da trilha estão",
          "concluídas (a primeira está sempre liberada). Lição já concluída continua liberada. Sem login, só a primeira.",
        ].join("\n"),
        operationId: "obterTrilha",
        security: [{}, { bearerAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "Slug da trilha (ex.: `energia-solar-em-sao-luis`).",
            schema: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
          },
        ],
        responses: {
          "200": {
            description: "Trilha com as lições.",
            content: json(ref("TrilhaDetalhada"), {
              example: {
                id: UUID_TRILHA,
                slug: "energia-solar-em-sao-luis",
                titulo: "Energia solar em São Luís",
                descricao: "Por que o sol daqui é tão forte e como ele vira energia.",
                tema: "solar",
                minutos: 15,
                totalLicoes: 2,
                licoesConcluidas: 1,
                concluida: false,
                licoes: [
                  { id: UUID_LICAO, ordem: 1, titulo: "O sol de São Luís", tipo: "texto", concluida: true, liberada: true },
                  { id: UUID_LICAO_2, ordem: 2, titulo: "Pedale e veja", tipo: "pedale", concluida: false, liberada: true },
                ],
              },
            }),
          },
          "400": respostaErro("Slug inválido.", "ENTRADA_INVALIDA", "Trilha inválida."),
          "404": respostaErro("Trilha não encontrada.", "TRILHA_NAO_ENCONTRADA", "Trilha não encontrada."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/licoes/{id}": {
      get: {
        tags: ["Trilhas e quiz"],
        summary: "Retorna o conteúdo de uma lição",
        description: [
          "`conteudo` vem em Markdown. Ler é sempre livre, mesmo com a lição travada.",
          "Login opcional: muda `concluida`, `liberada` e `licaoPendente`.",
          "`licaoPendente` é a primeira lição anterior não concluída, que precisa ser concluída antes desta.",
        ].join("\n"),
        operationId: "obterLicao",
        security: [{}, { bearerAuth: [] }],
        parameters: [parametroId("ID da lição.")],
        responses: {
          "200": {
            description: "Lição.",
            content: json(ref("LicaoDetalhada"), {
              example: {
                id: UUID_LICAO,
                trilha: { slug: "energia-solar-em-sao-luis", titulo: "Energia solar em São Luís" },
                ordem: 1,
                titulo: "O sol de São Luís",
                conteudo: "## O sol de São Luís\n\nSão Luís fica perto da linha do Equador...",
                tipo: "texto",
                totalPerguntas: 2,
                concluida: false,
                liberada: true,
                licaoPendente: null,
                proximaLicaoId: UUID_LICAO_2,
              },
            }),
          },
          "400": respostaErro("ID inválido.", "ENTRADA_INVALIDA", "Identificador inválido."),
          "404": respostaErro("Lição não encontrada.", "LICAO_NAO_ENCONTRADA", "Lição não encontrada."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/licoes/{id}/concluir": {
      post: {
        tags: ["Trilhas e quiz"],
        summary: "Marca uma lição de texto como concluída",
        description:
          "Pontua uma vez só por lição. Lição do tipo `pedale` é concluída por `POST /api/pedale/concluir`. " +
          "Só conclui depois das lições anteriores da mesma trilha (`409 LICAO_BLOQUEADA`).",
        operationId: "concluirLicao",
        security: [{ bearerAuth: [] }],
        parameters: [parametroId("ID da lição.")],
        responses: {
          "200": {
            description: "Lição concluída. Repetir devolve `pontosGanhos: 0`.",
            content: json(ref("LicaoConcluida"), {
              example: { licaoId: UUID_LICAO, concluida: true, pontosGanhos: 10, conquistasNovas: [] },
            }),
          },
          "400": respostaErro(
            "ID inválido ou lição do Pedale e veja.",
            "LICAO_E_PEDALE",
            "Esta lição é do Pedale e veja: conclua pelo POST /api/pedale/concluir.",
          ),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Lição não encontrada.", "LICAO_NAO_ENCONTRADA", "Lição não encontrada."),
          "409": respostaErro(
            "Falta concluir uma lição anterior da trilha.",
            "LICAO_BLOQUEADA",
            'Conclua antes a lição "O sol de São Luís".',
          ),
          "429": respostaErro(
            "Muitas ações seguidas do mesmo perfil: 120 a cada 10 minutos, somando as rotas que gravam.",
            "LIMITE_DE_REQUISICOES",
            "Muitas ações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/licoes/{id}/quiz": {
      get: {
        tags: ["Trilhas e quiz"],
        summary: "Retorna as perguntas do quiz da lição, sem a resposta certa",
        description: [
          "Nunca traz o índice correto nem a explicação: os dois só vêm depois de responder.",
          "Com login, mostra se a pergunta já foi respondida, se acertou na primeira tentativa e se ainda pode pontuar.",
          "Com `licaoConcluida: false`, todas as perguntas vêm com `podePontuar: false`: conclua a lição antes.",
        ].join("\n"),
        operationId: "obterQuiz",
        security: [{}, { bearerAuth: [] }],
        parameters: [parametroId("ID da lição.")],
        responses: {
          "200": {
            description: "Perguntas do quiz.",
            content: json(ref("Quiz"), {
              example: {
                licaoId: UUID_LICAO,
                licaoConcluida: true,
                perguntas: [
                  {
                    id: UUID_PERGUNTA,
                    ordem: 1,
                    enunciado: "Por que São Luís recebe tanto sol?",
                    opcoes: ["Porque fica perto da linha do Equador", "Porque é uma ilha", "Porque tem muitas praias"],
                    jaRespondida: true,
                    acertou: false,
                    podePontuar: false,
                  },
                ],
              },
            }),
          },
          "400": respostaErro("ID inválido.", "ENTRADA_INVALIDA", "Identificador inválido."),
          "404": respostaErro("Lição não encontrada.", "LICAO_NAO_ENCONTRADA", "Lição não encontrada."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/quiz/responder": {
      post: {
        tags: ["Trilhas e quiz"],
        summary: "Responde uma pergunta do quiz",
        description: [
          "A correção é feita no servidor. Só responde depois de concluir a lição (`409 LICAO_NAO_CONCLUIDA`,",
          "sem gravar a tentativa). Regras:",
          "- só a **primeira tentativa** vale pontos, e só se estiver certa;",
          "- as tentativas seguintes são treino: a API corrige, sem pontos e sem alterar o registro da primeira;",
          "- certa ou errada, a resposta traz `opcaoCorreta` e `explicacao`.",
        ].join("\n"),
        operationId: "responderQuiz",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(ref("ResponderQuiz"), {
            examples: {
              resposta: { summary: "Escolhendo a primeira opção", value: { perguntaId: UUID_PERGUNTA, opcao: 0 } },
            },
          }),
        },
        responses: {
          "200": {
            description: "Correção da resposta.",
            content: json(ref("RespostaDoQuiz"), {
              examples: {
                acertou: {
                  summary: "Acertou na primeira tentativa",
                  value: {
                    correta: true,
                    opcaoCorreta: 0,
                    explicacao: "Perto do Equador o sol chega mais 'em pé' o ano todo.",
                    tentativaPontuavel: true,
                    pontosGanhos: 5,
                    conquistasNovas: [],
                  },
                },
                errou: {
                  summary: "Errou na primeira tentativa: mostra a certa, sem pontos",
                  value: {
                    correta: false,
                    opcaoCorreta: 0,
                    explicacao: "Perto do Equador o sol chega mais 'em pé' o ano todo.",
                    tentativaPontuavel: true,
                    pontosGanhos: 0,
                    conquistasNovas: [],
                  },
                },
                treino: {
                  summary: "Respondeu de novo: treino, sem pontos",
                  value: {
                    correta: true,
                    opcaoCorreta: 0,
                    explicacao: "Perto do Equador o sol chega mais 'em pé' o ano todo.",
                    tentativaPontuavel: false,
                    pontosGanhos: 0,
                    conquistasNovas: [],
                  },
                },
              },
            }),
          },
          "400": respostaErro("Dados inválidos.", "ENTRADA_INVALIDA", "opcao: Escolha uma das opções da pergunta."),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Pergunta não encontrada.", "PERGUNTA_NAO_ENCONTRADA", "Pergunta não encontrada."),
          "409": respostaErro(
            "A lição da pergunta ainda não foi concluída.",
            "LICAO_NAO_CONCLUIDA",
            "Leia a lição antes de responder o quiz.",
          ),
          "429": respostaErro(
            "Muitas ações seguidas do mesmo perfil: 120 a cada 10 minutos, somando as rotas que gravam.",
            "LIMITE_DE_REQUISICOES",
            "Muitas ações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/pedale/concluir": {
      post: {
        tags: ["Trilhas e quiz"],
        summary: "Registra o Pedale e veja concluído",
        description:
          "A atividade roda no front; o backend só registra a lição como concluída e pontua uma vez só. " +
          "Só conclui depois das lições anteriores da mesma trilha (`409 LICAO_BLOQUEADA`).",
        operationId: "concluirPedale",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: json(ref("ConcluirPedale"), {
            examples: { pedale: { summary: "Lição do Pedale e veja", value: { licaoId: UUID_LICAO_2 } } },
          }),
        },
        responses: {
          "200": {
            description: "Pedale registrado. Repetir devolve `pontosGanhos: 0`.",
            content: json(ref("LicaoConcluida"), {
              example: { licaoId: UUID_LICAO_2, concluida: true, pontosGanhos: 15, conquistasNovas: [] },
            }),
          },
          "400": respostaErro(
            "Dados inválidos ou lição que não é do Pedale.",
            "LICAO_NAO_E_PEDALE",
            "Esta lição não é do Pedale e veja.",
          ),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Lição não encontrada.", "LICAO_NAO_ENCONTRADA", "Lição não encontrada."),
          "409": respostaErro(
            "Falta concluir uma lição anterior da trilha.",
            "LICAO_BLOQUEADA",
            'Conclua antes a lição "Como a placa solar funciona".',
          ),
          "429": respostaErro(
            "Muitas ações seguidas do mesmo perfil: 120 a cada 10 minutos, somando as rotas que gravam.",
            "LIMITE_DE_REQUISICOES",
            "Muitas ações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/missoes": {
      get: {
        tags: ["Missões"],
        summary: "Lista as missões com o progresso do usuário",
        description: [
          "Login opcional. Os dias seguem o fuso de São Luís (UTC-3).",
          "`diasMarcados` traz as datas registradas (`AAAA-MM-DD`, em ordem) e `trilhaSlug` liga a missão à trilha dela.",
        ].join("\n"),
        operationId: "listarMissoes",
        security: [{}, { bearerAuth: [] }],
        responses: {
          "200": {
            description: "Missões.",
            content: json(
              { type: "array", items: ref("Missao") },
              {
                example: [
                  {
                    id: UUID_MISSAO,
                    slug: "ar-desligado-antes-de-dormir",
                    titulo: "Noites frescas",
                    descricao: "Desligue o ar-condicionado 30 minutos antes de dormir por 3 noites.",
                    trilhaSlug: "ar-condicionado-sem-susto",
                    pontos: 30,
                    diasNecessarios: 3,
                    diasRegistrados: 1,
                    diasMarcados: ["2026-10-16"],
                    registradaHoje: true,
                    concluida: false,
                  },
                ],
              },
            ),
          },
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/missoes/{id}/registrar": {
      post: {
        tags: ["Missões"],
        summary: "Registra a missão no dia de hoje",
        description: [
          "Um registro por dia (fuso de São Luís); registrar de novo no mesmo dia não cria outro (`novoRegistro: false`).",
          "Quando os dias registrados chegam a `diasNecessarios`, a missão pontua uma vez só.",
        ].join("\n"),
        operationId: "registrarMissao",
        security: [{ bearerAuth: [] }],
        parameters: [parametroId("ID da missão.")],
        responses: {
          "200": {
            description: "Registro do dia.",
            content: json(ref("RegistroMissao"), {
              example: {
                missaoId: UUID_MISSAO,
                dia: "2026-10-16",
                novoRegistro: true,
                diasRegistrados: 3,
                diasMarcados: ["2026-10-14", "2026-10-15", "2026-10-16"],
                diasNecessarios: 3,
                concluida: true,
                pontosGanhos: 30,
                conquistasNovas: [{ slug: "noites_frescas", nome: "Noites frescas" }],
              },
            }),
          },
          "400": respostaErro("ID inválido.", "ENTRADA_INVALIDA", "Identificador inválido."),
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Missão não encontrada.", "MISSAO_NAO_ENCONTRADA", "Missão não encontrada."),
          "429": respostaErro(
            "Muitas ações seguidas do mesmo perfil: 120 a cada 10 minutos, somando as rotas que gravam.",
            "LIMITE_DE_REQUISICOES",
            "Muitas ações seguidas. Espere um pouco e tente de novo.",
          ),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/rankings": {
      get: {
        tags: ["Rankings e mapa"],
        summary: "Ranking de bairros ou de escolas",
        description: [
          "Soma dos pontos dos estudantes de cada bairro ou escola, sem nenhum dado individual.",
          "Os pontos acompanham o bairro e a escola **atuais** do estudante. Empates dividem a posição.",
          "No ranking de escolas, só contam os estudantes que entraram pelo código de turma (`escola_verificada`).",
          "Só aparecem bairros e escolas com **pelo menos 3 estudantes com pontos**, para que a soma não revele os pontos",
          "de ninguém. Perfis de teste não contam. Enquanto nenhum bairro ou escola chegar a 3, a lista vem vazia.",
        ].join("\n"),
        operationId: "listarRanking",
        security: [],
        parameters: [
          {
            name: "tipo",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["bairros", "escolas"] },
          },
        ],
        responses: {
          "200": {
            description: "Ranking ordenado pela posição.",
            content: json(
              { type: "array", items: ref("ItemRanking") },
              {
                example: [
                  { id: UUID_ESCOLA, nome: "Escola Estadual Sol Nascente (fictícia)", bairroId: UUID_BAIRRO, pontos: 120, participantes: 4, posicao: 1 },
                ],
              },
            ),
          },
          "400": respostaErro("Tipo inválido.", "ENTRADA_INVALIDA", "tipo: Use tipo=bairros ou tipo=escolas."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/mapa/pontos": {
      get: {
        tags: ["Rankings e mapa"],
        summary: "Pontos do mapa de São Luís",
        operationId: "listarPontosMapa",
        security: [],
        parameters: [
          {
            name: "tipo",
            in: "query",
            required: false,
            description: "Filtra por tipo.",
            schema: { type: "string", enum: ["solar", "coleta", "acao"] },
          },
        ],
        responses: {
          "200": {
            description: "Pontos do mapa.",
            content: json(
              { type: "array", items: ref("PontoMapa") },
              {
                example: [
                  {
                    id: UUID_PONTO,
                    nome: "Ecoponto Itapiracó",
                    tipo: "coleta",
                    latitude: -2.53,
                    longitude: -44.3,
                    descricao: "Recebe eletrônicos, pilhas e baterias. Ecoponto da Prefeitura de São Luís. Av. Joaquim Mochel, Itapiracó. Funciona de segunda a sábado, das 7h às 19h.",
                  },
                ],
              },
            ),
          },
          "400": respostaErro("Tipo inválido.", "ENTRADA_INVALIDA", "tipo: Use tipo=solar, coleta ou acao."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
    "/api/perfil/resumo": {
      get: {
        tags: ["Perfil"],
        summary: "Resumo do estudante: pontos, trilhas, missões, conquistas e ranking",
        operationId: "obterResumoPerfil",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: [
              "Resumo. `escola` e `bairro` vêm `null` quando o perfil não tem escola ou bairro.",
              "Quando a escola ou o bairro ainda não pontuou, fica fora do ranking: `posicao` vem `null` e `pontos` vem 0.",
            ].join("\n"),
            content: json(ref("ResumoPerfil"), {
              example: {
                pontos: 85,
                licoesConcluidas: 5,
                trilhasConcluidas: 1,
                missoesConcluidas: 1,
                conquistas: [
                  {
                    slug: "primeira_simulacao",
                    nome: "Primeira simulação",
                    criterio: "Salvar a primeira simulação da conta de luz.",
                    obtida: true,
                    obtidaEm: "2026-10-16T12:00:00.000Z",
                  },
                  {
                    slug: "amigo_do_sol",
                    nome: "Amigo do sol",
                    criterio: "Concluir a trilha Energia solar em São Luís.",
                    obtida: false,
                    obtidaEm: null,
                  },
                ],
                escola: { posicao: 1, pontos: 120 },
                bairro: { posicao: 3, pontos: 310 },
              },
            }),
          },
          "401": { $ref: "#/components/responses/NaoAutenticado" },
          "404": respostaErro("Perfil não encontrado.", "PERFIL_NAO_ENCONTRADO", "Perfil não encontrado."),
          "500": { $ref: "#/components/responses/ErroInterno" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "access_token da sessão do Supabase (login anônimo).",
      },
    },
    responses: {
      NaoAutenticado: respostaErro(
        "Sem token ou token inválido.",
        "NAO_AUTENTICADO",
        "Faça login para acessar este recurso.",
      ),
      ErroInterno: respostaErro(
        "Erro inesperado no servidor.",
        "ERRO_INTERNO",
        "Ocorreu um erro inesperado. Tente novamente.",
      ),
    },
    schemas: {
      Erro: {
        type: "object",
        required: ["erro"],
        properties: {
          erro: {
            type: "object",
            required: ["codigo", "mensagem"],
            properties: {
              codigo: {
                type: "string",
                enum: [
                  "ENTRADA_INVALIDA",
                  "JSON_INVALIDO",
                  "NAO_AUTENTICADO",
                  "PERFIL_NAO_ENCONTRADO",
                  "TURMA_NAO_ENCONTRADA",
                  "BAIRRO_OU_ESCOLA_NAO_ENCONTRADO",
                  "APARELHO_NAO_ENCONTRADO",
                  "NENHUMA_SIMULACAO",
                  "TRILHA_NAO_ENCONTRADA",
                  "LICAO_NAO_ENCONTRADA",
                  "PERGUNTA_NAO_ENCONTRADA",
                  "MISSAO_NAO_ENCONTRADA",
                  "LICAO_E_PEDALE",
                  "LICAO_NAO_E_PEDALE",
                  "REFERENCIA_INVALIDA",
                  "LIMITE_DE_TROCAS",
                  "ERRO_INTERNO",
                ],
              },
              mensagem: { type: "string", description: "Texto pronto para mostrar ao usuário." },
            },
          },
        },
      },
      Bairro: {
        type: "object",
        required: ["id", "nome"],
        properties: { id: { type: "string", format: "uuid" }, nome: { type: "string" } },
      },
      Escola: {
        type: "object",
        required: ["id", "nome", "bairro_id"],
        properties: {
          id: { type: "string", format: "uuid" },
          nome: { type: "string" },
          bairro_id: { type: "string", format: "uuid" },
        },
      },
      Aparelho: {
        type: "object",
        required: ["id", "codigo", "nome", "potencia_w", "horas_padrao", "icone"],
        properties: {
          id: { type: "string", format: "uuid" },
          codigo: { type: "string", description: "Chave estável (ex.: `chuveiro`, `ar_condicionado`)." },
          nome: { type: "string" },
          potencia_w: { type: "number", description: "Potência aproximada em watts." },
          horas_padrao: { type: "number", description: "Horas de uso por dia sugeridas no formulário." },
          icone: { type: ["string", "null"] },
        },
      },
      Perfil: {
        type: "object",
        required: [
          "id",
          "primeiro_nome",
          "bairro_id",
          "escola_id",
          "escola_verificada",
          "criado_em",
          "tem_perfil",
          "limite_trocas",
          "trocas_restantes",
          "proxima_troca_em",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          primeiro_nome: { type: ["string", "null"] },
          bairro_id: { type: ["string", "null"], format: "uuid" },
          escola_id: { type: ["string", "null"], format: "uuid" },
          escola_verificada: {
            type: "boolean",
            description:
              "`true` quando o estudante entrou na escola pelo `codigo_turma`. Só esses estudantes somam pontos no ranking de escolas.",
          },
          criado_em: { type: "string", format: "date-time" },
          tem_perfil: { type: "boolean", description: "`true` quando o primeiro nome já foi informado." },
          limite_trocas: { type: "integer", description: "Trocas de bairro ou escola permitidas a cada 30 dias." },
          trocas_restantes: { type: "integer", description: "Trocas que ainda podem ser feitas agora." },
          proxima_troca_em: {
            type: ["string", "null"],
            format: "date-time",
            description: "Quando a próxima troca é liberada. `null` enquanto houver trocas restantes.",
          },
        },
      },
      AtualizarPerfil: {
        type: "object",
        additionalProperties: false,
        required: ["primeiro_nome", "bairro_id"],
        properties: {
          primeiro_nome: {
            type: "string",
            minLength: 2,
            maxLength: 30,
            description: "Só o primeiro nome: letras, com hífen ou apóstrofo opcionais. Sem espaços ou números.",
          },
          bairro_id: { type: "string", format: "uuid" },
          escola_id: { type: "string", format: "uuid", description: "Não envie junto com `codigo_turma`." },
          codigo_turma: {
            type: "string",
            pattern: "^[A-Za-z0-9]{4,12}$",
            description: "Código da turma informado pelo professor. Não envie junto com `escola_id`.",
          },
        },
      },
      SimulacaoConta: {
        type: "object",
        additionalProperties: false,
        required: ["modo", "consumoKwh"],
        properties: {
          modo: { type: "string", const: "conta" },
          consumoKwh: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: 100000,
            description: "Consumo do mês em kWh, como aparece na conta.",
          },
          valorConta: {
            type: "number",
            exclusiveMinimum: 0,
            maximum: 1000000,
            description: "Valor da conta em R$. Se omitido, usa a tarifa padrão.",
          },
        },
      },
      ItemSimulacao: {
        type: "object",
        additionalProperties: false,
        required: ["aparelhoId", "quantidade", "horasDia"],
        properties: {
          aparelhoId: { type: "string", format: "uuid", description: "`id` vindo de `GET /api/aparelhos`." },
          quantidade: { type: "integer", minimum: 1, maximum: 50 },
          horasDia: { type: "number", exclusiveMinimum: 0, maximum: 24, description: "Horas de uso por dia (0,5 = 30 min)." },
        },
      },
      SimulacaoAparelhos: {
        type: "object",
        additionalProperties: false,
        required: ["modo", "itens"],
        properties: {
          modo: { type: "string", const: "aparelhos" },
          itens: {
            type: "array",
            minItems: 1,
            maxItems: 30,
            description: "Cada aparelho aparece uma vez só; use `quantidade` para repetir.",
            items: ref("ItemSimulacao"),
          },
        },
      },
      Peso: {
        type: "object",
        required: ["aparelho", "percentual"],
        properties: {
          aparelho: { type: "string", description: "Nome do aparelho." },
          percentual: { type: "number", description: "Participação no consumo, com 1 casa decimal." },
        },
      },
      PerguntaTutor: {
        type: "object",
        required: ["mensagem"],
        additionalProperties: false,
        properties: {
          mensagem: { type: "string", minLength: 1, maxLength: 500 },
          historico: {
            type: "array",
            maxItems: 10,
            description: "Últimas mensagens da conversa, da mais antiga para a mais nova.",
            items: {
              type: "object",
              required: ["papel", "texto"],
              additionalProperties: false,
              properties: {
                papel: { type: "string", enum: ["usuario", "energinho"] },
                texto: { type: "string", minLength: 1, maxLength: 1000 },
              },
            },
          },
        },
      },
      RespostaTutor: {
        type: "object",
        required: ["resposta", "licoesRelacionadas"],
        properties: {
          resposta: { type: "string", maxLength: 1500, description: "Texto do Energinho (até 1.500 caracteres)." },
          licoesRelacionadas: {
            type: "array",
            description: "Lições usadas na resposta, da mais parecida para a menos. Pode vir vazia.",
            items: {
              type: "object",
              required: ["id", "titulo", "trilhaSlug"],
              properties: {
                id: { type: "string", format: "uuid" },
                titulo: { type: "string" },
                trilhaSlug: { type: "string" },
              },
            },
          },
        },
      },
      SolDeHoje: {
        type: "object",
        required: [
          "data",
          "atualizadoEm",
          "diasDeAtraso",
          "irradiacao",
          "kwhPorPlaca",
          "horasArCondicionado",
          "co2EvitadoKg",
          "estimativa",
          "fonte",
        ],
        properties: {
          data: {
            type: ["string", "null"],
            format: "date",
            description: "Dia real da medição (fuso de São Luís). `null` quando o valor é a média anual padrão.",
          },
          atualizadoEm: {
            type: ["string", "null"],
            format: "date-time",
            description: "Quando o servidor buscou esse valor na NASA POWER com sucesso. `null` com a fonte `padrao`.",
          },
          diasDeAtraso: {
            type: ["integer", "null"],
            minimum: 0,
            description: "Dias entre `data` e hoje em São Luís. `null` com a fonte `padrao`.",
          },
          irradiacao: { type: "number", description: "Irradiação no plano horizontal, em kWh/m²/dia (2 casas)." },
          kwhPorPlaca: { type: "number", description: "Energia gerada por uma placa de 550 Wp no dia, em kWh (2 casas)." },
          horasArCondicionado: {
            type: "number",
            description: "Horas de ar-condicionado (potência do catálogo) que essa energia alimenta (1 casa).",
          },
          co2EvitadoKg: { type: "number", description: "CO₂ evitado por essa placa no dia, em kg (3 casas)." },
          estimativa: { type: "boolean", const: true },
          fonte: {
            type: "string",
            enum: ["nasa", "cache", "padrao"],
            description:
              "`nasa`: buscado agora na NASA POWER; `cache`: último dia válido guardado da NASA POWER; `padrao`: média anual de reserva.",
          },
        },
      },
      ResultadoSimulacao: {
        type: "object",
        required: [
          "consumoKwh",
          "gastoMensal",
          "economiaHabitosMensal",
          "economiaSolarMensal",
          "kwhGeradoMes",
          "custoSistemaSolar",
          "retornoSolarAnos",
          "economiaMensal",
          "placas",
          "retornoAnos",
          "co2EvitadoKgAno",
          "pesos",
          "comoCalculamos",
        ],
        properties: {
          consumoKwh: { type: "number", description: "Consumo mensal em kWh (1 casa decimal)." },
          gastoMensal: { type: "number", description: "Gasto mensal estimado em R$ (2 casas)." },
          economiaHabitosMensal: {
            type: ["number", "null"],
            description:
              "Economia por mês em R$ com **mudança de hábitos**, sem investimento (2 casas). Não tem relação com o retorno. `null` não acontece numa simulação nova.",
          },
          economiaSolarMensal: {
            type: ["number", "null"],
            description:
              "Economia por mês em R$ **com as placas solares**: a energia gerada, até o consumo, × a tarifa (2 casas). `null` em simulações salvas antes desta versão.",
          },
          kwhGeradoMes: {
            type: ["number", "null"],
            description: "Energia que as placas geram por mês, em kWh (1 casa). `null` em simulações antigas.",
          },
          custoSistemaSolar: {
            type: ["number", "null"],
            description: "Custo estimado do sistema solar instalado, em R$ (2 casas). `null` em simulações antigas.",
          },
          retornoSolarAnos: {
            type: ["number", "null"],
            description: "Anos para o sistema solar se pagar: custo ÷ (economia solar × 12), com 1 casa.",
          },
          economiaMensal: {
            type: "number",
            deprecated: true,
            description: "Igual a `economiaHabitosMensal`. Mantido por compatibilidade; use `economiaHabitosMensal`.",
          },
          placas: { type: "integer", description: "Quantidade de placas solares de 550 Wp para cobrir o consumo." },
          retornoAnos: {
            type: "number",
            deprecated: true,
            description: "Igual a `retornoSolarAnos`. Mantido por compatibilidade; use `retornoSolarAnos`.",
          },
          co2EvitadoKgAno: { type: "number", description: "CO₂ evitado por ano com as placas, em kg (1 casa)." },
          pesos: {
            type: "array",
            description: "Só no modo `aparelhos` (vazio no modo `conta`). Ordenado do maior para o menor; soma 100.",
            items: ref("Peso"),
          },
          comoCalculamos: {
            type: ["object", "null"],
            description: "Texto curto, com os números da simulação, explicando cada cálculo. `null` em simulações antigas.",
            required: ["economiaHabitos", "economiaSolar", "custoSistemaSolar", "retornoSolar"],
            properties: {
              economiaHabitos: { type: "string" },
              economiaSolar: { type: "string" },
              custoSistemaSolar: { type: "string" },
              retornoSolar: { type: "string" },
            },
          },
        },
      },
      RespostaSimulacao: {
        allOf: [
          ref("ResultadoSimulacao"),
          ref("ResultadoEvento"),
          {
            type: "object",
            required: ["simulacaoId"],
            properties: {
              simulacaoId: {
                type: ["string", "null"],
                format: "uuid",
                description: "ID da simulação salva, ou `null` quando não há login.",
              },
            },
          },
        ],
      },
      SimulacaoSalva: {
        type: "object",
        required: ["id", "modo", "consumoKwh", "valorConta", "criadoEm", "resultado"],
        properties: {
          id: { type: "string", format: "uuid" },
          modo: { type: "string", enum: ["conta", "aparelhos"] },
          consumoKwh: { type: "number" },
          valorConta: { type: ["number", "null"] },
          criadoEm: { type: "string", format: "date-time" },
          resultado: ref("ResultadoSimulacao"),
        },
      },
      ConquistaNova: {
        type: "object",
        required: ["slug", "nome"],
        properties: { slug: { type: "string" }, nome: { type: "string" } },
      },
      ResultadoEvento: {
        type: "object",
        required: ["pontosGanhos", "conquistasNovas"],
        properties: {
          pontosGanhos: { type: "integer", description: "Pontos ganhos nesta ação (0 se a ação já tinha pontuado)." },
          conquistasNovas: {
            type: "array",
            description: "Conquistas obtidas agora. Vazio na maioria das vezes.",
            items: ref("ConquistaNova"),
          },
        },
      },
      ResumoTrilha: {
        type: "object",
        required: ["id", "slug", "titulo", "descricao", "tema", "minutos", "totalLicoes", "licoesConcluidas", "concluida"],
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          tema: { type: "string" },
          minutos: { type: "integer", description: "Tempo estimado da trilha." },
          totalLicoes: { type: "integer" },
          licoesConcluidas: { type: "integer" },
          concluida: { type: "boolean" },
        },
      },
      TrilhaDetalhada: {
        allOf: [
          ref("ResumoTrilha"),
          {
            type: "object",
            required: ["licoes"],
            properties: {
              licoes: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "ordem", "titulo", "tipo", "concluida", "liberada"],
                  properties: {
                    id: { type: "string", format: "uuid" },
                    ordem: { type: "integer" },
                    titulo: { type: "string" },
                    tipo: { type: "string", enum: ["texto", "pedale"] },
                    concluida: { type: "boolean" },
                    liberada: {
                      type: "boolean",
                      description: "Se a lição pode ser concluída: as anteriores da trilha estão concluídas (ou ela já está).",
                    },
                  },
                },
              },
            },
          },
        ],
      },
      LicaoDetalhada: {
        type: "object",
        required: [
          "id",
          "trilha",
          "ordem",
          "titulo",
          "conteudo",
          "tipo",
          "totalPerguntas",
          "concluida",
          "liberada",
          "licaoPendente",
          "proximaLicaoId",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          trilha: {
            type: "object",
            required: ["slug", "titulo"],
            properties: { slug: { type: "string" }, titulo: { type: "string" } },
          },
          ordem: { type: "integer" },
          titulo: { type: "string" },
          conteudo: { type: "string", description: "Texto em Markdown." },
          tipo: { type: "string", enum: ["texto", "pedale"] },
          totalPerguntas: { type: "integer" },
          concluida: { type: "boolean" },
          liberada: { type: "boolean", description: "Se a lição pode ser concluída agora." },
          licaoPendente: {
            type: ["object", "null"],
            required: ["id", "titulo"],
            properties: { id: { type: "string", format: "uuid" }, titulo: { type: "string" } },
            description: "Primeira lição anterior não concluída; `null` quando a lição está liberada.",
          },
          proximaLicaoId: { type: ["string", "null"], format: "uuid", description: "Próxima lição da trilha." },
        },
      },
      LicaoConcluida: {
        allOf: [
          ref("ResultadoEvento"),
          {
            type: "object",
            required: ["licaoId", "concluida"],
            properties: { licaoId: { type: "string", format: "uuid" }, concluida: { type: "boolean", const: true } },
          },
        ],
      },
      PerguntaDoQuiz: {
        type: "object",
        required: ["id", "ordem", "enunciado", "opcoes", "jaRespondida", "acertou", "podePontuar"],
        properties: {
          id: { type: "string", format: "uuid" },
          ordem: { type: "integer" },
          enunciado: { type: "string" },
          opcoes: { type: "array", items: { type: "string" }, description: "Responda com o índice (0, 1, 2...)." },
          jaRespondida: { type: "boolean" },
          acertou: { type: ["boolean", "null"], description: "Se acertou na primeira tentativa. `null` se ainda não respondeu." },
          podePontuar: {
            type: "boolean",
            description:
              "Se a próxima resposta vale pontos: só antes da primeira tentativa. Sempre `false` sem login ou com a lição não concluída.",
          },
        },
      },
      Quiz: {
        type: "object",
        required: ["licaoId", "licaoConcluida", "perguntas"],
        properties: {
          licaoId: { type: "string", format: "uuid" },
          licaoConcluida: { type: "boolean", description: "Se o usuário concluiu a lição. Sempre `false` sem login." },
          perguntas: { type: "array", items: ref("PerguntaDoQuiz") },
        },
      },
      ResponderQuiz: {
        type: "object",
        additionalProperties: false,
        required: ["perguntaId", "opcao"],
        properties: {
          perguntaId: { type: "string", format: "uuid" },
          opcao: { type: "integer", minimum: 0, maximum: 4, description: "Índice da opção escolhida." },
        },
      },
      RespostaDoQuiz: {
        allOf: [
          ref("ResultadoEvento"),
          {
            type: "object",
            required: ["correta", "opcaoCorreta", "explicacao", "tentativaPontuavel"],
            properties: {
              correta: { type: "boolean" },
              opcaoCorreta: { type: "integer", minimum: 0, description: "Índice da opção certa, certa ou errada a resposta." },
              explicacao: { type: "string", description: "Por que a opção certa está certa, certa ou errada a resposta." },
              tentativaPontuavel: {
                type: "boolean",
                description: "`true` só na primeira tentativa, a única que pode valer pontos. `false` é treino.",
              },
            },
          },
        ],
      },
      ConcluirPedale: {
        type: "object",
        additionalProperties: false,
        required: ["licaoId"],
        properties: { licaoId: { type: "string", format: "uuid", description: "Lição do tipo `pedale`." } },
      },
      Missao: {
        type: "object",
        required: [
          "id",
          "slug",
          "titulo",
          "descricao",
          "trilhaSlug",
          "pontos",
          "diasNecessarios",
          "diasRegistrados",
          "diasMarcados",
          "registradaHoje",
          "concluida",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          trilhaSlug: { type: ["string", "null"], description: "Slug da trilha a que a missão pertence." },
          pontos: { type: "integer" },
          diasNecessarios: { type: "integer" },
          diasRegistrados: { type: "integer" },
          diasMarcados: {
            type: "array",
            items: { type: "string", format: "date" },
            description: "Dias registrados (`AAAA-MM-DD`, fuso de São Luís), em ordem. Vazio sem login.",
          },
          registradaHoje: { type: "boolean" },
          concluida: { type: "boolean" },
        },
      },
      RegistroMissao: {
        allOf: [
          ref("ResultadoEvento"),
          {
            type: "object",
            required: ["missaoId", "dia", "novoRegistro", "diasRegistrados", "diasMarcados", "diasNecessarios", "concluida"],
            properties: {
              missaoId: { type: "string", format: "uuid" },
              dia: { type: "string", format: "date", description: "Dia do registro no fuso de São Luís." },
              novoRegistro: { type: "boolean", description: "`false` se já havia registro hoje." },
              diasRegistrados: { type: "integer" },
              diasMarcados: {
                type: "array",
                items: { type: "string", format: "date" },
                description: "Dias registrados (`AAAA-MM-DD`, fuso de São Luís), em ordem, já com o de hoje.",
              },
              diasNecessarios: { type: "integer" },
              concluida: { type: "boolean" },
            },
          },
        ],
      },
      ItemRanking: {
        type: "object",
        required: ["id", "nome", "pontos", "participantes", "posicao"],
        properties: {
          id: { type: "string", format: "uuid", description: "ID do bairro ou da escola." },
          nome: { type: "string" },
          bairroId: { type: "string", format: "uuid", description: "Só no ranking de escolas." },
          pontos: { type: "integer" },
          participantes: { type: "integer", description: "Estudantes com pontos." },
          posicao: { type: "integer" },
        },
      },
      PontoMapa: {
        type: "object",
        required: ["id", "nome", "tipo", "latitude", "longitude", "descricao"],
        properties: {
          id: { type: "string", format: "uuid" },
          nome: { type: "string" },
          tipo: { type: "string", enum: ["solar", "coleta", "acao"] },
          latitude: { type: "number" },
          longitude: { type: "number" },
          descricao: { type: "string" },
        },
      },
      PosicaoRanking: {
        type: "object",
        required: ["posicao", "pontos"],
        properties: {
          posicao: { type: ["integer", "null"], description: "`null` enquanto não houver pontos (fora do ranking)." },
          pontos: { type: "integer" },
        },
      },
      ResumoPerfil: {
        type: "object",
        required: ["pontos", "licoesConcluidas", "trilhasConcluidas", "missoesConcluidas", "conquistas", "escola", "bairro"],
        properties: {
          pontos: { type: "integer" },
          licoesConcluidas: { type: "integer" },
          trilhasConcluidas: { type: "integer" },
          missoesConcluidas: { type: "integer" },
          conquistas: {
            type: "array",
            description: "Todas as conquistas, obtidas ou não (para mostrar as bloqueadas).",
            items: {
              type: "object",
              required: ["slug", "nome", "criterio", "obtida", "obtidaEm"],
              properties: {
                slug: { type: "string" },
                nome: { type: "string" },
                criterio: { type: "string" },
                obtida: { type: "boolean" },
                obtidaEm: { type: ["string", "null"], format: "date-time" },
              },
            },
          },
          escola: { oneOf: [ref("PosicaoRanking"), { type: "null" }] },
          bairro: { oneOf: [ref("PosicaoRanking"), { type: "null" }] },
        },
      },
    },
  },
} as const;
