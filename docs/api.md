# API — Cidade Energia

Referência de todas as rotas, com um exemplo de requisição e de resposta. A especificação completa, com todos os campos, está no Swagger (`GET /api/docs`) e em `GET /api/openapi`. Para testar, use o [`requests.http`](../requests.http).

- **Base:** `http://localhost:3000` no desenvolvimento ou a URL da Vercel.
- **Login:** envie `Authorization: Bearer <access_token>` da sessão anônima do Supabase. Na coluna "Login":
  - **sim**: sem token, a rota responde `401`;
  - **opcional**: a rota funciona sem token, mas o progresso vem zerado;
  - **não**: a rota é pública.
- **Corpo:** JSON (`Content-Type: application/json`). Campos desconhecidos são recusados com `400`.
- **Erros:** sempre `{ "erro": { "codigo": string, "mensagem": string } }`. A lista completa está em [Erros](#erros).
- Os IDs dos exemplos são fictícios.
- **Cache:** as rotas GET de conteúdo respondem `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`
  **sem token**, e a CDN da Vercel guarda a resposta por 5 minutos. Isso vale para trilhas, lições, quiz, bairros,
  escolas, aparelhos e mapa. O Sol de hoje fica 10 minutos, e `/api/openapi` e `/api/docs`, 1 hora. **Com token**, a
  resposta vem `private, no-store`, porque traz o progresso do estudante, e nunca é guardada. Todas as respostas têm
  `Vary: Origin, Authorization`. Rankings, perfil, simulações, missões, quiz respondido e tutor não são guardados.
  Depois de rodar um seed de conteúdo, as respostas antigas podem aparecer por até 5 minutos.

## Resumo

| Método | Rota | Login |
|---|---|---|
| GET | [`/api/bairros`](#get-apibairros) | não |
| GET | [`/api/escolas`](#get-apiescolas) | não |
| GET | [`/api/aparelhos`](#get-apiaparelhos) | não |
| GET | [`/api/perfil`](#get-apiperfil) | sim |
| PUT | [`/api/perfil`](#put-apiperfil) | sim |
| GET | [`/api/perfil/resumo`](#get-apiperfilresumo) | sim |
| POST | [`/api/simulacoes`](#post-apisimulacoes) | opcional |
| POST | [`/api/simulacoes/previa`](#post-apisimulacoesprevia) | opcional |
| GET | [`/api/simulacoes/ultima`](#get-apisimulacoesultima) | sim |
| GET | [`/api/sol-de-hoje`](#get-apisol-de-hoje) | não |
| POST | [`/api/tutor`](#post-apitutor) | sim |
| GET | [`/api/trilhas`](#get-apitrilhas) | opcional |
| GET | [`/api/trilhas/{slug}`](#get-apitrilhasslug) | opcional |
| GET | [`/api/licoes/{id}`](#get-apilicoesid) | opcional |
| POST | [`/api/licoes/{id}/concluir`](#post-apilicoesidconcluir) | sim |
| GET | [`/api/licoes/{id}/quiz`](#get-apilicoesidquiz) | opcional |
| POST | [`/api/quiz/responder`](#post-apiquizresponder) | sim |
| POST | [`/api/pedale/concluir`](#post-apipedaleconcluir) | sim |
| GET | [`/api/missoes`](#get-apimissoes) | opcional |
| POST | [`/api/missoes/{id}/registrar`](#post-apimissoesidregistrar) | sim |
| GET | [`/api/rankings`](#get-apirankings) | não |
| GET | [`/api/mapa/pontos`](#get-apimapapontos) | não |
| GET | `/api/docs` e `/api/openapi` | não |

---

## Catálogos

### GET /api/bairros

Lista os bairros em ordem alfabética.

```http
GET /api/bairros
```

```json
[{ "id": "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f", "nome": "Anil" }]
```

### GET /api/escolas

Lista as escolas **ativas**. O filtro `?bairro=<id>` é opcional. Quando a lista real de escolas for carregada, as 3 fictícias ficam inativas: saem desta lista, o código de turma delas para de funcionar e elas saem do ranking. Quem já tinha escolhido uma delas continua com ela no perfil.

```http
GET /api/escolas?bairro=2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f
```

```json
[
  {
    "id": "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    "nome": "Escola Estadual Sol Nascente (fictícia)",
    "bairro_id": "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f"
  }
]
```

Erros: `400 ENTRADA_INVALIDA` (bairro inválido).

### GET /api/aparelhos

Lista os aparelhos do simulador. Use `horas_padrao` para pré-preencher o formulário.

```http
GET /api/aparelhos
```

```json
[
  {
    "id": "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
    "codigo": "chuveiro",
    "nome": "Chuveiro elétrico",
    "potencia_w": 5500,
    "horas_padrao": 0.5,
    "icone": "chuveiro"
  }
]
```

---

## Perfil

### GET /api/perfil

Perfil do usuário logado. Todo usuário anônimo já tem um perfil. `tem_perfil` diz se o primeiro nome já foi informado.

```http
GET /api/perfil
Authorization: Bearer <token>
```

```json
{
  "id": "0e9d8c7b-6a5f-4e4d-9c3b-2a1f0e9d8c7b",
  "primeiro_nome": "Ana",
  "bairro_id": "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f",
  "escola_id": "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  "escola_verificada": true,
  "criado_em": "2026-10-15T12:00:00.000Z",
  "tem_perfil": true,
  "limite_trocas": 3,
  "trocas_restantes": 2,
  "proxima_troca_em": null
}
```

Erros: `401 NAO_AUTENTICADO`, `404 PERFIL_NAO_ENCONTRADO`.

### PUT /api/perfil

Cria ou atualiza o perfil.

- Envie **só o primeiro nome**.
- A escola é opcional: envie `escola_id` **ou** `codigo_turma`, nunca os dois.
- Só quem entra pelo `codigo_turma` fica com `escola_verificada: true` e soma pontos no ranking de escolas.
  Trocar de escola desfaz a verificação.
- Trocar de bairro ou de escola tem limite: 3 vezes a cada 30 dias.

```http
PUT /api/perfil
Authorization: Bearer <token>
Content-Type: application/json

{ "primeiro_nome": "João", "bairro_id": "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f", "codigo_turma": "SOL2026" }
```

A resposta tem o mesmo formato do `GET /api/perfil`.

Erros:

- `400 ENTRADA_INVALIDA` (nome com espaço ou número, `escola_id` e `codigo_turma` juntos);
- `401 NAO_AUTENTICADO`;
- `404 TURMA_NAO_ENCONTRADA`;
- `404 BAIRRO_OU_ESCOLA_NAO_ENCONTRADO`;
- `409 ESCOLA_INATIVA` (a escola escolhida foi desativada; quem já estava nela pode continuar atualizando o perfil);
- `429 LIMITE_DE_TROCAS`;
- `429 LIMITE_DE_REQUISICOES` (muitas ações seguidas do mesmo perfil).

### GET /api/perfil/resumo

Pontos, progresso, conquistas (obtidas e bloqueadas) e a posição da escola e do bairro no ranking.

```http
GET /api/perfil/resumo
Authorization: Bearer <token>
```

```json
{
  "pontos": 85,
  "licoesConcluidas": 5,
  "trilhasConcluidas": 1,
  "missoesConcluidas": 1,
  "conquistas": [
    {
      "slug": "primeira_simulacao",
      "nome": "Primeira simulação",
      "criterio": "Salvar a primeira simulação da conta de luz.",
      "obtida": true,
      "obtidaEm": "2026-10-16T12:00:00.000Z"
    },
    {
      "slug": "amigo_do_sol",
      "nome": "Amigo do sol",
      "criterio": "Concluir a trilha Energia solar em São Luís.",
      "obtida": false,
      "obtidaEm": null
    }
  ],
  "escola": { "posicao": 1, "pontos": 120 },
  "bairro": { "posicao": 3, "pontos": 310 }
}
```

`escola: null` quer dizer que o estudante não informou escola. `{ "posicao": null, "pontos": 0 }` quer dizer que a escola ou o bairro ainda não pontuou.

Erros: `401 NAO_AUTENTICADO`, `404 PERFIL_NAO_ENCONTRADO`.

---

## Simulador

### POST /api/simulacoes

Simula a conta de luz. Com login, salva a simulação, e a primeira vale 20 pontos. Todos os valores são estimativas.
Para a estimativa ao vivo (a cada + ou −), use [`POST /api/simulacoes/previa`](#post-apisimulacoesprevia), que nunca salva.

Modo conta (`valorConta` é opcional; sem ele, a API usa a tarifa padrão):

```http
POST /api/simulacoes
Content-Type: application/json

{ "modo": "conta", "consumoKwh": 380, "valorConta": 312 }
```

```json
{
  "consumoKwh": 380,
  "gastoMensal": 312,
  "economiaHabitosMensal": 31.2,
  "economiaSolarMensal": 312,
  "kwhGeradoMes": 413.9,
  "custoSistemaSolar": 9372,
  "retornoSolarAnos": 2.5,
  "economiaMensal": 31.2,
  "placas": 6,
  "retornoAnos": 2.5,
  "co2EvitadoKgAno": 191.2,
  "pesos": [],
  "comoCalculamos": {
    "economiaHabitos": "Meta de 10% da conta com mudança de hábitos, sem investimento: R$ 312,00 × 10%.",
    "economiaSolar": "Cada placa de 550 W gera cerca de 69 kWh por mês com o sol de São Luís (5,23 kWh/m² por dia × 0,55 kWp × 0,8 × 30 dias). 6 placas geram 413,9 kWh. A economia é a energia gerada, até o seu consumo de 380 kWh, × R$ 0,8211 por kWh. A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
    "custoSistemaSolar": "6 × 0,55 kWp × R$ 2.840,00 por kWp instalado = R$ 9.372,00 (preço médio de mercado, estimativa).",
    "retornoSolar": "R$ 9.372,00 ÷ (R$ 312,00 × 12 meses) = 2,5 anos. Usa a economia com energia solar, não a de hábitos."
  },
  "simulacaoId": null,
  "pontosGanhos": 0,
  "conquistasNovas": []
}
```

Modo aparelhos (com login):

```http
POST /api/simulacoes
Authorization: Bearer <token>
Content-Type: application/json

{
  "modo": "aparelhos",
  "itens": [{ "aparelhoId": "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a", "quantidade": 1, "horasDia": 0.5 }]
}
```

```json
{
  "consumoKwh": 82.5,
  "gastoMensal": 73.33,
  "economiaHabitosMensal": 24.44,
  "economiaSolarMensal": 73.33,
  "kwhGeradoMes": 138,
  "custoSistemaSolar": 3124,
  "retornoSolarAnos": 3.6,
  "economiaMensal": 24.44,
  "placas": 2,
  "retornoAnos": 3.6,
  "co2EvitadoKgAno": 63.7,
  "pesos": [{ "aparelho": "Chuveiro elétrico", "percentual": 100 }],
  "comoCalculamos": {
    "economiaHabitos": "Mudança de hábitos, sem investimento: tomar banhos 10 minutos mais curtos por dia. São 27,5 kWh a menos por mês × R$ 0,8888 por kWh.",
    "economiaSolar": "Cada placa de 550 W gera cerca de 69 kWh por mês com o sol de São Luís (5,23 kWh/m² por dia × 0,55 kWp × 0,8 × 30 dias). 2 placas geram 138 kWh. A economia é a energia gerada, até o seu consumo de 82,5 kWh, × R$ 0,8888 por kWh. A conta de luz ainda cobra uma taxa mínima, que as placas não zeram.",
    "custoSistemaSolar": "2 × 0,55 kWp × R$ 2.840,00 por kWp instalado = R$ 3.124,00 (preço médio de mercado, estimativa).",
    "retornoSolar": "R$ 3.124,00 ÷ (R$ 73,33 × 12 meses) = 3,6 anos. Usa a economia com energia solar, não a de hábitos."
  },
  "simulacaoId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
  "pontosGanhos": 20,
  "conquistasNovas": [{ "slug": "primeira_simulacao", "nome": "Primeira simulação" }]
}
```

Como ler os campos:

| Campo | O que é | Fórmula |
|---|---|---|
| `economiaHabitosMensal` | Economia mudando hábitos, sem investimento | modo conta: 10% do gasto; modo aparelhos: 1 h a menos de ar e 10 min a menos de banho por dia × tarifa |
| `economiaSolarMensal` | Economia com as placas solares | mín(kWh gerado, consumo) × tarifa |
| `kwhGeradoMes` | Energia gerada pelas placas | placas × irradiação × 0,55 kWp × 0,8 × 30 |
| `custoSistemaSolar` | Custo do sistema instalado | placas × 0,55 kWp × R$ 2.840 |
| `retornoSolarAnos` | Anos para as placas se pagarem | custo ÷ (economia solar × 12) |
| `comoCalculamos` | Texto curto, com os números, para cada um dos 4 itens acima | — |
| `economiaMensal`, `retornoAnos` | **Obsoletos**: iguais a `economiaHabitosMensal` e `retornoSolarAnos` | — |

A tarifa é o valor da conta ÷ kWh quando ele é informado; senão, a tarifa padrão (R$ 0,8888/kWh).

Erros: `400 ENTRADA_INVALIDA`, `400 JSON_INVALIDO`, `404 APARELHO_NAO_ENCONTRADO`, `429 LIMITE_DE_REQUISICOES` (sem login, por endereço; com login, pelo limite de ações do perfil).

### POST /api/simulacoes/previa

Mesmo corpo e mesma resposta de `POST /api/simulacoes`, mas **nunca salva** e não pontua, mesmo com token.
Serve para a estimativa ao vivo do simulador. Quando o estudante tocar em "Ver meu resultado", use
`POST /api/simulacoes` com token para salvar.

```http
POST /api/simulacoes/previa
Content-Type: application/json

{ "modo": "conta", "consumoKwh": 380, "valorConta": 312 }
```

A resposta é igual à do modo conta sem login acima (`simulacaoId: null`, `pontosGanhos: 0`).

**Limite:** com token válido, conta por perfil: 120 prévias a cada 10 minutos. Sem token, esta rota e
`POST /api/simulacoes` sem login dividem 600 chamadas por minuto por endereço de rede (uma escola inteira pode
sair pelo mesmo endereço). O endereço não é guardado: o banco recebe só um hash.

Erros: `400 ENTRADA_INVALIDA`, `400 JSON_INVALIDO`, `404 APARELHO_NAO_ENCONTRADO`, `429 LIMITE_DE_REQUISICOES`.

### GET /api/simulacoes/ultima

Última simulação salva do usuário.

```http
GET /api/simulacoes/ultima
Authorization: Bearer <token>
```

```json
{
  "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
  "modo": "conta",
  "consumoKwh": 380,
  "valorConta": 312,
  "criadoEm": "2026-10-15T12:30:00.000Z",
  "resultado": {
    "consumoKwh": 380,
    "gastoMensal": 312,
    "economiaHabitosMensal": 31.2,
    "economiaSolarMensal": null,
    "kwhGeradoMes": null,
    "custoSistemaSolar": null,
    "retornoSolarAnos": 2.5,
    "economiaMensal": 31.2,
    "placas": 6,
    "retornoAnos": 2.5,
    "co2EvitadoKgAno": 191.2,
    "pesos": [],
    "comoCalculamos": null
  }
}
```

`resultado` tem os mesmos campos de `POST /api/simulacoes`. Nas simulações salvas antes desta versão (como no
exemplo), `economiaHabitosMensal` e `retornoSolarAnos` saem dos campos antigos, e `economiaSolarMensal`,
`kwhGeradoMes`, `custoSistemaSolar` e `comoCalculamos` vêm `null`. Para tê-los, simule de novo.

Erros: `401 NAO_AUTENTICADO`, `404 NENHUMA_SIMULACAO`.

---

## Sol de hoje

### GET /api/sol-de-hoje

Quanto uma placa de 550 Wp gera com o sol mais recente de São Luís. Usa a irradiação diária da NASA POWER (`ALLSKY_SFC_SW_DWN`), que chega com alguns dias de atraso.

```http
GET /api/sol-de-hoje
```

```json
{
  "data": "2026-10-16",
  "atualizadoEm": "2026-10-21T14:05:12.000Z",
  "diasDeAtraso": 5,
  "irradiacao": 7.09,
  "kwhPorPlaca": 3.12,
  "horasArCondicionado": 3.1,
  "co2EvitadoKg": 0.12,
  "estimativa": true,
  "fonte": "cache"
}
```

| Campo | Significado |
|---|---|
| `data` | Dia real da medição (fuso de São Luís). `null` quando o valor é a média padrão |
| `atualizadoEm` | Quando o servidor buscou esse valor na NASA POWER com sucesso (ISO 8601). `null` com a fonte `padrao` |
| `diasDeAtraso` | Dias entre `data` e hoje em São Luís (a NASA costuma atrasar de 2 a 7 dias). `null` com a fonte `padrao` |
| `irradiacao` | kWh/m²/dia no plano horizontal |
| `kwhPorPlaca` | Energia de uma placa de 550 Wp nesse dia (kWh) |
| `horasArCondicionado` | Horas de ar-condicionado (potência do catálogo) que essa energia alimenta |
| `co2EvitadoKg` | CO₂ evitado por essa placa nesse dia (kg) |
| `fonte` | `nasa` (buscado agora), `cache` (último dia válido guardado; o servidor tenta renovar quando passa de 6 h) ou `padrao` (média anual de reserva, 5,226) |

---

## Tutor Energinho

### POST /api/tutor

Pergunta ao tutor.

- Ele responde só sobre energia, conta de luz e sustentabilidade, com base nas lições do app.
- Limites:
  - `mensagem`: até 500 caracteres;
  - `historico`: até 10 itens, cada um com até 1.000 caracteres;
  - `resposta`: até 1.500 caracteres;
  - **20 mensagens por hora** por usuário.
- O servidor não grava o texto das conversas. Para manter o contexto, o front envia as últimas mensagens em `historico`.
- Pelo token, o servidor inclui no contexto do modelo o bairro do estudante e o resumo da última simulação: consumo em
  kWh, gasto do mês e o aparelho que mais pesa (só no modo aparelhos). O nome nunca vai para o modelo. Sem simulação,
  ou se esses dados falharem, o tutor responde normalmente. O front não precisa enviar nada a mais.

```http
POST /api/tutor
Authorization: Bearer <token>
Content-Type: application/json

{
  "mensagem": "E quantas placas uma casa precisa?",
  "historico": [
    { "papel": "usuario", "texto": "Como a placa solar funciona?" },
    { "papel": "energinho", "texto": "A placa transforma a luz do sol em energia elétrica." }
  ]
}
```

```json
{
  "resposta": "Depende de quanto a sua casa gasta por mês...",
  "licoesRelacionadas": [
    { "id": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70", "titulo": "Quantas placas para a minha casa?", "trilhaSlug": "energia-solar-em-sao-luis" }
  ]
}
```

`licoesRelacionadas` vem vazia quando nenhuma lição trata do assunto.

Erros:

- `400 ENTRADA_INVALIDA`;
- `401 NAO_AUTENTICADO`;
- `429 LIMITE_TUTOR` (a mensagem traz o horário de liberação);
- `503 TUTOR_INDISPONIVEL` (o Gemini não respondeu).

---

## Trilhas, lições e quiz

### GET /api/trilhas

Lista as trilhas com o progresso do usuário.

```http
GET /api/trilhas
Authorization: Bearer <token>
```

```json
[
  {
    "id": "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
    "slug": "energia-solar-em-sao-luis",
    "titulo": "Energia solar em São Luís",
    "descricao": "Por que o sol daqui é tão forte e como ele vira energia.",
    "tema": "solar",
    "minutos": 15,
    "totalLicoes": 4,
    "licoesConcluidas": 1,
    "concluida": false
  }
]
```

### GET /api/trilhas/{slug}

Trilha com a lista de lições.

As lições são concluídas **na ordem**. `liberada` é `true` quando todas as lições anteriores da trilha estão
concluídas; a primeira está sempre liberada, e uma lição já concluída continua liberada. Sem login, só a primeira
aparece liberada.

```http
GET /api/trilhas/energia-solar-em-sao-luis
```

```json
{
  "id": "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
  "slug": "energia-solar-em-sao-luis",
  "titulo": "Energia solar em São Luís",
  "descricao": "Por que o sol daqui é tão forte e como ele vira energia.",
  "tema": "solar",
  "minutos": 15,
  "totalLicoes": 2,
  "licoesConcluidas": 1,
  "concluida": false,
  "licoes": [
    { "id": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70", "ordem": 1, "titulo": "O sol de São Luís", "tipo": "texto", "concluida": true, "liberada": true },
    { "id": "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081", "ordem": 2, "titulo": "Pedale e veja", "tipo": "pedale", "concluida": false, "liberada": true }
  ]
}
```

Erros: `400 ENTRADA_INVALIDA`, `404 TRILHA_NAO_ENCONTRADA`.

### GET /api/licoes/{id}

Conteúdo da lição em Markdown e o ID da próxima lição. Ler é sempre livre, mesmo com a lição travada.

- `liberada`: se a lição pode ser concluída agora (mesma regra da trilha).
- `licaoPendente`: a primeira lição anterior não concluída (`{ id, titulo }`), ou `null` quando está liberada.

```http
GET /api/licoes/d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70
```

```json
{
  "id": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70",
  "trilha": { "slug": "energia-solar-em-sao-luis", "titulo": "Energia solar em São Luís" },
  "ordem": 1,
  "titulo": "O sol de São Luís",
  "conteudo": "## O sol de São Luís\n\nSão Luís fica perto da linha do Equador...",
  "tipo": "texto",
  "totalPerguntas": 2,
  "concluida": false,
  "liberada": true,
  "licaoPendente": null,
  "proximaLicaoId": "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081"
}
```

Erros: `400 ENTRADA_INVALIDA`, `404 LICAO_NAO_ENCONTRADA`.

### POST /api/licoes/{id}/concluir

Conclui uma lição de texto. Vale 10 pontos uma única vez. Só conclui depois das lições anteriores da mesma
trilha; senão responde `409 LICAO_BLOQUEADA` com a lição que falta na mensagem.

```http
POST /api/licoes/d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70/concluir
Authorization: Bearer <token>
```

```json
{ "licaoId": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70", "concluida": true, "pontosGanhos": 10, "conquistasNovas": [] }
```

Erros: `400 LICAO_E_PEDALE`, `401 NAO_AUTENTICADO`, `404 LICAO_NAO_ENCONTRADA`, `409 LICAO_BLOQUEADA`.

### GET /api/licoes/{id}/quiz

Perguntas do quiz **sem** a resposta certa, com a situação do usuário em cada uma. `licaoConcluida` diz se o
usuário já concluiu a lição; quando é `false`, todas as perguntas vêm com `podePontuar: false`.

```http
GET /api/licoes/d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70/quiz
Authorization: Bearer <token>
```

```json
{
  "licaoId": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70",
  "licaoConcluida": true,
  "perguntas": [
    {
      "id": "f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192",
      "ordem": 1,
      "enunciado": "Por que São Luís recebe tanto sol?",
      "opcoes": ["Porque fica perto da linha do Equador", "Porque é uma ilha", "Porque tem muitas praias"],
      "jaRespondida": true,
      "acertou": false,
      "podePontuar": false
    }
  ]
}
```

Erros: `400 ENTRADA_INVALIDA`, `404 LICAO_NAO_ENCONTRADA`.

### POST /api/quiz/responder

Corrige a resposta no servidor.

- Só responde depois de concluir a lição da pergunta. Antes disso, a API responde `409 LICAO_NAO_CONCLUIDA`,
  sem gravar a tentativa.
- Só a primeira tentativa vale pontos: 5 se estiver certa.
- As respostas seguintes são treino (`tentativaPontuavel: false`): a API corrige, sem pontos e sem mudar o
  registro da primeira tentativa.
- Certa ou errada, a resposta traz `opcaoCorreta` (índice da opção certa) e `explicacao`. Antes de responder,
  nenhuma rota revela os dois.

```http
POST /api/quiz/responder
Authorization: Bearer <token>
Content-Type: application/json

{ "perguntaId": "f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f708192", "opcao": 0 }
```

Acertou na primeira tentativa:

```json
{
  "correta": true,
  "opcaoCorreta": 0,
  "explicacao": "Perto do Equador o sol chega mais 'em pé' o ano todo.",
  "tentativaPontuavel": true,
  "pontosGanhos": 5,
  "conquistasNovas": []
}
```

Errou na primeira tentativa:

```json
{
  "correta": false,
  "opcaoCorreta": 0,
  "explicacao": "Perto do Equador o sol chega mais 'em pé' o ano todo.",
  "tentativaPontuavel": true,
  "pontosGanhos": 0,
  "conquistasNovas": []
}
```

Erros: `400 ENTRADA_INVALIDA`, `401 NAO_AUTENTICADO`, `404 PERGUNTA_NAO_ENCONTRADA`, `409 LICAO_NAO_CONCLUIDA`.

### POST /api/pedale/concluir

Registra o Pedale e veja. Vale 15 pontos uma única vez. Como as outras lições, só conclui depois das anteriores
da trilha (`409 LICAO_BLOQUEADA`).

```http
POST /api/pedale/concluir
Authorization: Bearer <token>
Content-Type: application/json

{ "licaoId": "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081" }
```

```json
{ "licaoId": "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7081", "concluida": true, "pontosGanhos": 15, "conquistasNovas": [] }
```

Erros: `400 LICAO_NAO_E_PEDALE`, `401 NAO_AUTENTICADO`, `404 LICAO_NAO_ENCONTRADA`, `409 LICAO_BLOQUEADA`.

---

## Missões

### GET /api/missoes

Lista as missões com o progresso do usuário.

- `trilhaSlug`: a trilha da missão (para o botão "missão prática" no fim da trilha), ou `null`.
- `diasMarcados`: os dias registrados (`AAAA-MM-DD`, fuso de São Luís), em ordem. Vazio sem login.

```http
GET /api/missoes
Authorization: Bearer <token>
```

```json
[
  {
    "id": "a7b8c9d0-e1f2-4a3b-8c4d-5e6f708192a3",
    "slug": "ar-desligado-antes-de-dormir",
    "titulo": "Noites frescas",
    "descricao": "Desligue o ar-condicionado 30 minutos antes de dormir por 3 noites.",
    "trilhaSlug": "ar-condicionado-sem-susto",
    "pontos": 30,
    "diasNecessarios": 3,
    "diasRegistrados": 1,
    "diasMarcados": ["2026-10-16"],
    "registradaHoje": true,
    "concluida": false
  }
]
```

### POST /api/missoes/{id}/registrar

Registra a missão no dia de hoje (fuso de São Luís).

- Vale um registro por dia.
- A missão pontua uma vez, quando `diasRegistrados` chega a `diasNecessarios`.

```http
POST /api/missoes/a7b8c9d0-e1f2-4a3b-8c4d-5e6f708192a3/registrar
Authorization: Bearer <token>
```

```json
{
  "missaoId": "a7b8c9d0-e1f2-4a3b-8c4d-5e6f708192a3",
  "dia": "2026-10-16",
  "novoRegistro": true,
  "diasRegistrados": 3,
  "diasMarcados": ["2026-10-14", "2026-10-15", "2026-10-16"],
  "diasNecessarios": 3,
  "concluida": true,
  "pontosGanhos": 30,
  "conquistasNovas": [{ "slug": "noites_frescas", "nome": "Noites frescas" }]
}
```

Erros: `400 ENTRADA_INVALIDA`, `401 NAO_AUTENTICADO`, `404 MISSAO_NAO_ENCONTRADA`.

---

## Rankings e mapa

### GET /api/rankings

Ranking de bairros (`?tipo=bairros`) ou de escolas (`?tipo=escolas`). Traz só os totais, sem dados individuais, e só bairros e escolas com **pelo menos 3 estudantes com pontos**, para que a soma não revele os pontos de ninguém. Perfis de teste não contam. Enquanto nenhum chegar a 3, a lista vem vazia. No ranking de escolas, só contam os estudantes que entraram pelo código de turma (`escola_verificada`).

```http
GET /api/rankings?tipo=escolas
```

```json
[
  {
    "id": "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    "nome": "Escola Estadual Sol Nascente (fictícia)",
    "bairroId": "2f6c1a9e-4b7d-4c1e-9a3f-1d2b3c4d5e6f",
    "pontos": 120,
    "participantes": 4,
    "posicao": 1
  }
]
```

Erros: `400 ENTRADA_INVALIDA` (`tipo` ausente ou inválido).

### GET /api/mapa/pontos

Pontos do mapa. O filtro `?tipo=solar|coleta|acao` é opcional. Os 10 pontos de coleta são locais reais de São Luís
(conferidos em 2026-10-17); a descrição diz o que cada um recebe e o horário. Os pontos solares e as ações ainda são
ilustrativos.

```http
GET /api/mapa/pontos?tipo=coleta
```

```json
[
  {
    "id": "b8c9d0e1-f2a3-4b4c-9d5e-6f708192a3b4",
    "nome": "Ecoponto Itapiracó",
    "tipo": "coleta",
    "latitude": -2.53,
    "longitude": -44.3,
    "descricao": "Recebe eletrônicos, pilhas e baterias. Ecoponto da Prefeitura de São Luís. Av. Joaquim Mochel, Itapiracó. Funciona de segunda a sábado, das 7h às 19h."
  }
]
```

Erros: `400 ENTRADA_INVALIDA`.

---

## Erros

| Status | Código | Quando |
|---|---|---|
| 400 | `ENTRADA_INVALIDA` | Campo inválido ou desconhecido (a mensagem diz qual) |
| 400 | `JSON_INVALIDO` | O corpo não é um JSON válido |
| 400 | `REFERENCIA_INVALIDA` | Algum ID enviado não existe |
| 400 | `LICAO_E_PEDALE` | Lição de Pedale enviada para `/api/licoes/{id}/concluir` |
| 400 | `LICAO_NAO_E_PEDALE` | Lição de texto enviada para `/api/pedale/concluir` |
| 401 | `NAO_AUTENTICADO` | Sem token ou token inválido |
| 404 | `ROTA_NAO_ENCONTRADA` | A rota não existe |
| 404 | `PERFIL_NAO_ENCONTRADO` | Perfil não encontrado |
| 404 | `TURMA_NAO_ENCONTRADA` | Código de turma não existe |
| 404 | `BAIRRO_OU_ESCOLA_NAO_ENCONTRADO` | Bairro ou escola não existe |
| 404 | `APARELHO_NAO_ENCONTRADO` | Aparelho não existe |
| 404 | `NENHUMA_SIMULACAO` | O usuário ainda não salvou simulação |
| 404 | `TRILHA_NAO_ENCONTRADA` | Trilha não existe |
| 404 | `LICAO_NAO_ENCONTRADA` | Lição não existe |
| 404 | `PERGUNTA_NAO_ENCONTRADA` | Pergunta não existe |
| 404 | `MISSAO_NAO_ENCONTRADA` | Missão não existe |
| 409 | `LICAO_BLOQUEADA` | Falta concluir uma lição anterior da mesma trilha (a mensagem diz qual) |
| 409 | `LICAO_NAO_CONCLUIDA` | Resposta do quiz antes de concluir a lição |
| 409 | `ESCOLA_INATIVA` | A escola escolhida no perfil foi desativada |
| 405 | `METODO_NAO_PERMITIDO` | A rota não aceita esse método (veja o cabeçalho `Allow`) |
| 429 | `LIMITE_DE_TROCAS` | 3 trocas de bairro ou escola nos últimos 30 dias |
| 429 | `LIMITE_TUTOR` | 20 mensagens ao tutor na última hora |
| 429 | `LIMITE_DE_REQUISICOES` | Muitas simulações seguidas (sem login, por endereço; na prévia com login, por perfil) ou muitas ações seguidas do mesmo perfil: 120 a cada 10 minutos, somando concluir lição, Pedale, quiz, missões, perfil e simulação com login |
| 500 | `ERRO_INTERNO` | Erro inesperado |
| 503 | `TUTOR_INDISPONIVEL` | O serviço de IA não respondeu |
