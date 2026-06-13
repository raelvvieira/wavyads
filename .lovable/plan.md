## Diagnóstico

Testei o cliente **Nubeauty** chamando a edge function `meta-fetch-insights` direto. O Meta retorna:

> `Error validating access token: The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons.`

Ou seja, o token de acesso do Facebook do cliente foi **invalidado pelo próprio Facebook** (mudança de senha, alerta de segurança, ou expiração). A edge function devolve 400, mas:

1. O React Query refaz a chamada 3× com backoff antes de marcar como erro → dá impressão de "loading infinito".
2. Quando finalmente falha, o `ClientDashboard` não tem UI de erro — só esconde skeletons e mostra tela vazia.
3. Não há nenhum aviso pedindo para **reconectar a conta Meta**.

Isso acontece com qualquer cliente cujo token tenha sido invalidado/expirado.

## Plano

### 1. Edge function `meta-fetch-insights`
- Detectar erros de token do Graph API (`code` 190, subcodes 458/459/460/463/467, ou mensagens "access token") e responder com `status: 401` e `{ error, code: "META_TOKEN_INVALID" }` em vez de 400 genérico.
- Aplicar em todos os pontos onde checamos `data.error` (campaigns, ads, insights, insights_previous).

### 2. Hook `useMetaInsights.ts` / `useMetaAds.ts` / `useMetaCampaigns`
- Centralizar o `fetchInsights` para extrair a mensagem real do erro (hoje `error` da invocação só traz "non-2xx").
- Lançar um `Error` com `name = "MetaTokenInvalid"` quando vier `code: "META_TOKEN_INVALID"`.
- Passar `retry: (count, err) => err.name !== "MetaTokenInvalid" && count < 1` nos `useQuery` para não ficar repetindo quando o erro é definitivo (corta o "loading infinito").

### 3. `ClientDashboard.tsx`
- Detectar se qualquer um dos `useMeta*` retornou `MetaTokenInvalid` (via `isError` + `error.name`).
- Renderizar um banner no topo: "Conexão com Meta expirou. Reconecte a conta para voltar a ver os dados." com botão **Reconectar Meta** (admin → abre o fluxo OAuth existente; cliente → mensagem para avisar o gestor).
- Para outros erros, mostrar mensagem genérica de falha em vez de skeleton perpétuo.

### 4. (Opcional) Marcar cliente
- Quando edge function detectar token inválido, atualizar `clients.is_synced = false` (ou flag `meta_token_invalid = true` se preferir não desconectar de fato) para que o status apareça também na listagem de clientes do admin.

## Detalhes técnicos

- Códigos do Graph API a tratar como token-inválido:
  - `error.code === 190`
  - `error.error_subcode ∈ {458, 459, 460, 463, 464, 467, 492}`
- Em `supabase.functions.invoke`, quando o status é não-2xx o `data` ainda vem com o JSON do body — usar isso para extrair `code`/`error`.
- Reutilizar o componente OAuth já existente (`useMetaOAuth`) para o botão Reconectar.

## Fora do escopo
- Renovação automática de token (Facebook não permite refresh silencioso após invalidação por segurança — exige reauth do usuário).
