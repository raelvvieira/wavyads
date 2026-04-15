

## Plan: Mostrar emails com acesso em cada card de cliente

### O que muda

No card de cada cliente no painel admin, será exibida uma lista dos emails que têm acesso ao dashboard daquele cliente, logo abaixo das informações de sync e acima dos botões.

### Implementação

**Arquivo:** `src/pages/AdminDashboard.tsx`

1. **Criar um hook/query para buscar todos os acessos de uma vez** — Em vez de chamar `useClientUsers` para cada cliente individualmente, criar uma única query que busca todos os `client_users` com o email do perfil vinculado, agrupando por `client_id`.

2. **Adicionar a query no componente** — Usar `useQuery` para buscar `client_users` join com `profiles` (via select com inner join ou duas queries), retornando `{ client_id, email }[]`.

3. **Renderizar no card** — Entre as informações de sync e os botões, adicionar uma seção com ícone de `Users` mostrando os emails com acesso, em texto pequeno (`text-xs text-muted-foreground`), um por linha.

### Detalhes técnicos

- Query: `supabase.from('client_users').select('client_id, profiles!inner(email)')` — o Supabase suporta join via foreign key implícito se existir, senão faremos duas queries separadas (client_users + profiles)
- Como `client_users` não tem FK declarada para `profiles`, faremos duas queries: uma para `client_users` e outra para `profiles`, e faremos o join no frontend
- Visual: lista compacta com ícone `Users` e emails em cinza claro

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/AdminDashboard.tsx` | Adicionar query de acessos e renderizar emails nos cards |

