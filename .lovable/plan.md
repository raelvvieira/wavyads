# Plano

Adicionar um filtro de intervalo de datas na página `/comercial`, ao lado dos filtros já existentes (busca, cliente, tipo).

## Comportamento

- **Presets rápidos** no estilo já usado no Dashboard:
  - Hoje
  - Últimos 7 dias
  - Últimos 30 dias (padrão)
  - Este mês
  - Mês passado
  - Personalizado (abre calendário com `from`/`to`)
- Filtra `offline_conversions.conversion_date` dentro de `[since, until]` (regra do projeto: sempre `{ since, until }`, nunca `date_preset`).
- Estado persistido em `localStorage` (`comercial_date_preset` / `comercial_date_custom`).
- Reseta a paginação ao mudar.
- Mantém ordenação por `conversion_date desc`.

## Arquivos

- `src/pages/ComercialPage.tsx`
  - Novo componente interno `DateRangeFilter` (ou reutilizar Popover + Calendar do shadcn já presentes no projeto).
  - Adicionar `dateRange` ao `queryKey` e ao filtro Supabase: `.gte('conversion_date', since).lte('conversion_date', untilEndOfDay)`.
  - Atualizar contadores (Leads/Compradores/Valor) — já derivam de `filtered`, então passam a refletir o intervalo automaticamente.

Sem mudanças de schema, RLS ou edge functions.
