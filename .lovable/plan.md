# Plano — Refinos no Criativo Studio

## 1. Contexto do negócio gerado pela IA (Step 4)

Hoje o campo "Contexto do negócio" é texto livre digitado pelo usuário. Vou transformá-lo em **gerado automaticamente** com base em tudo que já foi capturado:

- Mood/referências/adjetivos da Step 1 (análise visual)
- Copy aprovada da Step 2 (label, título, subtítulo, dados, CTA)
- Idioma escolhido

**Como:** quando o usuário entra na Step 4 (e ainda não tem `businessContext`), disparar uma chamada à edge function nova `criativo-business-context` que usa Lovable AI (`google/gemini-3-flash-preview`) para devolver 1–2 frases descrevendo o negócio/oferta. O campo continua editável (caso queira ajustar) e ganha um botão "Regenerar" ao lado.

- Nova edge function: `supabase/functions/criativo-business-context/index.ts`
- Hook no `CriativoStudioPage`: `useEffect` ao entrar na step 4 com `analysis` + `copyResult` presentes e `businessContext` vazio.
- UI: label muda para "Contexto do negócio (gerado automaticamente)", com botão pequeno `RefreshCw` "Regenerar" e estado de loading.

## 2. Lightbox para ampliar imagens geradas

Atualmente as imagens Story/Quadrado são miniaturas fixas (220px / 280px). Vou adicionar **clique para ampliar em fullscreen**:

- Usar o `Dialog` do shadcn (já no projeto) como lightbox.
- Estado `lightboxUrl: string | null`. Clique em qualquer imagem gerada abre.
- Modal full-viewport (max-w-[95vw], max-h-[90vh]), imagem com `object-contain`, fundo escuro, botão fechar e botão baixar dentro do modal.
- Cursor `zoom-in` nas miniaturas + ícone de lupa no hover.

## 3. Paridade visual Story ↔ Quadrado

**Diagnóstico:** as duas artes hoje são geradas em chamadas independentes ao Nano Banana, com prompts diferentes só pelo aspect ratio. O modelo não tem nenhuma referência visual da Story quando faz a Quadrada — por isso paleta, luz e tratamento divergem (Story azulada vs Quadrada lavada, no exemplo enviado).

**Solução:** quando o usuário clica em "Recriar em 1080x1080" e já existe a Story:

1. Enviar a **própria Story gerada como referência adicional** para a chamada da Quadrada (`referenceImages: [story, ...productImages]`).
2. Adicionar instrução no prompt da Quadrada:
   > `[VISUAL CONSISTENCY] The first attached image is the Story version of this same creative. The square version MUST replicate the EXACT same color palette, lighting, photographic treatment, typography choices and overall mood — only the framing/composition changes to fit a 1:1 square. Treat the Story as the visual ground truth.`
3. Deixar claro no prompt qual é a Story (primeira) vs produto/logo (depois) — atualizar o `refsHint` em `criativo-generate/index.ts` para suportar uma `storyReference?: string` opcional rotulada explicitamente.

Mudanças:
- `supabase/functions/criativo-generate/index.ts`: aceitar campo `storyReference?: string`; se presente, anexar **antes** das outras refs e descrever seu papel no `refsHint`.
- `CriativoStudioPage.tsx > generate('square')`: passar `storyReference: storyImage`.
- `buildFinalPrompt('square')`: injetar bloco `[VISUAL CONSISTENCY]`.

## 4. Mobile UI mais compacta e harmônica

A página hoje tem padding `p-4` em mobile, cards densos, e os blocos de análise/copy ficam apertados (uso a 390px de viewport).

Ajustes (apenas mobile, `< sm`):

- **Header**: reduzir `text-xl` → `text-lg` em mobile; subtítulo `text-[11px]`; botão "Recomeçar" vira ícone-only (`size="icon"`) com tooltip.
- **StepIndicator**: já é horizontal — encurtar labels em mobile (`Refs`, `Copy`, `Produto`, `Arte`) e diminuir gaps.
- **GlassCard**: padding interno reduzido em mobile (`p-3` ao invés do default).
- **Step 1**: grid de 8 dimensões já é `sm:grid-cols-2` (1 coluna em mobile, OK). Reduzir tamanho do `Textarea` do design system de `rows={8}` → `rows={6}` e usar `text-[10px]` em mobile.
- **Step 2**: as duas `CopyOptionCard` (Original vs IA) ficam em `grid-cols-1` em mobile (já está) — encolher padding `p-4` → `p-3` e fontes do `CopyBlock`.
- **Step 4 — preview das artes**: hoje as larguras são fixas (220px/280px). Em mobile vou usar `w-full max-w-[200px]` para Story e `max-w-[260px]` para Quadrado, **sempre lado a lado** quando ambas existem (`flex-row` mesmo em mobile, com `gap-3`), conforme já memorizado.
- **Botões de ação na Step 4**: empilhar full-width em mobile (`w-full sm:w-auto`).
- **Inputs/Selects**: `text-sm` → `text-[13px]` em mobile.

## Arquivos afetados

- `src/pages/CriativoStudioPage.tsx` — auto-contexto, lightbox, storyReference no generate, refinos mobile.
- `supabase/functions/criativo-generate/index.ts` — suporte a `storyReference` rotulado.
- `supabase/functions/criativo-business-context/index.ts` — **novo**, gera contexto via Lovable AI.
- `src/components/criativo/StepIndicator.tsx` — labels curtos em mobile.

## Fora de escopo

- Step 3 (uploads), análise da Step 1 e edge `criativo-improve-copy` ficam como estão.
- Sem mudanças no banco / RLS / auth.
- Sem trocar modelo de geração (segue Nano Banana Pro / 2).

## Por que isso resolve

- Contexto auto-gerado tira fricção e fica coerente com o resto do briefing.
- Lightbox dá ao usuário a inspeção que ele precisa antes de baixar.
- Passar a Story como referência da Quadrada é o jeito nativo do Nano Banana garantir consistência cromática (ele aceita imagens de referência, e respeita instruções textuais fortes para "manter cor/luz idênticas").
- Ajustes de mobile alinham com a regra de UI compacta já memorizada para o WAVY Dash.
