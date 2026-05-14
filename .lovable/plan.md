# Plano: Sugestão de copy no placeholder + 4 variações de copy otimizada

## 1. Pré-sugestão dentro do textarea (Step 2)

Nova edge function `criativo-suggest-copy` (Lovable AI Gateway, `gemini-2.5-flash`):
- Body: `{ analysis, language }` — recebe a análise visual da Step 1.
- Devolve: `{ suggestion: string }` — uma copy bruta, ~2-3 linhas, em PT-BR, baseada no `mood.adjetivos`, `mood.referencias` e `designSystemDoc`. Tom: rascunho que o anunciante completaria.
- Sem armazenar nada.

Frontend `CriativoStudioPage.tsx`:
- Novo estado `suggestedRawCopy: string`.
- Quando `step === 1` é alcançado pela primeira vez **com `analysis` presente** e `rawCopy` vazio, chamar a função em background e gravar o resultado em `suggestedRawCopy`.
- Renderizar a sugestão como **valor placeholder real do textarea**: usar o atributo `placeholder={suggestedRawCopy || 'Ex: ...'}`.
- Se o usuário começar a digitar, o placeholder some (comportamento nativo). Sugestão nunca sobrescreve o que ele escreve.
- Adicionar um pequeno botão "Usar sugestão" abaixo do textarea (só aparece quando `suggestedRawCopy && !rawCopy.trim()`) que faz `setRawCopy(suggestedRawCopy)` para o usuário poder editar a partir dela.

## 2. 4 variações de copy otimizada

`supabase/functions/criativo-improve-copy/index.ts`:
- Trocar o tool de objeto único por um tool que devolve `{ variations: CopyResult[] }` com **4 itens**.
- Cada variação com ângulo distinto: (a) Direto/Benefício, (b) Urgência/Escassez, (c) Curiosidade/Hook, (d) Prova/Autoridade. Adicionar campo `angulo: string` em cada `CopyResult` para identificar.
- System prompt instrui a gerar 4 ângulos diferentes mantendo a estrutura de 5 blocos.

Frontend:
- Estado muda: `copyResult: CopyResult | null` → `copyVariations: CopyResult[]` + `selectedVariationIdx: number | null`.
- Substituir o card único de "Sugestão da IA" por **grid de 4 cards** (1 col mobile, 2 cols md). Cada card mostra `angulo` como header, label/título/subtítulo/dados/CTA + justificativa.
- Card "Sua copy original" continua ao lado (acima do grid de 4).
- Selecionar um card → `selectedVariationIdx = i`, `copySource = 'ai'`, `copyApproved = true`, `setStep(2)`.
- Em `buildFinalPrompt` (linha 239), trocar `copyResult` por `copyVariations[selectedVariationIdx!]`.
- `applyFatorCriativo` (linha 306) e `generateBusinessContext` (linha 138): mesma substituição.

## Validação

1. Step 1 concluída com refs → entra em Step 2 → placeholder do textarea já tem rascunho contextualizado.
2. Click "Usar sugestão" → preenche textarea, fica editável.
3. Click "Sugerir versão otimizada" → aparecem 4 cards com ângulos distintos.
4. Selecionar um → próximo passo usa exatamente aquela variação no prompt final.
