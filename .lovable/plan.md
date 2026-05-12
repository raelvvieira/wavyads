## Objetivo

Substituir o cálculo atual do "Match aproximado" (razão de totais Meta vs envios) por um **match real dia-a-dia + por tipo de evento**, eliminando os "341" confusos e refletindo apenas o que de fato pode ter sido reconhecido.

## Lógica nova

Para cada `(dia, event_name)`:
- `enviados[d,t]` = nº de linhas com `send_status='sent'` naquele dia/tipo
- `reconhecidos_meta[d,t]` = Leads ou Purchases que a Meta reportou naquele dia (já temos via `recognizedByDay`)
- **`matched[d,t] = min(enviados[d,t], reconhecidos_meta[d,t])`** ← teto pelo nº de envios, não pelo total Meta

Totais agregados no período:
- `sentTotal = Σ enviados[d,t]`
- `matchedTotal = Σ matched[d,t]` (capado dia-a-dia)
- `matchPct = matchedTotal / sentTotal × 100` (sempre entre 0–100, sem precisar de `Math.min(100, …)`)

Respeita o `typeFilter` (all / Lead / Purchase) somando apenas os tipos relevantes.

## Card "Match aproximado"

Trocar a label confusa `341 reconh. / 54 enviados` por:
- Linha 1 (grande): `XX%`
- Linha 2 (pequena): `{matchedTotal} de {sentTotal} envios prováveis`

Assim o numerador nunca será maior que o denominador.

## Card informativo

Atualizar o parágrafo curto para refletir a nova lógica:
> "Calculamos dia-a-dia: para cada dia e tipo (Lead/Purchase), comparamos seus envios com as conversões que a Meta atribuiu naquele dia, contando no máximo um match por envio. A Meta não fornece atribuição por pessoa, então é uma estimativa de cobertura."

## Heurística "Possivelmente não atribuído"

Mantém a regra atual (já é dia-a-dia + tipo + idade ≥ 7 dias + `enviados > reconhecidos`), que continua coerente com a nova lógica. Sem mudanças.

## Arquivo afetado

- `src/pages/ComercialPage.tsx` — bloco `totals` (linhas ~306–321), JSX do card de match (linhas ~400–420) e texto do card informativo (linhas ~425–440).

Nenhuma mudança de backend, schema ou edge function.