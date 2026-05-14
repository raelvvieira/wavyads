## Problema

Hoje há 5 cards desalinhados que confundem:
- "Leads 0" e "Compradores 18" referem-se a **conversões enviadas manualmente** à Meta (do banco `offline_conversions`).
- "Reconhecidos pela Meta — Leads 66" vem da **API da Meta** e inclui *todos* os leads da conta (ads forms etc.), não só os enviados manualmente.
- Resultado: dois números de "Leads" lado a lado significando coisas diferentes → parece bug ou repetição.

Além disso, "Leads/Compradores/Valor" são afetados por todos os filtros (busca, tipo, atribuição, data) enquanto os de atribuição só pelo filtro de data — comportamentos misturados na mesma faixa.

## Solução: 3 cards consolidados, todos atrelados ao período

Substituir os 5 cards por **3 cards horizontais**, cada um agrupando métricas relacionadas. Todos reagem **apenas ao filtro de data** (consistência), e não aos filtros de busca/tipo/atribuição (que são da tabela).

```text
┌────────────────────────────────┬────────────────────────────────┬────────────────────────────────┐
│ 📤  ENVIADOS À META            │ ✅  RECONHECIDOS PELA META     │ ⚠️  POSSIVELMENTE NÃO ATRIB.   │
│                                │                                │                                │
│ Leads     0    Compras   18    │ Leads    66    Compras    6    │ Leads     0    Compras   12    │
│ Valor total       R$ 35.704    │ (estimativa diária agregada)   │ (gap diário; não rastreável    │
│                                │                                │  por contato)                  │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

### Card 1 — "Enviados à Meta" (azul)
- Funde os 3 cards atuais (Leads, Compradores, Valor).
- Conta sobre `rows` (já filtrado server-side por data + tipo). Para que seja consistente entre os 3 cards, **ignorar** `search` e `attributionFilter` no cálculo (continuam afetando só a tabela).
- Layout: 2 métricas em linha (Leads · Compras) + valor total embaixo, em destaque.
- Ícone: `Send` ou `Upload`.

### Card 2 — "Reconhecidos pela Meta" (accent verde)
- Mantém lógica atual (`recognizedByDay`).
- Ícone: `CheckCircle2`.
- Sublabel pequeno: "estimativa diária agregada".

### Card 3 — "Possivelmente não atribuídos" (âmbar)
- Mantém lógica atual (gap por dia).
- Ícone: `AlertTriangle`.
- Sublabel pequeno: "gap diário — não rastreável por contato".
- Tooltip mantido.

### Quando o cliente não tem sync Meta
- Mostrar **só o Card 1** ocupando largura total (`grid-cols-1`), porque cards 2 e 3 dependem de dados Meta.

### Layout
- Grid: `grid-cols-1 lg:grid-cols-3 gap-4`.
- Cada card mais alto (~120px) para acomodar 2 linhas de métricas com hierarquia clara.
- Tipografia: label pequeno em cima, números grandes em destaque, sublabel discreto embaixo.

## Validação

- Mudar período → todos os 3 cards atualizam juntos.
- Mudar busca/tipo na tabela → cards **não** mudam (ficou claro que cards = visão do período, tabela = exploração).
- Cliente sem sync Meta → 1 card único.
- Sem mais "Leads 0" ao lado de "Leads 66" — fica claro que são coisas diferentes (Enviados vs Reconhecidos).

## Fora de escopo

- Sem mudanças em DB, RLS, edge functions ou na tabela.
- Sem mudanças nos filtros existentes.
