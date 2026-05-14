# Plano: Conexão direta com Google Gemini Image API (Nano Banana)

Substituir o OpenAI `gpt-image-1` por chamada direta à **Google Generative Language API** (não Lovable AI Gateway, não Vertex), usando uma `GEMINI_API_KEY` própria.

## 1. Secret

Adicionar `GEMINI_API_KEY` (Google AI Studio → aistudio.google.com/apikey).

## 2. Edge function `criativo-generate` — reescrita

Endpoint direto:
```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}
```

Aceitar no body um campo novo `model` (string) e validar contra whitelist:
- `gemini-2.5-flash-image` (Nano Banana — padrão rápido/barato)
- `gemini-3-pro-image-preview` (Nano Banana Pro — máxima qualidade)
- `gemini-3.1-flash-image-preview` (Nano Banana 2 — recomendado, rápido + qualidade Pro)

Default: `gemini-3.1-flash-image-preview`.

**Payload Gemini** (`generateContent`):
- `contents[0].parts`:
  - texto: prompt
  - para cada referência (productImages, logoImage, storyReference): `{ inline_data: { mime_type, data: base64 } }` — converter as `data:` URLs atuais.
- `generationConfig.responseModalities: ["IMAGE"]`
- Aspect ratio: Gemini não tem `size` igual ao OpenAI; aplicar via prompt (`"vertical 9:16 story format"` / `"square 1:1"`) e remover o conceito de `quality` (Gemini não usa low/medium/high).

**Resposta**: extrair `candidates[0].content.parts[].inline_data.data` (base64) → devolver `imageUrl: data:image/png;base64,...` (mesmo contrato atual, frontend não muda).

**Erros**: mapear 401 (key inválida), 429 (rate), 403 (quota), demais → 502 com mensagem clara.

## 3. Frontend `CriativoStudioPage.tsx`

- Adicionar select de modelo (3 opções acima) próximo aos controles de aspect ratio/qualidade.
- Remover/ocultar o seletor de **qualidade** (low/medium/high) — não se aplica ao Gemini. Manter aspect ratio (story/square).
- Enviar `model` no body de `criativo-generate`.

## 4. Tracker de custo `aiUsageTracker.ts`

Adicionar tipos:
- `image-gemini-flash` (~$0.039)
- `image-gemini-pro` (~$0.134)
- `image-gemini-flash-2` (~$0.039)

Remover/depreciar os `image-openai-*` das chamadas novas (manter os tipos para histórico).

## 5. Não mexer

- `criativo-analyze-refs` continua no Lovable AI Gateway (Gemini 2.5 Pro para análise de texto/visão) — está funcionando.
- `OPENAI_API_KEY` permanece como secret (não remover; outros fluxos podem usar).

## Validação

1. Gerar imagem sem refs → vem PNG válido.
2. Gerar com produto + logo → Gemini respeita refs (forte do Nano Banana).
3. Trocar modelo no select → request muda o path do endpoint.
4. Story vs Square → prompt incorpora a instrução de formato.

Após aprovar, peço a `GEMINI_API_KEY` via secret e implemento.
