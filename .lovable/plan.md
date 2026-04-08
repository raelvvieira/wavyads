

## Plan: Remover Ranking Charts dos Dashboards

Os cards "Leads por Campanha" e "CPL por Campanha" (componente `RankingCharts`) aparecem apenas no `ClientDashboard.tsx`.

### Alteração

**Arquivo:** `src/pages/ClientDashboard.tsx`

- Remover o import de `RankingCharts`
- Remover o bloco JSX que renderiza `<RankingCharts>` (linhas ~548-551)

Opcionalmente, o arquivo `src/components/RankingCharts.tsx` pode ser deletado já que não será mais usado.

