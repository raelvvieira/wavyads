## Objetivo

Tornar a página **Comercial** individual por cliente. Hoje, ao clicar em "Comercial", admin não vê uma forma clara de escolher cliente (o filtro fica perdido entre vários selects). O plano anterior foi aprovado mas não chegou a ser implementado — esta é a execução dele.

## Comportamento final

- **Admin** clica em "Comercial" → vê uma **grade de cards de clientes** (com busca), clica em um → entra em `/comercial/:clientId` com os dados só daquele cliente.
- **Cliente final** clica em "Comercial" → é redirecionado automaticamente para `/comercial/<seuId>`.
- A página individual tem botão **"← Voltar"** (apenas admin) para voltar à lista.

## Mudanças

### 1. `src/App.tsx`
Adicionar rota nova:
```
/comercial            → <ComercialIndexPage />   (novo)
/comercial/:clientId  → <ComercialPage />        (refatorado)
```

### 2. Novo `src/pages/ComercialIndexPage.tsx`
- `useRole()` + `useClients()` + `useClientUsers()`.
- Se não-admin: `useEffect` busca o `client_id` do usuário em `client_users` e faz `navigate('/comercial/<id>', { replace: true })`.
- Se admin: header "Comercial — Selecione um cliente", input de busca, grid de `GlassCard`s clicáveis (nome do cliente + status de sync). Mesmo padrão visual do dashboard.
- Estado de loading enquanto role carrega.

### 3. `src/pages/ComercialPage.tsx` (refatorar)
- Ler `clientId` via `useParams<{ clientId: string }>()`.
- **Remover** o `<Select>` "Cliente" e o estado `clientFilter`.
- Query de `offline_conversions` passa a usar `eq('client_id', clientId)` direto.
- `syncedClientIds` vira `[clientId]` (se o cliente está sincronizado).
- Header passa a mostrar **nome do cliente** + botão "← Voltar" (visível só para admin, navega para `/comercial`).
- Se `clientId` inválido / sem acesso: empty state com botão voltar (RLS já garante zero leak).
- Remover coluna redundante "Cliente" da tabela (se existir).

### 4. `src/components/AppSidebar.tsx`
Manter `to: '/comercial'` (nada a mudar — o index decide para onde levar).

## Validação

- Admin → `/comercial` mostra grid → clica → `/comercial/<id>` com dados filtrados → "Voltar" retorna ao grid.
- Cliente final → `/comercial` → redirecionado para `/comercial/<seuId>` → vê só seus dados (sem dropdown de cliente).
- Admin acessa `/comercial/<id-inexistente>` → empty state.

## Riscos / fora de escopo

- Sem mudanças em DB, RLS ou edge functions — apenas roteamento e UI.
- Caso raro de usuário com múltiplos `client_users`: usa o primeiro; seletor multi-cliente fica para depois.
