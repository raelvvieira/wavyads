# Plano — Fator Criativo (5 variações estratégicas)

## Visão geral

Adicionar, ao final da Step 4 do Criativo Studio, um botão **"Aplicar Fator Criativo"** (branco, com efeito de brilho/shimmer). Ao clicar, geramos **5 novos criativos** estratégicos, exibidos lado a lado com os já criados (Story / Quadrado), seguindo a lógica da skill `FATOR-CRIATIVO.md`:

- Cada variação muda **um eixo** diferente (ângulo emocional, frame de oferta, persona, hook visual, estrutura de copy)
- Cada variação tem **copy nova + prompt visual novo**, mas mantém o **DNA visual da marca** (paleta, tipografia, logo, safe zones)
- Renderizadas no mesmo formato que a arte original (Story 9:16 ou Quadrado 1:1 — usa o que já existe; se ambos existem, segue o Story)

## 1. Nova edge function `criativo-fator`

`supabase/functions/criativo-fator/index.ts`

Responsável por **gerar os 5 pacotes estratégicos** (copy + prompt) via Lovable AI Gateway.

- Modelo: `google/gemini-3-flash-preview` (texto, rápido e barato)
- Recebe:
  - `originalPrompt` (string) — o `buildFinalPrompt(aspect)` exato usado para gerar a arte original
  - `analysis` — design system + mood (para referência de DNA visual)
  - `copyApproved` — copy aprovada (label/título/subtítulo/dados/CTA + idioma)
  - `businessContext` — contexto do negócio
  - `aspect` — `'story' | 'square'`
- Usa **tool calling** (estruturado) com schema:
  ```
  variations: [{
    eixo: 'emocional'|'oferta'|'persona'|'hook'|'estrutura',
    nome: string,
    estrategia: { mudanca: string, paraQuem: string },
    copy: { label, titulo, subtitulo, dados, cta },
    descricaoVisual: { hook, composicao, tom, diferenca },
    promptCompleto: string  // prompt pronto para o Nano Banana, mantendo design system, safe zones, logo, idioma
  }]  // length === 5
  ```
- System prompt incorpora a skill `FATOR-CRIATIVO.md` (texto integral inline) + instrução de "preservar o DNA visual" e regenerar os blocos `[INTRODUCTION]`, `[TEXT BLOCKS]`, `[MOOD]` adaptados ao novo eixo, mantendo `[DESIGN SYSTEM]`, `[SAFE ZONE]`, `[BRAND LOGO]`, `[DO NOT INCLUDE]` intactos.
- Retorna `{ variations: [...] }`.

## 2. Geração das 5 imagens

Após receber as 5 variações, no frontend chamamos a edge function existente `criativo-generate` **5 vezes em paralelo** (`Promise.all`), uma por variação:
- `model` = mesmo modelo selecionado pelo usuário (Nano Banana Pro / 2)
- `prompt` = `variation.promptCompleto`
- `aspectRatio` = mesmo da arte original já gerada (`storyImage ? 'story' : 'square'`)
- `referenceImages` = `productImages`
- `logoImage` = `logoImage[0] || null`
- `storyReference` = `storyImage` (a Story já gerada serve de **ground truth visual** para garantir consistência cromática nas 5 — reutiliza o mecanismo existente)

Estado novo no `CriativoStudioPage`:
```ts
const [factorVariations, setFactorVariations] = useState<FactorVariation[] | null>(null);
const [factorImages, setFactorImages] = useState<(string|null)[]>([]);
const [factorLoading, setFactorLoading] = useState(false);
const [factorProgress, setFactorProgress] = useState(0); // 0..5
```

Fluxo: ao clicar no botão →
1. `factorLoading = true`, toast "Analisando criativo original e gerando 5 variações estratégicas..."
2. Chama `criativo-fator` → recebe as 5 estratégias + prompts
3. Inicializa `factorImages` com 5 `null`
4. Dispara as 5 chamadas `criativo-generate` em paralelo, atualizando `factorImages[i]` à medida que cada uma volta (e incrementando `factorProgress`)
5. Toast final "5 variações prontas"

Erros individuais (uma das 5 falha) não derrubam as outras — apenas marca aquele card como "Erro, regenerar".

## 3. UI — Botão e galeria das 5 variações

### Botão "Aplicar Fator Criativo"

Posicionado logo abaixo da galeria atual (Story + Quadrado), dentro do mesmo `GlassCard` da Step 4.

- Aparece **somente quando** `storyImage || squareImage` existe (faz sentido só após ter o original)
- Estilo: **fundo branco**, texto preto, com efeito de **shimmer/brilho** animado (gradiente conic ou linear-gradient deslizante via Tailwind `before:` + keyframes em `tailwind.config.ts`/`index.css`)
- Ícone `Sparkles` à esquerda
- Disabled enquanto `factorLoading`, mostrando spinner + "Gerando variação X de 5..."

Pseudo:
```tsx
<button className="relative overflow-hidden rounded-md bg-white text-black px-5 py-2.5 font-medium shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-shadow before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700">
  <Sparkles /> Aplicar Fator Criativo
</button>
```
Adicionar keyframes `shimmer` em `tailwind.config.ts` para um brilho contínuo sutil mesmo em idle (loop lento, opacidade baixa).

### Galeria das 5 variações

Renderizada **abaixo** das artes originais, em uma seção separada com título "Fator Criativo — 5 Variações Estratégicas":

- Grid responsivo: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`
- Cada card:
  - Thumbnail da imagem (clique → abre o `lightboxUrl` existente, reaproveitado)
  - Badge superior: nome do eixo (ex: "Ângulo Emocional", "Persona", "Hook Visual")
  - Linha curta com `estrategia.mudanca` (truncada, tooltip com texto completo)
  - Botão pequeno "Baixar" (reaproveita `download()`)
  - Skeleton/loading enquanto a respectiva imagem ainda não chegou
- Em mobile: thumbnails compactas (`w-full max-w-[160px]`), respeitando a regra de UI compacta já memorizada

## 4. Arquivos afetados

- `supabase/functions/criativo-fator/index.ts` — **novo** (geração das 5 estratégias via tool calling)
- `src/pages/CriativoStudioPage.tsx` — botão, estado, lógica de geração paralela, galeria das 5
- `tailwind.config.ts` ou `src/index.css` — keyframes `shimmer` para o efeito de brilho

## 5. Fora de escopo

- Não muda Steps 1–3, nem `criativo-analyze-refs`, `criativo-improve-copy`, `criativo-generate`, `criativo-business-context`
- Sem mudanças no banco / RLS / auth
- Sem persistir as variações (sessão only — igual ao Story/Quadrado de hoje)
- Sem regeneração individual de uma variação no v1 (só o conjunto inteiro). Adicionável depois.

## 6. Por que isso resolve

- A skill `FATOR-CRIATIVO.md` é declarativamente um **prompt de raciocínio estratégico**, perfeito para tool calling com Gemini Flash — gera os 5 pacotes coerentes de uma vez
- Reaproveita 100% da pipeline visual existente (`criativo-generate` + `storyReference` para consistência cromática) → as 5 saem visualmente coerentes com a original
- Botão branco com shimmer dá o peso de "ação especial" sem poluir a UI (segue Apple Glass + uso pontual de cor)
- Geração paralela mantém o tempo total próximo ao de uma única imagem (Nano Banana ~8–15s) ao invés de 5x sequencial
