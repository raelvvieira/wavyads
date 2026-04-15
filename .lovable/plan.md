

## Plan: Corrigir link de recuperação redirecionando para Lovable

### Problema

Quando você adiciona um usuário ao dashboard, o `generateLink` nas Edge Functions usa `req.headers.get("origin")` para montar o `redirectTo`. Como a chamada vem do editor/preview do Lovable, o origin é o domínio do Lovable (ex: `id-preview--xxx.lovable.app`). O usuário clica no link do email, o Supabase processa o token e redireciona para o Lovable em vez de `dashboard.wavydigital.com.br` — por isso aparece a tela de onboarding do Lovable e "Acesso negado".

### Correção

Hardcodar a URL de produção `https://dashboard.wavydigital.com.br/reset-password` em ambas as Edge Functions, removendo a dependência do header `origin`.

**Arquivo:** `supabase/functions/add-client-user/index.ts` (linha 133)

Trocar:
```typescript
const redirectTo = `${req.headers.get("origin") || "https://dashboard.wavydigital.com.br"}/reset-password`;
```
Por:
```typescript
const redirectTo = "https://dashboard.wavydigital.com.br/reset-password";
```

**Arquivo:** `supabase/functions/invite-client/index.ts` (linha 135)

Trocar:
```typescript
const redirectTo = `${req.headers.get("origin") || "https://wavyads.lovable.app"}/reset-password`;
```
Por:
```typescript
const redirectTo = "https://dashboard.wavydigital.com.br/reset-password";
```

Depois, fazer deploy de ambas as funções.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/add-client-user/index.ts` | Hardcodar redirectTo |
| `supabase/functions/invite-client/index.ts` | Hardcodar redirectTo |

