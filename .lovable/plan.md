

## Plan: Corrigir acesso de clientes nas Edge Functions

### Problema

As edge functions `meta-fetch-insights` e `google-ads-fetch-insights` verificam acesso de usuários não-admin usando `clients.user_id = userId`. Porém, os usuários clientes estão vinculados via tabela `client_users`, não pelo campo `user_id` da tabela `clients`. Resultado: a query retorna null e o cliente vê "Cliente não encontrado" — o dashboard fica vazio.

### Correção

Atualizar a função `getClient` em ambas as edge functions para, quando o usuário não for admin, verificar acesso via `client_users` em vez de `clients.user_id`.

**Arquivo:** `supabase/functions/meta-fetch-insights/index.ts` (linhas 110-113)

Trocar:
```typescript
let clientQuery = supabase.from("clients").select("*").eq("id", clientId);
if (!isAdmin) {
  clientQuery = clientQuery.eq("user_id", userId);
}
```

Por:
```typescript
// First get the client
const { data: client, error: clientError } = await supabase
  .from("clients").select("*").eq("id", clientId).maybeSingle();
if (clientError || !client) return { error: "Cliente não encontrado", status: 404 };

// If not admin, verify access via client_users
if (!isAdmin) {
  const { data: access } = await supabase
    .from("client_users").select("id").eq("client_id", clientId).eq("user_id", userId).maybeSingle();
  if (!access) return { error: "Sem acesso a este cliente", status: 403 };
}
```

**Arquivo:** `supabase/functions/google-ads-fetch-insights/index.ts` (linhas 133-134)

Mesma correção — substituir `clientQuery.eq("user_id", userId)` pela verificação via `client_users`.

### Nota importante

A edge function usa `createClient` com a service role key, então não há RLS — a verificação de acesso precisa ser feita manualmente no código, como proposto acima.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/meta-fetch-insights/index.ts` | Editar `getClient` — verificar acesso via `client_users` |
| `supabase/functions/google-ads-fetch-insights/index.ts` | Editar — mesma correção |

