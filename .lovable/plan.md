## Problema

Hoje as preferências de visualização do dashboard (KPI cards escolhidos, preset de data, plataforma Meta/Google, etapas do funil) ficam salvas em `localStorage`, escopadas só por `clientId`. Isso causa dois problemas:

1. **Não acompanha o login** — se o cliente abrir em outro navegador/dispositivo ou limpar o cache, perde a configuração.
2. **Admin e cliente compartilham o mesmo storage** quando estão no mesmo navegador, e a sua visualização como admin sobrescreve a do cliente (e vice-versa).

## Solução

Salvar as preferências no banco, **por `(user_id, client_id)`**, para que cada login tenha a própria configuração persistida e sincronizada entre dispositivos. A visualização do admin e a do cliente ficam totalmente independentes.

## Escopo da configuração persistida

Por par (usuário, cliente):
- Cards KPI escolhidos (ordem e métricas) — `KpiCard`
- Preset de data selecionado e intervalo customizado — `ClientDashboard`
- Plataforma ativa (Meta / Google) — `ClientDashboard`
- Etapas 4/5/6 do funil de conversão — `ConversionFunnel`

## Mudanças

### Banco (migration)

Nova tabela `public.user_dashboard_prefs`:
- `user_id uuid` (FK `auth.users`, on delete cascade)
- `client_id uuid` (FK `public.clients`, on delete cascade)
- `prefs jsonb not null default '{}'`
- `created_at`, `updated_at` com trigger
- `UNIQUE (user_id, client_id)`
- RLS: usuário autenticado só lê/escreve linhas onde `user_id = auth.uid()`; `service_role` ALL
- GRANTs para `authenticated` e `service_role`

### Frontend

- Novo hook `useDashboardPrefs(clientId)`:
  - `useQuery` carrega a linha do usuário logado para aquele cliente
  - `useMutation` faz `upsert` (onConflict `user_id,client_id`) com debounce (~500 ms)
  - Retorna `{ prefs, isLoading, update(patch) }`
- `ClientDashboard.tsx`: substituir leitura/escrita em `localStorage` (`wavy-dash-prefs-${clientId}`) pelo hook. Aguardar `isLoading` para inicializar estados de preset/plataforma/KPI cards e não renderizar com defaults piscando.
- `KpiCard.tsx`: remover `getDefaultCards`/`saveCards` baseados em `localStorage`; receber `cards` e `onChangeCards` por prop a partir do `ClientDashboard`, que vem das prefs.
- `ConversionFunnel.tsx`: receber `stages` e `onChangeStages` por prop em vez de ler `funnel_stage4/5/6` do `localStorage`. `ClientDashboard` passa o trecho de prefs do funil e persiste via mesmo hook.
- Migração suave: na primeira carga, se não existir registro no banco mas existir no `localStorage` para aquela combinação, copia para o banco e segue usando o banco.

### Comportamento resultante

- Cliente entra de qualquer dispositivo → vê exatamente a configuração que deixou.
- Admin visualizando o mesmo cliente tem a própria configuração, separada e invisível para o cliente.
- Trocar configuração salva automaticamente (debounce) sem precisar de botão.
