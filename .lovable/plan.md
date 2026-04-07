

## Plan: Corrigir acesso do cliente ao dashboard

### Problema

A política RLS "Client users view record" na tabela `clients` tem um bug: compara `cu.client_id = cu.id` (duas colunas da mesma tabela `client_users`) em vez de `cu.client_id = clients.id`. Isso faz com que nenhum cliente consiga ver seus dados, resultando em "Cliente não encontrado".

### Correção

Uma única migração SQL:

```sql
DROP POLICY "Client users view record" ON public.clients;

CREATE POLICY "Client users view record"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = clients.id AND cu.user_id = auth.uid()
    )
  );
```

Isso corrige a referência para comparar `cu.client_id` com `clients.id` (a tabela sendo consultada), permitindo que usuários vinculados na `client_users` vejam o dashboard corretamente.

### Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Recriar policy RLS com referencia correta |

Nenhuma alteracao de codigo frontend necessaria — o `ClientDashboard` ja busca `allClients[0]` para usuarios nao-admin, so precisa que a RLS retorne os registros corretamente.

