## Atualizar Scraper — Extração de Copy do Post Selecionado

Inspirado no agente Python v6, adicionar uma nova **etapa de extração de copy** entre o Scraper (Etapa 1) e a Pesquisa (Etapa 2). Quando o usuário escolher um post no scraper, em vez de avançar direto, abre um painel de extração mostrando legenda + transcrição (reel) ou OCR (post/carrossel) consolidados, editáveis e confirmáveis.

### Fluxo UX

1. Usuário clica num card de resultado no Scraper → em vez de avançar imediatamente para Pesquisa, o app dispara `social-extract-copy` com o post bruto.
2. Renderiza `<CopyExtractionStep>` (substituindo a grid de resultados temporariamente):
   - **Cabeçalho**: thumb do post + autor + tipo + métricas.
   - **Loading state**: "🔍 Extraindo copy do post… (transcrevendo áudio / lendo imagem com OCR)".
   - **Resultado**:
     - Para **Reel** → bloco "Transcrição" + bloco "Legenda" + textarea "Copy consolidada (editável)".
     - Para **Carrossel** → lista de slides com OCR slide a slide + bloco "Legenda" + textarea "Copy consolidada".
     - Para **Post estático** → bloco "Texto na imagem (OCR)" + bloco "Legenda" + textarea "Copy consolidada".
   - Cada bloco mostra status (`✅ ok`, `⚠️ sem texto detectado`, `❌ erro`).
   - Botões: **🔄 Re-extrair** · **← Voltar** · **✅ Usar esta copy →** (avança para Pesquisa).
3. Ao confirmar, salva no pipeline e segue para `ResearchStep`. O tema sugerido vira o primeiro hashtag ou as primeiras 12 palavras da copy consolidada (igual à derivação atual).

### Estado global (pipeline)

```ts
pipeline.post_viral = ViralPost                          // já existe
pipeline.post_copy = {
  tipo: "reel" | "carrossel" | "post_estatico",
  transcricao?: string,
  texto_visual?: string,                                  // OCR post único
  slides?: { slide: number; texto: string; status: string }[],
  legenda: string,
  hashtags: string[],
  copy_consolidada: string,                               // editável pelo usuário
  status: { legenda: string; transcricao?: string; ocr?: string }
}
pipeline.tema = derivado de copy_consolidada ou hashtag
```

A copy consolidada aprovada é injetada como **contexto extra** no `ResearchStep` (passada para `social-research` como `copy_referencia`) e fica disponível mais tarde para a Etapa 3 (Copy) como inspiração de tom/estrutura.

### Edge function nova: `social-extract-copy`

Recebe o **post bruto** retornado pelo Apify (não a versão normalizada). Para isso, ajustar `apify-scrape` para devolver também `raw` lado a lado com `items`, para que o front consiga reenviar o item bruto na extração.

Lógica baseada no Python v6:

- `extractCopy(item)`:
  - Detecta tipo via `type`/`productType` (`video`/`reel` → reel; `sidecar`/`carousel` → carrossel; senão → post estático).
- **Reel**: chama actor Apify `invideoiq/video-transcriber` com `video_urls: ["https://www.instagram.com/p/{shortCode}/"]`. Lê `result.transcript[].text`. Fallback para legenda se vazio.
- **Carrossel**: para cada `childPosts[].displayUrl`, chama Google Vision `images:annotate` (TEXT_DETECTION) via download da imagem + base64. Concatena `[Slide N] texto`.
- **Post estático**: OCR de `displayUrl` com Google Vision.
- Retorna o objeto completo de copy + `copy_consolidada` ("\n\n" join).

Timeouts amplos (até 5min para transcrição) — usar `run-sync-get-dataset-items` com `timeout=300`.

### Secrets necessários

- `APIFY_TOKEN` — já configurado ✅
- `GOOGLE_VISION_API_KEY` — **novo, usuário precisa adicionar** (será solicitado no início da implementação)

Se `GOOGLE_VISION_API_KEY` estiver ausente, a extração de OCR é pulada graciosamente e os blocos visuais ficam com status `⚠️ OCR desabilitado (faltando GOOGLE_VISION_API_KEY)`. A transcrição de reel continua funcionando só com Apify.

### Mudanças em `apify-scrape`

- Retornar `{ items, raw }` em vez de só `items`, onde `raw[i]` corresponde a `items[i]` (mesma ordem). O front guarda `raw[i]` junto do card para reenviar na extração.
- Manter compatibilidade: front passa a usar `raw` quando disponível.

### Componentes novos / editados

Novos:
- `src/components/social/CopyExtractionStep.tsx` — loading + render dos blocos + textarea editável + confirmar/voltar.
- `supabase/functions/social-extract-copy/index.ts` — orquestração de transcrição (Apify) + OCR (Vision).

Editar:
- `src/hooks/useViralScraper.ts` — armazenar `raw` por item; expor método `getRaw(id)`.
- `supabase/functions/apify-scrape/index.ts` — retornar `raw` paralelo.
- `src/pages/SocialMidiaStudioPage.tsx` — estado intermediário entre etapa 0 (scraper) e 1 (pesquisa): ao escolher post, renderizar `<CopyExtractionStep>` antes de marcar `etapa_atual = 1`. Salvar `post_copy` no pipeline. Adicionar campo ao tipo `Pipeline`.
- `src/components/social/ResearchStep.tsx` — aceitar `copyReferencia?: string` e enviar para edge `social-research` como contexto extra no prompt ("Considere essa copy de referência: …").
- `supabase/functions/social-research/index.ts` — opcionalmente injetar `copy_referencia` no user prompt quando presente.

### Pontos abertos

- Confirma adicionar a secret `GOOGLE_VISION_API_KEY`? Sem ela, só reels (transcrição) terão copy extraída automaticamente.
- A transcrição via `invideoiq/video-transcriber` é paga no Apify e pode levar até alguns minutos — está OK?
