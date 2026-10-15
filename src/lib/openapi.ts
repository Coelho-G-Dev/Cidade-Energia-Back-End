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

const resultadoConta = {
  consumoKwh: 380,
  gastoMensal: 312,
  economiaMensal: 31.2,
  placas: 6,
  retornoAnos: 2.5,
  co2EvitadoKgAno: 197.6,
  pesos: [],
};

const resultadoAparelhos = {
  consumoKwh: 82.5,
  gastoMensal: 73.33,
  economiaMensal: 24.44,
  placas: 2,
  retornoAnos: 3.6,
  co2EvitadoKgAno: 65.9,
  pesos: [{ aparelho: "Chuveiro elétrico", percentual: 100 }],
};

export const especificacaoOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "Cidade Energia API",
    version: "0.1.0",
    description: [
      "API do app educacional **Cidade Energia**: simulador da conta de luz, perfil do estudante e catálogos.",
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
          "Todo usuário logado já tem um perfil, criado automaticamente. `tem_perfil` é `false` até o estudante informar o primeiro nome.",
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
                    criado_em: "2026-10-15T12:00:00.000Z",
                    tem_perfil: false,
                  },
                },
                completo: {
                  summary: "Perfil preenchido",
                  value: {
                    id: UUID_USUARIO,
                    primeiro_nome: "Ana",
                    bairro_id: UUID_BAIRRO,
                    escola_id: UUID_ESCOLA,
                    criado_em: "2026-10-15T12:00:00.000Z",
                    tem_perfil: true,
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
          "Envie `escola_id` **ou** `codigo_turma` (nunca os dois), ou nenhum deles. O código de turma é convertido para maiúsculas.",
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
                  value: { ...resultadoConta, simulacaoId: null },
                },
                aparelhos: {
                  summary: "Modo aparelhos com login",
                  value: { ...resultadoAparelhos, simulacaoId: UUID_SIMULACAO },
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
                  "REFERENCIA_INVALIDA",
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
        required: ["id", "primeiro_nome", "bairro_id", "escola_id", "criado_em", "tem_perfil"],
        properties: {
          id: { type: "string", format: "uuid" },
          primeiro_nome: { type: ["string", "null"] },
          bairro_id: { type: ["string", "null"], format: "uuid" },
          escola_id: { type: ["string", "null"], format: "uuid" },
          criado_em: { type: "string", format: "date-time" },
          tem_perfil: { type: "boolean", description: "`true` quando o primeiro nome já foi informado." },
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
      ResultadoSimulacao: {
        type: "object",
        required: ["consumoKwh", "gastoMensal", "economiaMensal", "placas", "retornoAnos", "co2EvitadoKgAno", "pesos"],
        properties: {
          consumoKwh: { type: "number", description: "Consumo mensal em kWh (1 casa decimal)." },
          gastoMensal: { type: "number", description: "Gasto mensal estimado em R$ (2 casas)." },
          economiaMensal: {
            type: "number",
            description: "Economia mensal em R$ com mudança de hábitos (2 casas).",
          },
          placas: { type: "integer", description: "Quantidade de placas solares de 550 Wp para cobrir o consumo." },
          retornoAnos: { type: "number", description: "Anos para o sistema solar se pagar (1 casa)." },
          co2EvitadoKgAno: { type: "number", description: "CO₂ evitado por ano com as placas, em kg (1 casa)." },
          pesos: {
            type: "array",
            description: "Só no modo `aparelhos` (vazio no modo `conta`). Ordenado do maior para o menor; soma 100.",
            items: ref("Peso"),
          },
        },
      },
      RespostaSimulacao: {
        allOf: [
          ref("ResultadoSimulacao"),
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
    },
  },
} as const;
