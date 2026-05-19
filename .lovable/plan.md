# Plano · Etapa 4 (Imagens) — Inteligência multi-fonte + Gemini direto

## Objetivo

Reduzir custos da etapa de imagens trocando o gateway da Lovable AI pela API Gemini direta (mesma do **Criativo Studio**) e adicionando uma pipeline inteligente que prioriza **fotos reais** (Google Images, Pexels, Freepik Stock) e **só gera com IA quando necessário**.

## Mudanças

### 1. Nova edge function: `social-image-search`

Orquestrador que recebe um slide e retorna `{ url, fonte, tipo_visual, ok, usage }`.

**Fluxo (porta do agente v3.1):**

```text
classificar_tipo_visual(titulo, corpo, prompt)
   │
   ├── pessoa   → Google Images (keynote/event) → Google ampla → IA Gemini
   ├── empresa  → Google Images (sede/screenshot) → Google ampla → IA Gemini
   ├── hardware → Google Images (press kit) → Google product → sem imagem
   ├── diagrama → Google Images (diagrama oficial) → sem imagem
   └── ambiente → Pexels (lifestyle) → Google → IA Gemini
```

Inclui:
- `BRAND_ICONS`, `HARDWARE_KEYWORDS`, `DIAGRAMA_KEYWORDS`, `LIFESTYLE_QUERIES`
- `DOMINIOS_REJEITADOS` (Shutterstock/Getty/iStock etc.) e listas preferenciais (TECH/NEGOCIOS/IMPRENSA/HARDWARE/LIFESTYLE)
- `selecionar_melhor_resultado`: filtra resolução ≥ 800px, rejeita stock pago, prioriza domínio editorial e orientação portrait para cover
- Google Images via Apify actor `hooli/google-images-scraper` (token `APIFY_TOKEN` já existe)
- Pexels via `PEXELS_API_KEY` (será solicitado caso o usuário queira ativar — opcional, sem ele cai direto para Google)
- Freepik Stock via `FREEPIK_API_KEY` (já existe) como fallback adicional para ambiente
- Retorna `usage`: contagem de `{ apify_calls, pexels_calls, freepik_stock_calls, gemini_calls }`

Retorno final faz upload da imagem (quando vier de fonte externa, baixa e re-hospeda no bucket `social-media` para evitar hotlink quebrado).

### 2. Geração com IA — trocar gateway pela API Gemini direta

Refatorar `social-image-gen`:
- Remover chamada para `ai.gateway.lovable.dev` (LOVABLE_API_KEY)
- Usar `GEMINI_API_KEY` chamando `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (mesma chamada do `criativo-generate`)
- Modelo padrão: `gemini-3.1-flash-image-preview` (mais barato; já é o default do Criativo)
- Manter o upload para `social-media` bucket
- Enriquecer prompt no estilo `enriquecer_prompt_freepik` do agente v3.1 (cinematic editorial, dramatic lighting)

### 3. Frontend — `ImageStep.tsx` e `SlideImageCard.tsx`

- O botão **"Gerar imagens de todos os slides"** passa a chamar `social-image-search` em vez de `social-image-gen` direto.
- O card mostra o badge da `fonte` retornada (Google, Pexels, Freepik, IA Gemini, sem imagem) com cores distintas.
- Botão **"Regerar com IA"** (RotateCw) continua chamando `social-image-gen` (rota de geração explícita).
- Quando `fonte = "sem_imagem"`, mostrar CTA para abrir Freepik manual ou upload.

### 4. Tracking de custos

Adicionar em `src/lib/aiUsageTracker.ts`:
- `apify-google-images` (~$0.005/query)
- `pexels-search` ($0 — free tier, mas contabilizado como request)
- `freepik-stock-search` (~$0.002)

`ImageStep` lê `data.usage` retornado pelo `social-image-search` e chama `recordAiUsage` para cada fonte usada. Geração IA continua contando como `image-gemini-pro`.

## Detalhes técnicos

**Arquivos novos:**
- `supabase/functions/social-image-search/index.ts`

**Arquivos editados:**
- `supabase/functions/social-image-gen/index.ts` — trocar gateway → Gemini direto
- `supabase/config.toml` — adicionar bloco `[functions.social-image-search]` (verify_jwt default)
- `src/components/social/ImageStep.tsx` — usar `social-image-search` no botão "gerar todos", tracking por fonte
- `src/components/social/SlideImageCard.tsx` — badge dinâmico de fonte, separar "buscar foto real" vs "gerar IA"
- `src/types/social.ts` — adicionar `fonte` e `tipo_visual` em `SlideImagem`
- `src/lib/aiUsageTracker.ts` — novos tipos de uso

**Secrets:**
- `GEMINI_API_KEY` ✅ já existe
- `APIFY_TOKEN` ✅ já existe
- `FREEPIK_API_KEY` ✅ já existe
- `PEXELS_API_KEY` ❌ — opcional. Sem ela o fluxo `ambiente` pula direto para Google Images. Pergunto se o usuário quer adicionar.

## Pergunta antes de implementar

1. **Pexels**: ativar? (custo zero, melhora muito o tipo `ambiente`). Se sim, peço a chave depois.
2. **Modelo Gemini para IA**: confirma `gemini-3.1-flash-image-preview` (mais barato) ou prefere `gemini-3-pro-image-preview` (mesma qualidade do Criativo Studio quando o usuário escolhe "pro")?
