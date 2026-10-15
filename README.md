# Cidade Energia — Backend

API do app educacional **Cidade Energia** (Hackathon Equatorial, Desafio 9).
"Sua conta de luz é a sua primeira aula de energia."

Feita com Next.js (App Router) e Supabase. Este repositório é **só o backend**; o front-end consome as rotas abaixo.

## Documentação interativa (Swagger)

Com a API rodando, abra:

- **http://localhost:3000/api/docs**: Swagger UI com todas as rotas, campos, exemplos e o botão *Try it out*.
- **http://localhost:3000/api/openapi**: a especificação OpenAPI 3.1 em JSON (serve para gerar tipos ou um cliente).

Para testar rotas com login no Swagger, clique em **Authorize** e cole um `access_token`. A seção [Como conseguir um token para testes](#como-conseguir-um-token-para-testes) explica como obter um.

## Rodando localmente

Requisitos: Node 24+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha o `.env.local` com as chaves do projeto Supabase (peça a alguém do backend):

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (*publishable*). O front também usa esta |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta. **Só no servidor, nunca no front** |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Tutor Energinho (próximas etapas) |
| `CORS_ORIGEM` | Endereço do front liberado no CORS (padrão `http://localhost:5173`) |

Se o front rodar em outra porta ou domínio, ajuste `CORS_ORIGEM` e reinicie a API.

## Como funciona o login

O app não pede e-mail nem senha. Todo estudante entra com **login anônimo** do Supabase:

1. O front cria o cliente Supabase com a URL e a chave pública.
2. Nos botões "Criar meu perfil" **e** "Continuar sem perfil", chama `signInAnonymously()`.
3. Em toda chamada à API, envia `Authorization: Bearer <access_token>`.
4. "Criar meu perfil" = login + `PUT /api/perfil` com o primeiro nome e o bairro.

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data } = await supabase.auth.getSession();
if (!data.session) await supabase.auth.signInAnonymously();

async function api(caminho: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const corpo = await resposta.json();
  if (!resposta.ok) throw corpo.erro;
  return corpo;
}
```

O supabase-js guarda a sessão e renova o token sozinho. Use sempre o token atual com `getSession()`.

### Como conseguir um token para testes

Para usar o Swagger ou o Postman sem o front:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Copie o `access_token` da resposta e cole em **Authorize** no Swagger. Ele vale por cerca de 1 hora.

## Rotas

| Método | Rota | Login | O que faz |
|---|---|---|---|
| GET | `/api/bairros` | não | Lista os bairros |
| GET | `/api/escolas?bairro=<id>` | não | Lista as escolas (filtro por bairro opcional) |
| GET | `/api/aparelhos` | não | Lista os aparelhos do simulador |
| GET | `/api/perfil` | sim | Perfil do usuário logado (`tem_perfil` diz se já tem nome) |
| PUT | `/api/perfil` | sim | Cria ou atualiza o perfil |
| POST | `/api/simulacoes` | opcional | Simula a conta. Com login, salva a simulação |
| GET | `/api/simulacoes/ultima` | sim | Última simulação salva do usuário |

Os detalhes de cada campo estão no Swagger. Os exemplos abaixo mostram os casos mais comuns.

### Criar o perfil

```http
PUT /api/perfil
Authorization: Bearer <token>

{ "primeiro_nome": "Ana", "bairro_id": "<id do bairro>", "escola_id": "<id da escola>" }
```

- Envie **só o primeiro nome** (sem sobrenome, sem espaços). O app não coleta e-mail, telefone nem documento.
- A escola é opcional. Envie `escola_id` (escolhida na lista) **ou** `codigo_turma` (passado pelo professor), nunca os dois.

### Simular pela conta de luz

```http
POST /api/simulacoes

{ "modo": "conta", "consumoKwh": 380, "valorConta": 312 }
```

`valorConta` é opcional. Sem ele, a API usa a tarifa padrão de São Luís.

### Simular pelos aparelhos

```http
POST /api/simulacoes

{
  "modo": "aparelhos",
  "itens": [
    { "aparelhoId": "<id do chuveiro>", "quantidade": 1, "horasDia": 0.5 },
    { "aparelhoId": "<id da geladeira>", "quantidade": 1, "horasDia": 24 }
  ]
}
```

Use os `id`s de `GET /api/aparelhos` e o campo `horas_padrao` para pré-preencher o formulário. Cada aparelho aparece uma vez só; para dois ventiladores, use `quantidade: 2`.

### Resposta da simulação

```json
{
  "consumoKwh": 380,
  "gastoMensal": 312,
  "economiaMensal": 31.2,
  "placas": 6,
  "retornoAnos": 2.5,
  "co2EvitadoKgAno": 197.6,
  "pesos": [],
  "simulacaoId": null
}
```

| Campo | Significado |
|---|---|
| `consumoKwh` | Consumo por mês (kWh) |
| `gastoMensal` | Quanto a família gasta por mês (R$) |
| `economiaMensal` | Quanto dá para economizar por mês mudando hábitos (R$) |
| `placas` | Quantas placas solares cobririam o consumo |
| `retornoAnos` | Em quantos anos as placas se pagam |
| `co2EvitadoKgAno` | CO₂ que as placas evitariam por ano (kg) |
| `pesos` | Quanto cada aparelho pesa na conta, em %. Vem preenchido só no modo `aparelhos` (do maior para o menor, somando 100) |
| `simulacaoId` | ID da simulação salva, ou `null` se não havia login |

Os números já vêm arredondados para exibir: R$ com 2 casas, o resto com 1. Todos são **estimativas didáticas**; mostre isso na tela.

## Erros

Todo erro segue o mesmo formato, com o status HTTP correto:

```json
{ "erro": { "codigo": "ENTRADA_INVALIDA", "mensagem": "consumoKwh: O consumo deve ser maior que zero." } }
```

A `mensagem` está em português e pode ser mostrada ao usuário. Use o `codigo` para decidir o que fazer:

| Status | Código | Quando |
|---|---|---|
| 400 | `ENTRADA_INVALIDA` | Algum campo inválido (a mensagem diz qual) |
| 400 | `JSON_INVALIDO` | O corpo não é um JSON válido |
| 400 | `REFERENCIA_INVALIDA` | Algum ID enviado não existe |
| 401 | `NAO_AUTENTICADO` | Sem token ou token inválido: faça o login anônimo de novo |
| 404 | `PERFIL_NAO_ENCONTRADO` | Perfil não encontrado |
| 404 | `TURMA_NAO_ENCONTRADA` | Código de turma não existe |
| 404 | `BAIRRO_OU_ESCOLA_NAO_ENCONTRADO` | Bairro ou escola não existe |
| 404 | `APARELHO_NAO_ENCONTRADO` | Algum aparelho da simulação não existe |
| 404 | `NENHUMA_SIMULACAO` | O usuário ainda não salvou nenhuma simulação |
| 500 | `ERRO_INTERNO` | Erro inesperado: tente de novo |

Campos que a API não conhece são recusados com `400`. Por exemplo, o front **nunca** envia pontos: eles são calculados só no servidor.

## Dados de exemplo

O banco tem dados **ilustrativos** para testes: 12 bairros de São Luís, 6 aparelhos e 3 escolas fictícias com os códigos de turma `SOL2026`, `VENTO26` e `LUZ2026`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API em `http://localhost:3000` |
| `npm test` | Roda os testes |
| `npx tsc --noEmit` | Checa os tipos |
| `npm run verificar:banco` | Confere o banco e as permissões no Supabase (com `API_URL` definida, testa também as rotas) |
