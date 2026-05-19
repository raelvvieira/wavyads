# Ajustes no Social Mídia Studio

## 1. Thumbnails do Instagram quebrando

O Instagram bloqueia hotlink quando o navegador envia `Referer`. Solução em duas camadas:

- **Camada rápida (frontend)**: adicionar `referrerPolicy="no-referrer"` e `crossOrigin="anonymous"` nas `<img>` que renderizam `post.thumbnail` em `ViralResultsList.tsx` e `CopyExtractionStep.tsx`. Resolve a maioria dos casos.
- **Fallback (edge function)**: criar `supabase/functions/image-proxy/index.ts` que recebe `?url=` e devolve os bytes da imagem com `Cache-Control` longo. Usar essa rota como `src` quando a imagem original falhar (handler `onError` troca para o proxy). Garante que carrosséis/posts antigos também apareçam.

## 2. Pular a etapa de Pesquisa

Em `ResearchStep.tsx`, adicionar um botão secundário "Pular pesquisa" ao lado de "Iniciar Pesquisa" (estado pré-pesquisa). Ao clicar:

- chama `onApprove(briefingFallback, tema)` onde `briefingFallback` = `copyReferencia` (copy consolidada já extraída) ou, se vazia, um briefing mínimo `Tema: {tema}\n\nReferência: legenda do post viral`.
- Atualizar `SocialMidiaStudioPage.tsx` para tratar `briefing_texto` vazio sem quebrar (já passa por `etapa_atual === 2 && tema && briefing` — basta o fallback nunca ser vazio).
- Mostrar um aviso visual quando o usuário entra na etapa 3 sem pesquisa real ("Pulado pesquisa — usando só a copy de referência").

## 3. Contabilizar todos os custos de API

Hoje `recordAiUsage` (em `src/lib/aiUsageTracker.ts`) só cobre Criativo Studio. Expandir para cobrir o pipeline Social Mídia:

- **Novos tipos** em `AiUsageType` + `COST_USD` + `TOKENS_EST`:
  - `text-claude-sonnet` (geração de copy / rewrite) — custo estimado por chamada
  - `text-claude-websearch` (pesquisa em `social-research`) — custo + tool calls
  - `apify-scrape` (busca de virais) — preço fixo médio por run
  - `apify-transcribe` (reels) — preço por minuto/run
  - `vision-ocr` (Google Vision) — por imagem
- **Onde chamar `recordAiUsage`** (sempre no frontend após `supabase.functions.invoke` bem-sucedido):
  - `useViralScraper.search` → `apify-scrape`
  - `CopyExtractionStep.extract` → `apify-transcribe` (1x se reel) e/ou `vision-ocr` (Nx slides). Para saber a quantidade, a edge `social-extract-copy` precisa devolver no JSON contadores: `usage: { transcribe_calls, ocr_calls }`. Atualizar a função para retornar isso.
  - `ResearchStep.run` → `text-claude-websearch`
  - `FormatStep` (chamadas a `social-copy`) → `text-claude-sonnet` por geração e por rewrite
  - `ImageStep` / `ReelFinalStep` (já chamam `social-image-gen`) → reaproveitar tipos `image-gemini-*` ou `image-openai-*` existentes conforme o modelo escolhido
- A `useAiUsage` já agrega tudo em `ai_usage_events` (mensal, todos admins). Nada muda no contador exibido — só passa a refletir o consumo real do Social Mídia.

## Arquivos afetados

- `src/components/social/ViralResultsList.tsx` — referrer policy + fallback proxy
- `src/components/social/CopyExtractionStep.tsx` — referrer policy + métricas
- `src/components/social/ResearchStep.tsx` — botão "Pular pesquisa" + tracking
- `src/components/social/FormatStep.tsx` — tracking após `social-copy`
- `src/components/social/ImageStep.tsx` / `ReelFinalStep.tsx` — tracking após image gen
- `src/hooks/useViralScraper.ts` — tracking após scrape
- `src/lib/aiUsageTracker.ts` — novos tipos + custos
- `src/pages/SocialMidiaStudioPage.tsx` — aviso "pesquisa pulada"
- `supabase/functions/social-extract-copy/index.ts` — devolver `usage` (contadores)
- `supabase/functions/image-proxy/index.ts` — novo, proxy de imagem com cache

## Observação sobre custos

Os valores em USD para Claude Sonnet, Apify e Vision são estimativas médias por chamada (Sonnet ~$0.015/req, Apify scrape ~$0.01/run, transcribe ~$0.03/reel, Vision ~$0.0015/imagem). Se quiser, posso usar outros valores fixos — me diga antes de implementar.
