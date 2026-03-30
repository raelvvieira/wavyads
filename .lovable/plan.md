

## Plan: Múltiplos Usuários por Dashboard de Cliente

### Problema Atual
Cada cliente tem um único `user_id` na tabela `clients`. A política RLS "Clients view own record" usa `auth.uid() = user_id`, então apenas 1 usuário pode ver cada dashboard.

### Solução

Criar uma tabela de junção `client_users` para permitir N usuários por cliente. O `user_id` original na tabela `clients` continua como "dono principal", mas a verificação de acesso passa a consultar `client_users`.

### 1. Migração SQL

```sql
-- Tabela de junção
CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access on client_users"
  ON public.client_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios registros
CREATE POLICY "Users view own client_users"
  ON public.client_users FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Migrar dados existentes: copiar user_id de clients para client_users
INSERT INTO public.client_users (client_id, user_id)
SELECT id, user_id FROM public.clients WHERE user_id IS NOT NULL;

-- Atualizar RLS de clients para incluir client_users
CREATE POLICY "Client users view record"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = id AND cu.user_id = auth.uid()
    )
  );

-- Remover política antiga que só checava user_id direto
DROP POLICY "Clients view own record" ON public.clients;
```

### 2. Atualizar `invite-client` Edge Function

Após criar o client e o user, também inserir na `client_users`:
```typescript
await adminClient.from("client_users").insert({
  client_id: clientData.id,
  user_id: userId,
});
```

### 3. UI no AdminDashboard — Adicionar Usuário ao Dashboard

No card de cada cliente, adicionar um botão "Adicionar Acesso" que abre um dialog simples com:
- Campo email
- Campo nome
- Botão "Convidar"

Ao submeter, chama uma nova edge function `add-client-user` que:
1. Verifica se o email já existe no auth (se não, cria com convite igual ao invite-client)
2. Atribui role `client` se não tiver
3. Insere na `client_users` vinculando ao client_id
4. Envia email de convite via Resend

No card, exibir lista dos usuários vinculados (pequenos avatares/emails).

### 4. Nova Edge Function `add-client-user`

Recebe `{ clientId, name, email }`. Lógica:
- Verifica caller é admin
- Busca user por email no auth. Se não existe, cria (mesmo fluxo do invite-client)
- Se existe, apenas insere em `client_users` e `user_roles` (se não tiver role client)
- Envia email de boas-vindas via Resend

### 5. Atualizar `useClients` hook

O hook `useClients` para clientes (non-admin) já funciona porque a RLS agora usa `client_users`. Nenhuma mudança necessária no hook — a query já retorna registros que o usuário pode ver via RLS.

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `client_users`, migrar dados, atualizar RLS |
| `supabase/functions/add-client-user/index.ts` | Criar — nova edge function |
| `supabase/functions/invite-client/index.ts` | Editar — inserir em `client_users` |
| `src/pages/AdminDashboard.tsx` | Editar — botão + dialog "Adicionar Acesso" por cliente |
| `supabase/config.toml` | Registrar `add-client-user` |

