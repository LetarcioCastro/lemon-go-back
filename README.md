# lemon_go_back — API mock (Contato Inteligente v2.0.0)

API em Node + Express com dados mockados em memória, seguindo a documentação
`lemon_go_app/workspace/API Contato Inteligente — Documentação (v2.0.0).html`.

## Rodar

```bash
npm install
npm run dev     # recarrega ao salvar
# ou
npm start
```

Sobe em `http://localhost:3001` (mude com `PORT=xxxx`).

No app, aponte o `.env` para o mock:

- Emulador Android: `baseURL="http://10.0.2.2:3001"`
- Celular físico / iOS: `baseURL="http://<IP-do-PC-na-rede>:3001"`

## Login

`POST /auth/firebase` com `{ "firebase_token": "..." }`. Aceita:

| firebase_token | Resultado |
|---|---|
| `test-victoria-611` | vendedor 611, loja 901 |
| `test-vendedor-603` | vendedor 603, loja 901 |
| `test-pendente-700` | 403 `WAITING_APPROVAL` |
| ID token do Firebase (JWT) | casa pelo `user_id`; se o uid não existir, usa o vendedor de `FALLBACK_SELLER_CODE` (padrão `test-victoria-611`) |

Resposta (formato v2, sem envelope): `{ "token", "type": "Bearer", "expires_in": 3600 }`.

## Endpoints (todos em `/api/*` exigem `Authorization: Bearer <jwt>`)

| Método | Rota | Parâmetros |
|---|---|---|
| GET | `/api/home/results` | `campaign_id`*, `page`, `per_page` |
| GET | `/api/campaign` | `page`, `per_page` |
| GET | `/api/campaign/contacts` | `campaign_id`*, `page`, `per_page` (máx 10) |
| GET | `/api/campaign/contacts/details` | `id_contato`* (ou `campaign_id` + `client_id`), `page_contatos`, `page_compras` |
| POST | `/api/contact/mark` | `id_campanha`*, `id_contato`*, `observacao`, `convertido` |
| POST | `/api/contact/suspend` | `id_campanha`*, `id_contato`*, `id_motivo`* (1–4) |
| GET | `/api/profiles` | — |
| POST | `/api/support` | multipart: `campaign_id`*, `reason`* (`bug`/`duvida`/`sugestao`), `title`*, `message`*, `attachments` (até 5 × 5 MB) |
| GET | `/api/support` | `campaign_id`, `page`, `per_page` |
| POST | `/api/user/validate` | `phone`* (com DDI), `page`, `per_page` |

O escopo (vendedor/loja/empresa) vem sempre do token; `id_client`, `id_store`
e `id_company` na query são ignorados, como na API real.

Erros: 400 parâmetro inválido · 401 sem token · 403 login (`{ error, message }`)
· 404 sem resultados · 422 telefone inválido · 500 erro interno.

## Dados de teste

- Campanha **6** "teste 901" — 13 contatos do vendedor 611 (inclui `17289` ADRIANA e `17254`), 15 do 603
- Campanha **7** ativa, **4** finalizada, **3** concluída
- Os dados são gerados de forma determinística; `mark`, `suspend` e tickets ficam
  só em memória — reiniciar o servidor volta ao estado inicial.

## Estrutura

```
src/
  server.js        app Express, rotas e tratamento de erros
  config.js        porta, segredo do JWT, vendedor fallback
  jwt.js           JWT HS256 sem dependências
  http.js          envelope { status, response, message } e paginação
  middleware.js    auth Bearer, CORS, log
  data.js          dados mockados
  routes/auth.js   POST /auth/firebase
  routes/api.js    demais endpoints
```
