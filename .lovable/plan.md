# Plano

## 1. Funil de Conversão — 6º card editável

Hoje o funil tem 5 estágios (Impressões, Alcance, Cliques + 2 cards editáveis). Vamos adicionar um 3º card editável ao final, totalizando 6.

**Novas opções disponíveis nos 3 seletores editáveis:**
- Leads
- Resultados
- Compras
- **Adicionar ao Carrinho** (Add to Cart)
- **Iniciar Checkout** (Initiate Checkout)
- **Visualizar Conteúdo** (View Content)

Cada card editável permanece independente (lembrado em `localStorage`), com seu CPL/Custo correspondente quando aplicável.

**Arquivos:**
- `src/components/ConversionFunnel.tsx` — adicionar `stage6`, novas opções no `STAGE_OPTIONS`, ampliar `stageData`, `STAGE_GREENS` (6 tons), e propagar as novas métricas via props.
- `src/components/DashboardLayout.tsx` (ou onde o `<ConversionFunnel>` é instanciado) — passar `addToCart`, `initiateCheckout`, `viewContent` e respectivos custos vindos do `useMetaInsights` (já são extraídos do campo `actions` do Meta — apenas mapear).
- `src/hooks/useMetaInsights.ts` — garantir extração desses 3 actions (`add_to_cart`, `initiate_checkout`, `view_content`) e custos por ação (`cost_per_action_type`).

## 2. Novo menu "Comercial"

Lista todas as pessoas registradas via "Registrar conversão" (tabela `offline_conversions`).

**Escopo de acesso:**
- **Admin**: vê todos os clientes, com seletor/filtro por cliente no topo.
- **Cliente logado**: vê apenas registros do próprio cliente (RLS já cobre).

**Sidebar (`src/components/AppSidebar.tsx`):**
Adicionar item "Comercial" (ícone `Users` do lucide), visível para admin e cliente, posicionado entre "Insights" e "Google Ads I.A".

**Nova rota:** `/comercial` registrada em `src/App.tsx`, protegida por `ProtectedRoute`.

**Nova página:** `src/pages/ComercialPage.tsx`
- Header com título "Comercial" e contadores (total de Leads, total de Compradores, valor total).
- Filtros: cliente (admin), tipo (Lead/Compra/Todos), busca por nome/email/telefone, intervalo de datas.
- Tabela (estilo glass do projeto) com colunas:
  - **Nome** (`fn` + `ln`)
  - **E-mail**
  - **Telefone**
  - **Tipo** (badge: Lead / Compra)
  - **Valor** (formatado em BRL, vazio para Lead)
  - **Data** (`conversion_date`, formato dd/MM/yyyy)
  - **Status envio** (badge: Enviado/Pendente/Erro — com tooltip de `error_message` em caso de erro)
  - **Cliente** (apenas para admin)
- Ordenação por data desc por padrão. Paginação simples (50 por página).
- Linha clicável → abre painel lateral (Sheet) com todos os campos adicionais (CEP, cidade, gênero, idade, Meta event ID, etc.) e botão "Reenviar para Meta" (reusa `send-offline-conversion`).

**Novo hook:** `src/hooks/useOfflineConversions.ts`
- `useOfflineConversions(filters)` — query em `offline_conversions` com join opcional em `clients(name)` para admins. RLS já garante o escopo por cliente.

**Sem alterações de schema.** Tabela `offline_conversions` e suas RLS policies já suportam tudo.

## Detalhes técnicos

- Usar `useRole()` para diferenciar UI admin vs cliente.
- Reusar `GlassCard`, `Table`, `Badge`, `Sheet`, `Popover`/`Calendar` já existentes.
- Reaproveitar formatadores `formatCurrency` / `formatNumber` de `src/data/mock`.
- Cores e tipografia conforme design system (verde `#1ACD8A` para sucesso/Lead, accent para Compra, etc.).
- Mobile: padding `pt-20 lg:pt-6` (regra do projeto).

## Fora do escopo

- Edição/exclusão de registros existentes na lista Comercial (apenas leitura + reenvio).
- Exportação CSV (pode ser adicionada depois se necessário).
