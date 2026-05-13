# Plano — Refino do Criativo Studio

Mudanças apenas no frontend (`CriativoStudioPage.tsx` + leve ajuste em `criativo-generate` para reforçar o aspect ratio quadrado). Sem mexer em lógica de negócio nem em outras páginas.

## 1. Tipografia geral menor
- Header: `text-2xl sm:text-3xl` → `text-xl sm:text-2xl`; subtítulo `text-sm` → `text-xs`.
- Títulos de step (`h2`): `text-lg` → `text-base`.
- Descrições de step: `text-sm` → `text-xs`.
- Labels e campos com escala reduzida (textarea e selects mantêm `text-sm` para legibilidade de input).
- StepIndicator: ajustar para fonte menor (`text-xs`).
- Resultado da copy: headline `text-lg` → `text-base`.

## 2. Step 2 — manter copy original
- Após gerar `copyResult`, mostrar **dois cards lado a lado**:
  - "Sua copy original" (o `rawCopy` que o usuário escreveu)
  - "Sugestão da IA" (atual `copyResult`)
- Cada card com botão **"Usar essa"**.
- Estado novo: `selectedCopySource: 'original' | 'ai'`.
- `buildFinalPrompt` passa a usar a copy selecionada:
  - Se `original`: injeta o `rawCopy` cru como bloco de texto/instrução para overlay.
  - Se `ai`: comportamento atual (headline/subheadline/CTA).
- "OK, usar essa" continua avançando para step 3.

## 3. Step 3 — logo separado
- Adicionar uma seção dedicada **"Logo da marca (opcional)"** acima do dropzone de produto/pessoa.
- Novo estado `logoImage: string | null` (apenas 1 imagem).
- Componente: dropzone reutilizado com `maxImages={1}` ou um mini-uploader específico.
- `buildFinalPrompt` ganha instrução explícita quando há logo:
  - "Include the brand logo (provided as a separate reference) discreetly in a corner of the composition. Do not distort, recolor or recreate the logo — treat it as a fixed brand asset."
- Texto curto explicando: "A IA vai posicionar o logo discretamente no canto, sem distorcer."

## 4. Step 4 — preview menor + lado a lado + corrigir 1080x1080

### Preview menor
- Container do grid: `grid sm:grid-cols-2 gap-4` mantém, mas cada imagem dentro de um wrapper com `max-w-[260px] mx-auto` (Story) e `max-w-[320px] mx-auto` (Square) para não ocupar tela inteira.
- Adicionar `aspect-[9/16]` no Story e `aspect-square` no Square para manter proporção visual mesmo antes de carregar.

### Sempre lado a lado quando há os dois
- Já está em `sm:grid-cols-2`. Garantir que quando só Story existir ele fique centralizado (`justify-items-center`), e quando ambos existirem fiquem alinhados em colunas iguais.
- Adicionar `items-start` para alinhar tops.

### Corrigir "Recriar em 1080x1080"
Diagnóstico: o botão chama `generate('square')`, mas o problema provável é que o payload do Freepik para alguns modelos não respeita `square_1_1` quando o modelo já gerou em 9:16, ou o backend precisa de chave diferente. Ajustes:
- No frontend: garantir que o botão fica **sempre habilitado** quando há `storyImage` (hoje só desabilita por `generating`, ok) e que o estado `squareImage` é resetado antes de nova chamada.
- No backend (`criativo-generate`): revisar `buildPayload` para garantir aspect ratio quadrado:
  - `classic-fast`: trocar `image.size` para `"square_1_1"` (já está, ok).
  - `flux-dev`: `aspect_ratio: "1:1"` (ok).
  - `mystic`: usar `aspect_ratio: "square_1_1"` (ok) — confirmar se o valor aceito é `"square"` ou `"square_1_1"`; ajustar se Freepik exigir `"square"`.
  - `imagen3`: idem.
- Adicionar log do payload final e da resposta para facilitar debug se ainda falhar.
- Reforçar no prompt enviado a string "1:1 square format, centered composition" para o modelo seguir o aspect.

## Arquivos afetados
- `src/pages/CriativoStudioPage.tsx` (principal)
- `src/components/criativo/StepIndicator.tsx` (fonte menor)
- `supabase/functions/criativo-generate/index.ts` (ajustes de payload + log para o caso quadrado)

## Fora do escopo
- Persistência, novos modelos, nova página.
- Mudanças nas funções `criativo-analyze-refs` e `criativo-improve-copy`.
