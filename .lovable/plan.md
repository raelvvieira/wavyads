## Objetivos

1. Aumentar a quantidade de KPI cards no topo do Dashboard de 6 para **7** (cada um continua personalizável).
2. Adicionar duas novas métricas selecionáveis nos cards e exibidas na tabela de campanhas:
   - **Valor de Conversão de Compra** (`purchase_value`) — soma do `action_values` da Meta para `purchase`.
   - **ROAS de Compras** (`purchase_roas`) — `purchase_value / spend`.
3. Otimizar a **tabela "Desempenho por Campanha" no mobile**, deixando-a mais compacta e legível, sem perder informação relevante.

---

## 1) Backend — Edge Function `meta-fetch-insights`

Atualmente o backend não retorna o valor monetário das compras nem o ROAS real. Precisamos buscar `action_values` da API da Meta.

- Em todas as queries (`campaigns`, `insights`, `insights_previous`, `ads`) acrescentar `action_values` ao parâmetro `fields` do endpoint `/insights`.
- Criar helper `extractActionValue(action_values, PURCHASE_TYPES)` análogo ao `extractAction`.
- Calcular:
  - `purchase_value = extractActionValue(ins.action_values, PURCHASE_TYPES)`
  - `purchase_roas = spend > 0 ? purchase_value / spend : 0`
- Substituir o cálculo atual de `roas` (que hoje usa `purchases * costPerPurchase / spend`, matematicamente igual a `purchase_value/spend`, mas vamos passar a usar o valor real retornado pela Meta).
- Adicionar `purchase_value` e `purchase_roas` aos objetos retornados em:
  - `parseCampaign` (campanhas).
  - `insights` e `insights_previous` (totais do dashboard).
  - Daily breakdown (para uso futuro no chart, opcional).

## 2) Frontend — Tipos e hooks

- `src/hooks/useMetaInsights.ts`: adicionar `purchase_value: number` e `purchase_roas: number` em `MetaCampaign` e `MetaInsights`.

## 3) Frontend — KPI Cards

Arquivo `src/components/KpiCard.tsx`:

- Adicionar duas novas chaves em `MetricKey`:
  - `purchase_value` — label "Valor de Compras", ícone `DollarSign`, formato `formatCurrency`, cor `bg-green-600`.
  - `purchase_roas` — label "ROAS Compras", ícone `TrendingUp`, formato `(v) => v.toFixed(2) + 'x'`, cor `bg-lime-600`.
- Atualizar `getDefaultCards`: passar a retornar **7** chaves padrão, ex.: `['spend', 'impressions', 'clicks', 'results', 'cost_per_result', 'purchases', 'purchase_value']`.

Arquivo `src/pages/ClientDashboard.tsx`:

- Em `metricValues` e `previousValues`, mapear `purchase_value` e `purchase_roas` a partir do `MetaInsights`.
- Atualizar grid:
  - De `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6` para
  - `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7` (7 colunas em desktop largo, 2 colunas no mobile para reduzir overflow visto no print).
- Skeleton: `Array.from({ length: 7 })`.

## 4) Tabela de Campanhas — `src/components/CampaignsTable.tsx`

### 4.1 Adicionar colunas
- Nova coluna **"Valor Compras"** (`purchase_value`, `formatCurrency`, oculta em `lg`).
- Nova coluna **"ROAS"** (`purchase_roas`, formato `Nx`, sempre visível).
- Atualizar `totals` com `purchase_value` (soma) e `purchase_roas` (média ponderada: `totals.purchase_value / totals.spend`).
- Atualizar `tfoot` com as novas colunas.

### 4.2 Versão mobile otimizada
A tabela atual no mobile fica truncada. Substituir o layout no mobile por **cards verticais** (mantendo a tabela tradicional em `md:` e acima):

```text
[ md:hidden ]                      [ hidden md:block ]
┌────────────────────────┐         ┌─ tabela atual ─────┐
│ Nome da campanha       │         │  ...               │
│ [Status] [Tags]        │         └────────────────────┘
│ ───────────────────    │
│ Gasto      R$ 1.234   │
│ Resultados   42        │
│ Custo/Res. R$ 29,40   │
│ ROAS        2.4x       │
│ Valor      R$ 3.000   │
└────────────────────────┘
```

- Renderizar duas variações condicionais:
  - `<div className="md:hidden space-y-3">` com cards (`GlassCard` interno mais compacto), mostrando: nome, status, tags, e uma grade `grid-cols-2 gap-2` com as principais métricas (Gasto, Resultados, Custo/Resultado, ROAS, Valor de Compras, Compras).
  - `<div className="hidden md:block overflow-x-auto">` mantendo a tabela atual com colunas e footer.
- Filtros de status (Todas/Ativas/Pausadas/Encerradas) e ordenação ficam acima de ambas as variações; no mobile a ordenação aparece como um pequeno `<select>` (chave + direção) em vez dos headers clicáveis.
- Manter regra de não truncar nome (`whitespace-normal break-words`).
- Fontes ligeiramente menores no card mobile (`text-xs` para labels, `text-sm font-semibold` para valores) para caber confortavelmente.

## Detalhes técnicos

- Fonte do valor de compras: campo `action_values` do Meta Insights API (mesmo formato do `actions`, com `action_type` + `value` em moeda da conta).
- ROAS exibido em `Nx` com 2 casas decimais; quando `spend = 0` mostra `—`.
- A ordenação por `purchase_roas` no mobile usa o mesmo comparador genérico já existente.
- Persistência dos cards (localStorage por cliente) continua igual; usuários antigos com 6 cards salvos continuam funcionando — adicionamos lógica em `getDefaultCards` para completar até 7 caso o array salvo tenha menos.

## Arquivos alterados

- `supabase/functions/meta-fetch-insights/index.ts`
- `src/hooks/useMetaInsights.ts`
- `src/components/KpiCard.tsx`
- `src/pages/ClientDashboard.tsx`
- `src/components/CampaignsTable.tsx`
