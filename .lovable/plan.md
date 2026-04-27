## Objetivo

Cinco ajustes finos no Dashboard do Cliente para corrigir cortes nos cards de KPI (desktop e mobile), enxugar o cabeçalho no mobile, e enriquecer a tabela de campanhas e a galeria de criativos com métricas de compra.

---

## 1. KPI Cards — corrigir corte de valores e títulos (desktop e mobile)

**Problema atual:** Com 7 cards em `xl:grid-cols-7`, cada card fica estreito demais — títulos ("VALOR DE CO...", "CUSTO/RESUL...") e valores ("R$ 5...", "R$ 6...") ficam truncados. No mobile, `grid-cols-2` deixa cards muito apertados.

**Mudanças em `src/components/KpiCard.tsx`:**
- Remover `truncate` do título e do valor; permitir que o título quebre em até 2 linhas (`line-clamp-2`) com `min-h` para alinhar.
- Reduzir o tamanho do valor em telas médias (`text-base md:text-lg xl:text-xl 2xl:text-2xl`) e usar `tabular-nums` + `break-all` apenas no valor para evitar overflow horizontal.
- Mover o ícone de engrenagem (settings) para baixo do botão de ícone OU encolher o conjunto direito (`h-7 w-7` no ícone principal) liberando largura para o conteúdo.
- Diminuir padding interno em telas pequenas (`p-3 xl:p-5`).

**Mudanças em `src/pages/ClientDashboard.tsx` (grid):**
- Mobile: `grid-cols-1` (1 card por linha, como era antes) com card mais "afinado" (padding vertical reduzido, layout horizontal: título+valor à esquerda, ícone à direita).
- Tablet: `md:grid-cols-2 lg:grid-cols-3`.
- Desktop largo: `xl:grid-cols-4 2xl:grid-cols-7`. Em telas `xl` típicas (1280–1535px) 7 cards não cabem sem cortar — usar 4 colunas até `2xl` (1536px+), onde os 7 cards ganham espaço suficiente.

Isso garante leitura completa dos rótulos em qualquer breakpoint.

---

## 2. Mobile: 1 KPI por linha + cards "afinados"

Já coberto acima na grid. O `KpiCard` ganha uma variante visual mais compacta no mobile:
- Layout flex horizontal (título e valor lado a lado em linhas próprias, ícone à direita pequeno).
- Altura reduzida (~70px) em vez dos cards quadrados atuais.

---

## 3. Cabeçalho mobile mais enxuto

**Problema atual:** O header empilha logo + nome + toggle Meta/Google + 8 botões de preset de data, ocupando boa parte da tela.

**Mudanças em `src/pages/ClientDashboard.tsx` (header — apenas `< md`):**
- **Linha 1:** Botão Voltar + Avatar + Nome do cliente (mantém atual, mais compacto).
- **Linha 2:** Toggle Meta/Google (mantém glass pill, menor) + Botão "Filtros" único (ícone calendário + label do preset selecionado, ex: "Este mês").
- O botão "Filtros" abre um **`Sheet`** (drawer lateral mobile) ou `Popover` contendo:
  - Toggle Meta/Google (espelhado para conveniência).
  - Lista vertical de presets.
  - Calendário "Personalizado".

No `≥ md`, mantém o header horizontal atual com todos os presets visíveis.

Componente novo/reutilizado: usar `Sheet` de `@/components/ui/sheet` (já existe).

---

## 4. Tabela de campanhas — Custo por compra no card mobile

**Mudança em `src/components/CampaignsTable.tsx` (mobile card):**
- Adicionar `Custo/Compra` (`cost_per_purchase`) na grid de stats do card mobile (atualmente: Gasto, Resultados, Custo/Result, ROAS, Valor Compras, Compras → vira grid de 8 stats em 2 colunas, ou reorganizar para 3 colunas no mobile).
- Adicionar também ao bloco de "Total / Média" no rodapé mobile.
- Adicionar à lista `MOBILE_SORT_OPTIONS` para permitir ordenação por Custo/Compra.

Na tabela desktop a coluna `cost_per_purchase` já existe (linha 53/350) — sem alteração.

---

## 5. Top Criativos — adicionar Compras e ROAS

**Mudanças em `src/hooks/useMetaAds.ts`:**
- Adicionar campos à interface `MetaAd`: `purchases: number`, `purchase_value: number`, `purchase_roas: number`.

**Mudanças em `supabase/functions/meta-fetch-insights/index.ts` (bloco `action === "ads"`, linha ~290):**
- Calcular dentro do `.map(ad)`:
  ```ts
  const purchases = extractAction(ins.actions, PURCHASE_TYPES);
  const purchase_value = extractActionValue(ins.action_values, PURCHASE_TYPES);
  const purchase_roas = spend > 0 ? purchase_value / spend : 0;
  ```
- Incluir os três campos no objeto retornado.

**Mudanças em `src/components/CreativesGallery.tsx`:**
- Adicionar duas novas células de métrica na seção "Metrics" (sm:flex): `Compras` e `ROAS` (com cor condicional verde/amarelo/vermelho como na tabela).
- No mobile, exibir essas duas métricas em uma linha extra abaixo do nome (já que `sm:flex` esconde o bloco de métricas no mobile, criar um bloco `sm:hidden` simples com Gasto / Compras / ROAS).
- Adicionar `purchase_roas` e `purchases` às `SORT_OPTIONS` ("Maior ROAS", "Mais Compras").

---

## Arquivos a editar

- `src/components/KpiCard.tsx` — layout responsivo, sem truncamento.
- `src/pages/ClientDashboard.tsx` — grid de KPI, header mobile com Sheet de filtros.
- `src/components/CampaignsTable.tsx` — Custo/Compra no card mobile + sort + total.
- `src/components/CreativesGallery.tsx` — colunas Compras + ROAS, sort, layout mobile.
- `src/hooks/useMetaAds.ts` — novos campos na interface `MetaAd`.
- `supabase/functions/meta-fetch-insights/index.ts` — retornar `purchases`, `purchase_value`, `purchase_roas` no endpoint `ads`.

Sem mudanças de schema/banco. Deploy automático da edge function.
