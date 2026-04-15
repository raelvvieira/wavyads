

## Plan: Definir padrão de visualização e persistir preferências

### Configuração padrão (baseada nos screenshots)

- **Filtro de data**: `this_month` (Este mês)
- **KPI cards**: `spend`, `impressions`, `clicks`, `results`, `cost_per_result`, `purchases`
- **Plataforma**: `meta` (já é o padrão atual)

### Implementação

**1. `src/components/KpiCard.tsx`**
- Alterar os cards padrão de `['spend', 'impressions', 'clicks', 'cpl', 'leads', 'purchases']` para `['spend', 'impressions', 'clicks', 'results', 'cost_per_result', 'purchases']`
- Tornar `getDefaultCards` e `saveCards` dependentes de `clientId` (chave: `wavy-kpi-cards-{clientId}`)

**2. `src/pages/ClientDashboard.tsx`**
- Alterar o preset padrão de `last_30d` para `this_month`
- Carregar preferências salvas do localStorage na inicialização (chave: `wavy-dash-prefs-{clientId}`)
- Salvar `selectedPreset` e `platform` no localStorage via `useEffect` sempre que mudarem
- Passar `clientId` para `getDefaultCards` e `saveCards`

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/ClientDashboard.tsx` | Default `this_month`, persistir preset/platform por cliente |
| `src/components/KpiCard.tsx` | Novos cards padrão, storage por cliente |

