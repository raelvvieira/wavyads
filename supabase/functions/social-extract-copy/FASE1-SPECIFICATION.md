# FASE 1 — Extração de Copy — ESPECIFICAÇÃO CONGELADA

**Status:** 🔒 CONGELADO — Não alterar sem validação explícita
**Data:** 2026-06-30
**Funcionalidade:** Transcreve áudio de reels e extrai texto de posts do Instagram

---

## ✅ O que funciona (NÃO MEXER)

### 1. Detecção de tipo
Identifica corretamente se é:
- **Reel** (vídeo) → transcreve áudio
- **Carrossel** (múltiplas slides) → extrai texto de CADA slide
- **Post estático** (imagem única) → extrai texto da imagem

### 2. Transcrição de Reel
- Usa **Apify video-transcriber** (`invideoiq~video-transcriber`)
- Tenta até 4 URLs diferentes do post
- Retorna transcrição completa ou status `sem_fala_detectada` / `erro_actor`

### 3. OCR de Imagens
- Usa **Google Vision API** com `TEXT_DETECTION`
- Extrai texto de cada slide (carrossel) ou imagem (post único)
- Agrupa por slide: `[Slide 1] texto...`

### 4. Consolidação
Junta tudo em ordem:
1. Transcrição (se reel)
2. Texto visual (se post/carrossel)
3. Legenda (sempre que existir)
4. Resultado final = `copy_consolidada`

### 5. Status granular
Retorna status de cada fonte:
- `legenda`: "ok" ou "ausente"
- `transcricao`: "ok" / "sem_fala_detectada" / "erro_actor" / "erro_config"
- `ocr`: "ok" / "sem_texto_detectado" / "ocr_desabilitado" / "ausente"

---

## 📥 Entrada esperada

```json
{
  "item": {
    "type": "VIDEO" ou "SIDECAR" ou "IMAGE",
    "caption": "texto da legenda...",
    "hashtags": ["tag1", "tag2"],
    "url": "https://instagram.com/reel/ABC123/",
    "shortCode": "ABC123",
    "displayUrl": "https://...",
    "videoUrl": "https://... (para reels)",
    "childPosts": [...] (para carrosséis)
  }
}
```

---

## 📤 Saída esperada

```json
{
  "tipo": "reel" | "carrossel" | "post_estatico",
  "transcricao": "texto completo do áudio... (se reel)",
  "texto_visual": "texto extraído da imagem... (se post/carrossel)",
  "slides": [
    { "slide": 1, "texto": "...", "status": "ok" },
    { "slide": 2, "texto": "...", "status": "ok" }
  ],
  "legenda": "legenda original do post...",
  "hashtags": ["tag1", "tag2"],
  "copy_consolidada": "TRANSCRIÇÃO\n\nLEGENDA\n\nHASHTAGS (compiladas)",
  "status": {
    "legenda": "ok" | "ausente",
    "transcricao": "ok" | "sem_fala_detectada" | "erro_actor" | "erro_config",
    "ocr": "ok" | "sem_texto_detectado" | "ocr_desabilitado" | "ausente"
  },
  "usage": {
    "transcribe_calls": 0-4,
    "ocr_calls": 0-N
  }
}
```

---

## 🚫 NUNCA mude

- ❌ Tipo de detecção (se detecta reel, carrossel, post)
- ❌ Ordem de consolidação de copy (transcrição → visual → legenda)
- ❌ Estrutura do JSON de resposta
- ❌ Status codes
- ❌ Fallbacks de transcricão (4 tentativas com URLs diferentes)

---

## ✏️ OK mexer em (com validação)

- ✅ Limite de timeout
- ✅ Mensagens de erro
- ✅ Tratamento de edge cases não mencionados
- ✅ Otimização de performance (se não mudar saída)

**Mas SEMPRE rodar os testes antes de enviar para produção.**

---

## 🔬 Como validar

Rodar: `npm run test:fase1-extract`

Deve passar em todos os casos:
1. Reel com áudio ✅
2. Carrossel com 3 slides ✅
3. Post único com imagem ✅
4. Post sem legenda ✅
5. Reel sem áudio detectado ✅
