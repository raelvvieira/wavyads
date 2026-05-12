## Diagnóstico

O cliente selecionou `14/04 – 12/05`, mas o gráfico "Métricas por Dia" para em `08/05`. A causa é a forma como a Meta Graph API responde no `meta-fetch-insights` (action `insights`, com `time_increment=1`):

- A Meta retorna **apenas os dias que tiveram entrega/spend > 0**. Dias 09/05–12/05 sem entrega simplesmente **não aparecem** na resposta.
- O frontend hoje (`DailyChart.tsx`) renderiza exatamente o array recebido — então o eixo X termina no último dia retornado pela Meta, dando a falsa impressão de que "faltam dias".
- Os KPIs continuam consistentes porque agregam o intervalo inteiro mesmo sem rows individuais.

## Correção

Preencher a série diária com **todos os dias do intervalo selecionado**, completando dias ausentes com zeros, mantendo a ordem cronológica. Assim o gráfico vai sempre de `since` até `until`, mostrando vales em zero quando não houve entrega.

### Onde aplicar

Backend (mais robusto — beneficia qualquer consumidor da resposta):
- `supabase/functions/meta-fetch-insights/index.ts`, action `insights` (linhas ~370-385). Após montar `daily` a partir de `dailyData.data`, gerar um array contínuo de datas entre `timeRange.since` e `timeRange.until` (ou derivar de `datePreset` quando não houver `time_range`) e fazer merge por `date_raw` (YYYY-MM-DD), preenchendo zeros para `spend, impressions, reach, clicks, leads, purchases, results`.

### Detalhes técnicos

- Iterar `since → until` em UTC para evitar shift de timezone (usar `Date.UTC` como já recomenda o padrão do projeto).
- `date` (label) continua no formato `dd/MM` em pt-BR.
- Quando `timeRange` não vier (fallback `date_preset`), derivar `since/until` localmente a partir do preset (`today`, `yesterday`, `last_7d`, `last_14d`, `last_30d`, `this_month`, `last_month`) — replicando a mesma lógica do frontend (`computeTimeRange`) em UTC.
- Não alterar KPIs nem `insights_previous`; o ajuste é restrito ao array `daily`.
- Sem mudanças em frontend, schema, RLS ou outras edge functions.

### Verificação

Após o deploy, recarregar `/dashboard/<id>` com range `14/04 – 12/05`: o eixo X deve ir até `12/05`, com `09/05–12/05` em zero (ou nos valores reais, caso a Meta agora retorne — o caso de `Deni Haut Cursos` mostrou que não havia entrega).
