# Restaurar qualidade da geração de imagem no Criativo Studio

## Causa raiz
O endpoint atual `/v1/images/generations` da OpenAI **só aceita texto**. Foto do produto, logo e a Story (usada como ground truth cromático para o Quadrado) estão sendo descartados antes de chegar ao modelo. O prompt textual em si está sendo enviado por completo (~5050 chars confirmados nos logs) — o problema é a perda das refs visuais.

## Mudanças

### 1. `supabase/functions/criativo-generate/index.ts` — reescrita

- **Modelo:** `gpt-image-1` (gpt-image-1.5 não existe publicamente; edits só funciona com gpt-image-1).
- **Body novo:**
  ```ts
  {
    prompt: string,
    aspectRatio: 'story' | 'square',
    quality?: 'low' | 'medium' | 'high',
    isVariation?: boolean,
    productImages?: string[],   // data URLs
    logoImage?: string | null,  // data URL
    storyReference?: string | null  // data URL — só p/ square
  }
  ```
- **Roteamento:**
  - Se houver pelo menos 1 ref → `POST /v1/images/edits` (multipart/form-data).
  - Se não houver refs → mantém `POST /v1/images/generations` (atual).
- **Multipart edits:**
  - Converter cada data URL em `Blob` e anexar como `image[]` (até 16). Ordem: `productImages...`, depois `logoImage`, depois `storyReference` (se square).
  - Campos: `model=gpt-image-1`, `prompt`, `n=1`, `size` (1024x1536 story / 1024x1024 square), `quality` (final).
- **Resposta:** OpenAI `/edits` retorna `b64_json` por padrão → converter para `data:image/png;base64,...`. Manter compat com `url`.
- **Erros:** preservar mapeamento 401/429/402 atual; logar `prompt_chars`, contagem de refs, endpoint usado.

### 2. `src/pages/CriativoStudioPage.tsx` — passar refs

- Em `generate(aspect)`: incluir no body
  ```ts
  productImages,
  logoImage: logoImage[0] || null,
  storyReference: aspect === 'square' ? storyImage : null
  ```
- Em `applyFatorCriativo` (loop das 5 variações): passar as MESMAS refs (`productImages`, `logoImage[0]`, e `storyImage` quando aspect=square) — assim cada variação herda o DNA visual original.
- Nenhuma mudança de UI. Os blocos `[ATTACHED PHOTOS]`, `[BRAND LOGO]`, `[VISUAL CONSISTENCY]` no prompt continuam — agora coerentes com as imagens efetivamente enviadas.

### 3. Sem mudança em
- `criativo-fator` (texto, segue Lovable AI / Gemini).
- `aiUsageTracker` (custos da OpenAI por qualidade já cobrem ambos endpoints).
- `buildFinalPrompt()` (prompt já está completo e está sendo enviado integralmente).

## Validação após implementar
1. Deploy `criativo-generate`.
2. Testar geração Story com produto + logo: confirmar nos logs `endpoint=edits, refs=2`.
3. Gerar Quadrado depois do Story: confirmar `refs=3` (com storyReference).
4. Verificar visualmente que rosto/produto/logo estão preservados e que Story↔Quadrado têm a mesma paleta.

## Riscos
- Conta OpenAI precisa ter `billing_hard_limit` resolvido (erro 402 anterior). Independente desta mudança.
- `gpt-image-1` pode aplicar quality='high' com latência maior (~30-60s). Aceitável para criativos premium.
