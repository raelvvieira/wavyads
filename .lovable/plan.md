

## Plan: 7 Correções no Google Ads I.A

### Arquivos a editar

| Arquivo | Correções |
|---------|-----------|
| `supabase/functions/google-ads-ai-gen/index.ts` | C3 (snippets prompt), C4 (cidade_campanha nos prompts), C5 (acentuação), C6 (frases sem pontuação), nova action `regenerate_texto_unico` (C1) |
| `src/hooks/useGoogleAdsAI.ts` | C1 (função regenerateTextoUnico), C2 (force fixar nos títulos 1-2), C4 (campo cidade_campanha no state e passado a todas as chamadas) |
| `src/pages/GoogleAdsAIPage.tsx` | C1 (botão regenerar texto único), C2 (ícone cadeado), C3 (validação snippets 25 chars), C4 (campo cidade obrigatório na etapa 1), C7 (exclusões como tags editáveis) |

### Detalhes por correção

**C1 — Regenerar Texto Único**
- Edge function: nova action `regenerate_texto_unico` com system prompt pedindo reescrita ≤270 chars
- Hook: adicionar `regenerateTextoUnico(frenteId)` que chama a edge function e atualiza o titles.textoUnico no state
- UI: se `textoUnico.length > 280`, exibir botão "Regenerar Texto Único" ao lado do CharBadge

**C2 — Títulos 1 e 2 fixados**
- Hook: após receber titles da API, forçar `titulos[0].fixar = true`, `titulos[1].fixar = true` e os demais `fixar = false`
- UI: na coluna Fixar, exibir 🔒 para títulos 1 e 2, nada para os demais

**C3 — Snippets curtos**
- Edge function: adicionar ao SYSTEM_KEYWORDS a regra de snippets ≤25 chars
- UI: na seção Snippets, exibir CharBadge com max=25 e ❌ se ultrapassar

**C4 — Campo cidade obrigatório**
- Hook: adicionar `cidadeCampanha` ao state, passá-lo como parâmetro em todas as chamadas (analyze, titles, descriptions, keywords)
- Edge function: em todos os user prompts, adicionar `ATENÇÃO: Esta campanha é exclusiva para a cidade {cidade_campanha}...`
- UI: novo campo Input na Etapa 1 — "Cidade desta campanha" (obrigatório). Botão Analisar desabilitado se vazio.

**C5 — Acentuação**
- Edge function: adicionar regra de acentuação ao SYSTEM_KEYWORDS

**C6 — Frases sem pontuação**
- Edge function: adicionar regra ao SYSTEM_KEYWORDS sobre não usar pontuação em frases de destaque

**C7 — Exclusões como tags editáveis**
- UI: na seção Diretrizes, campo exclusões pré-preenchido com `negativasGlobais` da API. Cada exclusão é uma tag com botão ✕ para remover. Botão "+ Adicionar exclusão" com input inline para adicionar novas.

### Ordem de implementação
1. Edge function (C1 action + C3/C4/C5/C6 prompt updates)
2. Deploy + test
3. Hook (C1 regenerate + C2 fixar + C4 cidadeCampanha)
4. UI page (C1 botão + C2 cadeado + C3 snippets validation + C4 cidade input + C7 tags editáveis)

