# Visão de contatos "não reconhecidos" pela Meta — Página Comercial

## Contexto importante (limitação da Meta)

A Meta **não expõe**, por contato individual, se aquele evento offline foi atribuído a um anúncio. A API só retorna:
- Confirmação de recebimento por evento (`events_received`)
- Métricas de atribuição **agregadas** por campanha/anúncio (já usadas no Dashboard)

Portanto qualquer indicação "este contato não virou conversão" é, por definição, uma **estimativa heurística** — e isso precisa ficar visível na UI para não confundir o cliente.

## O que vamos entregar

Três adições na página `/comercial`, todas respeitando o filtro de cliente, tipo e data já existentes:

### 1. Card "Match aproximado" no topo

Um novo card no grid de KPIs mostrando, para o intervalo selecionado:

- **Enviados**: total de `offline_conversions` com `send_status = 'sent'`
- **Reconhecidos pela Meta**: total de conversões atribuídas no Meta Insights no mesmo período, do mesmo `event_name` (Purchase / Lead)
- **Match aproximado**: `Reconhecidos / Enviados` em %
- Tooltip explicando que é uma comparação agregada e que a Meta não divulga match por pessoa

A fonte de "Reconhecidos" virá de uma chamada já existente: `meta-fetch-insights` agregando `actions` por `event_name` no intervalo.

### 2. Badge "Possivelmente não atribuído" por linha

Na coluna **Status** (ou em uma nova coluna "Atribuição"), além do já existente Enviado/Erro/Pendente, mostrar um segundo badge sutil quando:

- `send_status = 'sent'` **E**
- Já passaram mais de **7 dias** desde `conversion_date` (janela padrão de atribuição click) **E**
- O total agregado de `Reconhecidos` daquele dia é menor que o total `Enviados` daquele dia

Texto: "Possivelmente não atribuído" + ícone de info com tooltip:  
> "Estimativa. A Meta não confirma atribuição por contato individual."

Linhas que satisfazem o critério recebem o badge; as demais não recebem nada (não afirmamos "atribuído").

### 3. Filtro "Não reconhecidos (estimado)"

Adicionar um novo `Select` ao lado do filtro de Tipo:

- Todos
- Reconhecidos (estimado)
- Não reconhecidos (estimado)

Aplica a heurística do item 2 sobre o conjunto já filtrado por cliente/tipo/data.

## Onde mexer (resumo técnico)

- **`src/pages/ComercialPage.tsx`**
  - Adicionar query auxiliar para buscar conversões reconhecidas pela Meta no período (chama `meta-fetch-insights` com `{ since, until }` por cliente; quando "Todos os clientes", soma por cliente)
  - Calcular agregados por dia (`Map<dateISO, { sent, recognized }>`)
  - Renderizar novo card no grid de KPIs
  - Renderizar badge condicional na linha
  - Adicionar `Select` de filtro de atribuição e aplicar no `useMemo` de filtro

- **Sem mudanças** em: schema, RLS, edge function `send-offline-conversion`, `meta-fetch-insights`, ou em qualquer outra página.

## Como o usuário deverá ler

A UI vai deixar claro, por copy e tooltips, que:
- "Reconhecido" = conversão atribuída pela Meta no mesmo intervalo, **não** o mesmo contato individual
- "Não atribuído" é uma **estimativa** baseada em janela de 7 dias e diferença agregada por dia

Isso evita prometer um dado que a API da Meta não fornece, e ainda assim entrega uma leitura útil do "gap" entre envios e conversões reconhecidas.
