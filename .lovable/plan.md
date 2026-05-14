# Plano — Uso mensal + reorganização do Step 4

## 1. Uso de IA cumulativo mensal (com reset automático)

`src/lib/aiUsageTracker.ts`:
- `monthKey()` passa a usar **hora local** (`getFullYear`/`getMonth`) para casar com o label "MAI. DE 26" da UI.
- `read()` ganha um *housekeeping*: ao ler o mês atual, varre `localStorage` e remove qualquer chave `ai-usage:YYYY-MM` que não seja a do mês corrente. Assim, ao virar o mês, o painel mostra zero automaticamente (não é necessário botão de reset).
- `recordAiUsage` continua acumulando dentro do mesmo mês.
- Sem mudanças em `useAiUsage` nem nos pontos de chamada.

## 2. Step 4 — nova organização (Story em cima, 1080 embaixo, Fator à direita)

### Botões do topo (linha 855)
Manter apenas: **Gerar Story** (ou "Gerar Story novamente") + **Aplicar Fator Criativo** + **Voltar**.
Remover o botão "Recriar em 1080x1080" do topo. Remover também o card separado "Fator Criativo" com seu próprio header (linhas 912–950) — o título e descrição ficam ao lado do botão no topo, dentro da mesma linha de ações.

### Estado novo
- `factorSquareImages: (string | null)[]` (length 5).
- `factorSquareLoading: boolean[]` (length 5).
- Função `recreateSquare(index: number | 'main')`:
  - Para `'main'`: usa o `buildFinalPrompt('square')` atual e seta `squareImage`.
  - Para índice `i`: usa `factorVariations[i].promptCompleto`, chama `criativo-generate` com `aspect: 'square'` e `storyReference: storyImage` (consistência visual com a story original já garantida pelo prompt). Salva em `factorSquareImages[i]`.
- Refatorar `generate('square')` para reusar `recreateSquare('main')`.

### Layout (desktop ≥ lg)
Grid único com 6 colunas: **1 coluna para a arte principal + 5 para o Fator**.
```text
┌──────────┬──────┬──────┬──────┬──────┬──────┐
│ Story    │ Fa1  │ Fa2  │ Fa3  │ Fa4  │ Fa5  │
│ (main)   │      │      │      │      │      │
│ ⬇ Baixar │ ⬇    │ ⬇    │ ⬇    │ ⬇    │ ⬇    │
│ ⟳ 1080   │ ⟳    │ ⟳    │ ⟳    │ ⟳    │ ⟳    │
├──────────┼──────┼──────┼──────┼──────┼──────┤
│ Sq1080   │ Sq1  │ Sq2  │ Sq3  │ Sq4  │ Sq5  │
│ ⬇ Baixar │ ⬇    │ ⬇    │ ⬇    │ ⬇    │ ⬇    │
└──────────┴──────┴──────┴──────┴──────┴──────┘
```
Cada coluna tem a mesma estrutura:
1. Story 9:16 (clique → lightbox)
2. Botão **Baixar Story**
3. Botão **Recriar em 1080x1080** (ou loader; some quando o square existe)
4. Se `squareImage` existe: square 1:1 + botão **Baixar 1080x1080**

Antes de aplicar Fator, só a coluna principal é renderizada — assim a tela inicial fica limpa e o "Aplicar Fator Criativo" fica visível no topo. Após aplicar, as 5 colunas aparecem à direita (skeletons enquanto carregam).

### Responsivo
- `grid-cols-2` mobile, `md:grid-cols-3`, `lg:grid-cols-6`.
- Em mobile/tablet, as 6 colunas quebram naturalmente para baixo, mas a ordem semântica (Story principal primeiro, depois variações 1→5) é preservada.
- Cada coluna usa `min-w-0` para evitar overflow das pré-visualizações.

### Limpezas
- Remover do JSX antigo: o bloco de "Recriar em 1080x1080" no topo, a `div` separada de exibição (linhas 871–910), e o card inteiro de Fator (linhas 912–1010, mantendo só o handler).
- Manter `lightboxUrl` e `download()` como estão.

## Validação
1. Vira o mês → painel de uso mostra zero sem ação manual; histórico do mês passado some do `localStorage`.
2. Step 4 inicial → 1 coluna com Story + botões "Baixar Story" e "Recriar em 1080x1080" embaixo.
3. Click "Recriar em 1080x1080" → square aparece logo abaixo, com "Baixar 1080x1080".
4. Click "Aplicar Fator Criativo" (botão no topo) → 5 colunas aparecem à direita com skeletons → preenchem.
5. Click "Recriar em 1080x1080" em uma variação → square aparece só naquela coluna.
6. Mobile (≤768px): grid quebra em 2 colunas, ordem preservada, sem overflow horizontal.
