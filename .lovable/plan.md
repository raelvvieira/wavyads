# Migração da geração de imagens para OpenAI gpt-image-2

## 1. Secret
Verificar `OPENAI_API_KEY` em Edge Functions → Secrets. Se ausente, solicitar via `add_secret` antes de implementar.

## 2. UI — seletor de qualidade (Step 4)

`src/pages/CriativoStudioPage.tsx`:
- Novo estado: `const [quality, setQuality] = useState<'low'|'medium'|'high'>('medium')`.
- Bloco de 3 botões (toggle group) logo acima dos botões "Gerar Story / Quadrado", dentro do `GlassCard` da Step 4:
  - **Low** — "Rascunho rápido e barato"
  - **Medium** — "Equilíbrio ideal para anúncios" (default)
  - **High** — "Máxima qualidade para campanhas premium"
- Estilo: botões pill com estado ativo destacado em accent verde (segue Apple Glass do projeto). Aparece **só** para a arte principal — não afeta o Fator Criativo.
- `generate(aspect)` passa `quality` no body. `applyFatorCriativo` **não** passa (edge function força `medium`).
- Remover seletor de modelo (`IMAGE_MODELS`, `model`, dropdown Nano Banana Pro/2) — não há mais escolha de modelo.
- Atualizar `aiUsageTracker`: substituir `image-nano-2` / `image-nano-pro` por `image-openai-low`, `image-openai-medium`, `image-openai-high` com custos correspondentes (~$0.011 / $0.042 / $0.167 por 1024). Trocar as 3 chamadas `recordAiUsage(...)` no `CriativoStudioPage` para usar a qualidade efetiva.

## 3. Edge function `criativo-generate`

Reescrita completa (`supabase/functions/criativo-generate/index.ts`):
- Body novo: `{ prompt, aspectRatio: 'story'|'square', quality?: 'low'|'medium'|'high', isVariation?: boolean }`.
- `size`: `story` → `1024x1536`; `square` → `1024x1024`.
- `quality` final: `isVariation ? 'medium' : (quality ?? 'medium')`.
- Chamada exata conforme spec do usuário a `https://api.openai.com/v1/images/generations` com `model: "gpt-image-2"`, header `Authorization: Bearer ${OPENAI_API_KEY}`.
- Resposta: `data.data[0].url` (segue spec do usuário). Se vier `b64_json`, converter para `data:image/png;base64,...`.
- CORS preservado; tratamento 401/429/insufficient_quota com mensagens em PT.
- Remover toda referência a `LOVABLE_API_KEY`, `ai.gateway.lovable.dev`, `modelId`, blocos de `[ATTACHED REFERENCE IMAGES — ROLES]` e o array `userContent` com `image_url`.

## 4. Fator Criativo

`supabase/functions/criativo-fator/index.ts` continua usando `LOVABLE_API_KEY` (Gemini) — é geração **de texto** (estratégia + prompts). O usuário pediu remoção do Lovable AI **para imagens**, não para texto. No frontend, `applyFatorCriativo` chama `criativo-generate` com `isVariation: true` e **sem** `quality`.

## 5. Arquivos afetados

- `supabase/functions/criativo-generate/index.ts` — reescrita
- `src/pages/CriativoStudioPage.tsx` — seletor qualidade, remover seletor de modelo, body novo
- `src/lib/aiUsageTracker.ts` — novos tipos de uso openai-low/medium/high

## 6. ⚠️ Pontos de atenção (preciso confirmação antes de implementar)

a. **`gpt-image-2` ainda não é um modelo público da OpenAI** (atualmente o modelo é `gpt-image-1`). A chamada vai falhar com 404 "model not found" até a OpenAI lançar. Você quer que eu use `gpt-image-2` literal (como spec) ou caia para `gpt-image-1` se 2 não existir?

b. **Perda de referências visuais:** o endpoint `/v1/images/generations` da OpenAI **não aceita imagens de referência** (produto, logo, Story já gerada para consistência cromática). Hoje o Nano Banana usa essas refs como ground truth — é o que mantém rosto do produto, logo intacto e Story↔Quadrado coerentes. Opções:
   - **(A)** Ignorar refs — qualidade visual cai bastante para criativos com produto/pessoa/logo.
   - **(B)** Usar `/v1/images/edits` (multipart com até 16 imagens de input) quando houver `productImages`/`logoImage`/`storyReference`, e cair para `/generations` só quando não houver nenhuma ref. Recomendo essa.
   
   Qual prefere?
