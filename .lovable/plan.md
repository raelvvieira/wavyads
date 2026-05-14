## Objetivo

Substituir o badge "Possivelmente não atribuído" (linha-a-linha) por **cards no topo da página** que resumem a atribuição no período filtrado, e reorganizar a hierarquia: filtros logo abaixo do título, depois cards (existentes + novos), depois a tabela.

## Mudanças em `src/pages/ComercialPage.tsx`

### 1. Reordenar a página

Nova ordem vertical:
1. Header (título "Comercial · Cliente" + subtítulo + botão Voltar)
2. **Barra de filtros** (busca, tipo, atribuição, período) — movida para cima
3. **Grid de cards de KPI** (3 atuais + 2 novos)
4. Tabela

### 2. Remover badge por linha

- Remover a coluna/badge "Possivelmente não atribuído" de cada `<tr>` (linhas 523–531).
- Manter `isPossiblyUnattributed` e o filtro "Não reconhecidos (estim.)" — continua útil para filtrar a tabela.

### 3. Novos cards de atribuição (no topo, junto aos atuais)

Calcular sobre `filtered` (respeita filtros de tipo/data/atribuição/busca) e sobre `recognizedByDay` (já é função do `dateRange`):

- **Reconhecidos pela Meta** (estim.): soma de `recognizedByDay` no período, separado em Leads/Compras numa única linha (ex.: "Leads 7 · Compras 12"). Ícone `CheckCircle2`, cor `accent`.
- **Possivelmente não atribuídos** (estim.): soma, por dia e por tipo, de `max(0, sentByDayType - recognized)` no período. Mesmo formato de duas métricas. Ícone `AlertTriangle`, cor âmbar.

Tooltip do card âmbar (via `title=`):
> "Estimativa por dia: quando enviamos mais conversões em um dia do que a Meta reconheceu, a diferença pode não ter sido atribuída. Não é possível saber quais contatos individualmente."

Ambos os cards reagem ao filtro de data (já reagem, pois dependem de `dateRange`/`recognizedByDay`/`sentByDayType`).

### 4. Layout do grid

Mudar grid de `lg:grid-cols-3` para `lg:grid-cols-5` (ou `xl:grid-cols-5`, `lg:grid-cols-3` mobile-friendly). Mantém o mesmo padrão visual `GlassCard`.

### 5. Quando o cliente não está sincronizado com Meta

Os 2 cards novos só fazem sentido se `syncedClientIds.length > 0`. Caso contrário, esconder os 2 cards (manter os 3 originais).

## Validação

- Filtro de data muda → cards de atribuição atualizam.
- Filtro "Não reconhecidos" continua filtrando tabela.
- Nenhum badge âmbar aparece mais nas linhas.
- Cliente sem sync Meta: só vê os 3 cards originais.
- Ordem visual: título → filtros → 5 cards → tabela.

## Fora de escopo

- Sem mudanças em DB, RLS ou edge functions.
- Lógica de heurística (`isPossiblyUnattributed`, `sentByDayType`, `recognizedByDay`) inalterada.
