# Corrigir gráfico diário em períodos personalizados

## Causa raiz

No edge function `supabase/functions/meta-fetch-insights/index.ts` (linhas 371–388), a chamada ao endpoint de breakdown diário da Meta Graph API é feita **sem `limit` e sem paginação**:

```ts
const dailyRes = await fetch(
  `${GRAPH_API}/${adAccountId}/insights?fields=...&${dateFilter}&time_increment=1&access_token=...`
);
const dailyData = await dailyRes.json();
for (const d of (dailyData.data || [])) { ... }
```

A Meta Graph API retorna por padrão apenas **25 registros por página** com um cursor `paging.next` para os demais. Como o código só lê `data` da primeira página:

- "Este mês" (até 31 dias, mas presets curtos costumam couber em 1 página devido a dias zerados não retornados) — geralmente funciona.
- Período personalizado longo (ex.: 14/04 – 12/05 = 29 dias) — só os primeiros ~25 dias com atividade voltam; os demais aparecem **zerados** (porque o loop de "fill missing days" preenche com zeros).

Isso explica exatamente o relato: "Este mês" mostra tudo certo, mas "Personalizado" mostra o gráfico incompleto/zerado em parte do intervalo.

## Correção

Adicionar `limit=500` na chamada e seguir o cursor `paging.next` até esgotar todas as páginas, agregando todos os `data[]` antes de montar `dailyByDate`.

### Arquivo a editar
- `supabase/functions/meta-fetch-insights/index.ts` (apenas o bloco do daily breakdown, ~linhas 370–388)

### Pseudocódigo da mudança
```ts
const dailyAll: any[] = [];
let url = `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions&${dateFilter}&time_increment=1&limit=500&access_token=${accessToken}`;
while (url) {
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) break; // (mantém comportamento atual de não quebrar o resto)
  dailyAll.push(...(j.data || []));
  url = j.paging?.next || "";
  // safety: limita a, p.ex., 10 páginas para evitar loop infinito
}
for (const d of dailyAll) { dailyByDate.set(d.date_start, { ... }); }
```

Mantém todo o restante (resolveRange, fill com zeros, formatação `pt-BR`, etc.) sem alteração.

## Fora do escopo

- Não mexer em frontend, presets, ou no `time_range` enviado (já está correto).
- Não alterar a chamada de `insights` agregado nem `campaigns/ads` — eles retornam 1 linha agregada e não sofrem com paginação no caso do agregado; campanhas/ads já têm `limit=100/200`.

## Validação

Após o deploy, abrir um cliente, selecionar Personalizado com intervalo > 25 dias e conferir que o gráfico "Métricas por Dia" mostra os valores reais em todos os dias do range (não só nos primeiros).
