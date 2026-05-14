# Plano: Modelo dinâmico no Fator Criativo + paridade de prompt com Lovable AI

## 1. Modelo selecionado também no Fator Criativo

`src/pages/CriativoStudioPage.tsx` → `applyFatorCriativo`:
- Trocar `model: 'gemini-3.1-flash-image-preview'` (hardcoded) por `model` (estado do select).
- Trocar `recordAiUsage('image-gemini-flash-2')` por `recordAiUsage(MODEL_OPTIONS.find(m => m.id === model)?.usage || 'image-gemini-flash-2')`.
- Atualizar a nota da UI (linha ~756): em vez de "As 5 variações usam sempre Nano Banana 2", dizer "As 5 variações do Fator Criativo usam o mesmo modelo selecionado acima".

## 2. Paridade de prompt com a versão Lovable AI Gateway

A implementação antiga (msg #390) montava `fullPrompt` com 3 blocos: **aspect ratio instructions + main prompt + reference image hints**. A versão atual só faz `aspectInstruction + prompt`, sem o bloco de hints de referências.

`supabase/functions/criativo-generate/index.ts`:
- Manter `responseModalities: ["IMAGE"]` e `inline_data` (formato Gemini direto, equivalente ao `image_url` do Gateway).
- Adicionar bloco de **reference image hints** ao `fullPrompt` quando houver refs anexadas, replicando o que o Gateway recebia:
  ```
  [REFERENCE IMAGES]
  {N} reference image(s) attached. Use them as the source of truth for the subject's appearance, brand logo and visual consistency. Do not invent new faces or alter the brand mark.
  ```
- Ordem final: `aspectInstruction` → `prompt` (já contém todo o design system, copy, mood, do-not) → `referenceHints`.
- Sem mudar o contrato com o frontend.

## Validação

1. Mudar para "Nano Banana Pro" no Step 4 → tanto a arte principal quanto as 5 variações usam Pro.
2. Gerar com produto + logo → o bloco `[REFERENCE IMAGES]` aparece nos logs do edge function.
3. Sem refs → o bloco é omitido.
