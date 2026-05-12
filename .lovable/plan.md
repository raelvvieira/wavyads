## Remover bloco "Match aproximado" da página Comercial

### O que remover em `src/pages/ComercialPage.tsx`

1. **Card de KPI "Match aproximado"** (linhas 407–430) — o quarto `GlassCard` da grid de stats.
2. **Bloco informativo "Match aproximado: calculamos dia-a-dia…"** (linhas 433–447) — o `GlassCard` com o ícone `Info`.

### Ajustes pequenos

- Trocar a grid de stats de `lg:grid-cols-4` para `lg:grid-cols-3` (linha 373) para os 3 cards restantes (Leads, Compradores, Valor total) ocuparem o espaço corretamente.
- Remover do `useMemo` de `totals` (linhas 311–328) o cálculo de `sentTotal`, `matchedTotal`, `matchPct` (não será mais usado).
- Remover imports que ficarem sem uso: `Target`, `HelpCircle`, `Info` (verificar antes de remover — se ainda forem usados em outro lugar, manter).

### O que NÃO mudar

- O filtro "Atribuição" (Reconhecidos / Possivelmente não reconhecidos) e a lógica `isPossiblyUnattributed` permanecem — é uma feature útil separada do card de Match.
- `sentByDayType` e `recognizedByDay` continuam sendo calculados (usados pelo filtro de atribuição).
