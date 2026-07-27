## Diagnóstico (confirmado nos logs)

Logs da edge function `google-ads-oauth` mostram, exatamente nos horários das tentativas:

```
ERROR google-ads-oauth unhandled error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
    at ... index.ts:162:29
```

Ou seja: o OAuth com o Google funciona (o code é trocado por token, os tokens são salvos), mas na etapa seguinte — listar as contas do Google Ads — uma das chamadas à API do Google devolve uma **página HTML** (404/erro) em vez de JSON. O `await res.json()` estoura, cai no catch geral e a função devolve 500. A janela popup então mostra "Erro ao conectar / Unexpected token '<'".

Causa provável na área da linha 162: o loop que busca o nome de cada conta chama `GET https://googleads.googleapis.com/v24/customers/{id}`. Esse endpoint REST simples não existe na Google Ads API (nomes de conta só saem via `googleAds:searchStream`), então o Google responde com HTML.

## O que fazer

Editar apenas `supabase/functions/google-ads-oauth/index.ts`:

1. **Helper seguro de resposta** — criar `readJson(res, label)` que checa `res.ok` e o `content-type`; se não for JSON, loga status + os primeiros ~300 caracteres do corpo e lança um erro legível (`"Google respondeu HTML (404) em {label}"`) em vez de quebrar no parse.
2. **Usar esse helper** em todas as chamadas ao Google: troca de token, `customers:listAccessibleCustomers` e a busca de detalhes.
3. **Corrigir a busca do nome da conta** — substituir o `GET /customers/{id}` pelo endpoint suportado:
   `POST /v24/customers/{id}/googleAds:searchStream` com a query
   `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`,
   headers `developer-token` e `login-customer-id: {id}`. Se falhar, manter o fallback `Conta {id}` (sem derrubar a conexão inteira).
4. **Nunca deixar a listagem derrubar o fluxo** — se `listAccessibleCustomers` falhar, retornar `success: true` com `accounts: []` e uma mensagem de aviso, já que os tokens foram salvos. Assim o admin pode informar/selecionar a conta em vez de recomeçar o OAuth.
5. **Redeploy** da função e novo teste de conexão.

## Detalhes técnicos

- Validar também a versão da API: se `listAccessibleCustomers` em `v24` retornar HTML, o log passará a mostrar status + corpo, o que confirma na hora se é versão sunset ou developer token inválido — hoje isso está invisível.
- Frontend (`GoogleAdsCallbackPage.tsx`, `useGoogleAdsOAuth.ts`) não precisa mudar: ele já sabe exibir a mensagem `error` vinda em JSON da função.
