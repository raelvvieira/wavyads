# Corrigir erro ao salvar Editorial Criativo

O código já usa a tabela `public.client_editorials` (em `useClientEditorial.ts` e `EditorialDrawer.tsx`), mas ela não existe no banco — por isso o erro "Could not find the table 'public.client_editorials' in the schema cache".

## Solução

Criar a tabela via migration com a estrutura usada pelo código:

**Tabela `public.client_editorials`**
- `client_id` (uuid, FK para `clients.id`, único — 1 editorial por cliente)
- `design_system_doc` (text) — documento editável
- `visual_analysis` (jsonb) — análise visual estruturada
- campos padrão: `id`, `created_at`, `updated_at`

**Acesso**
- RLS habilitado
- Admins: leitura e escrita total
- Usuários vinculados ao cliente (via `client_users`): apenas leitura
- `service_role`: acesso total (para edge functions)

**Extras**
- Trigger para atualizar `updated_at` automaticamente
- Índice único em `client_id` (suporta o `onConflict: 'client_id'` do upsert)
- GRANTs para `authenticated` e `service_role`

Nenhuma alteração de código frontend é necessária — assim que a tabela existir, o salvar e o carregar passam a funcionar.
