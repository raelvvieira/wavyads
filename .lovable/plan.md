## Card informativo "Como funciona o Match aproximado"

Adicionar um card explicativo na página `/comercial`, logo abaixo do grid de KPIs (e acima da barra de filtros), para que o cliente entenda o que significa o "Match aproximado" e em que ele se baseia.

### O que o card vai mostrar

- **Título**: "Como funciona o Match aproximado"
- **Ícone**: `Info` (ou `HelpCircle`) no canto, em estilo glass discreto
- **Botão de recolher** (chevron) — começa expandido na primeira visita, mas pode ser fechado. Estado salvo em `localStorage` (`comercial.matchInfo.collapsed`) para não poluir a tela em visitas seguintes.

### Conteúdo (copy)

Estrutura em 4 blocos curtos:

1. **O que é**  
   "É a comparação entre os contatos que você enviou para a Meta e as conversões que a Meta atribuiu aos seus anúncios no mesmo período."

2. **Como é calculado**  
   Fórmula visível em destaque:  
   `Match aproximado = Reconhecidos pela Meta ÷ Enviados × 100`  
   - **Enviados**: linhas com status "Enviado" no período selecionado.  
   - **Reconhecidos**: total de Leads + Compras atribuídos pela Meta no mesmo período (vindo do Meta Insights, mesmos `event_name`).

3. **Em que se baseia**  
   - Janela padrão de atribuição da Meta: **7 dias após o clique**.  
   - Considera apenas clientes com integração Meta ativa.  
   - Os dados de "Reconhecidos" vêm da API oficial da Meta (Insights), agregados por dia.

4. **Limitações importantes** (em tom de aviso, ícone `AlertTriangle` sutil)  
   - A Meta **não informa** se um contato específico virou conversão — apenas o total agregado.  
   - Por isso o badge "Possivelmente não atribuído" é uma **estimativa** baseada na diferença diária entre enviados e reconhecidos, depois da janela de 7 dias.  
   - Match acima de 100% pode acontecer quando a Meta atribui conversões de campanhas que não correspondem 1:1 aos envios manuais (ex.: compras orgânicas + atribuídas).

### Onde mexer (técnico)

- **`src/pages/ComercialPage.tsx`**:
  - Novo componente local `MatchInfoCard` (ou inline) renderizado entre o grid de KPIs e a barra de filtros.
  - Usar `Card` + `Collapsible` (já disponível em `src/components/ui/`) para o expand/collapse.
  - Estado de colapso em `useState` inicializado a partir de `localStorage`.
  - Estilo: glass morphism consistente com os outros cards (`bg-card/50 backdrop-blur border-border/50`), sem cores novas — usar tokens semânticos existentes.
  - Sem mudanças em queries, schema ou lógica de cálculo.

### O que NÃO muda

- Cálculo do Match aproximado (já implementado).
- Heurística do badge "Possivelmente não atribuído".
- Filtros, tabela, edge functions ou schema.
