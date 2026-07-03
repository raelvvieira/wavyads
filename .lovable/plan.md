## Diagnóstico

A transcrição de Reels parou de funcionar porque o actor `invideoiq~video-transcriber` (Apify) alterou o formato de saída, e a edge function `social-extract-copy` não consegue mais localizar o texto.

Evidências coletadas:

- Chamando `/social-extract-copy` com qualquer Reel (inclusive o URL exemplo do próprio README do actor, `C_L9MBOvb3q`) devolve:
  ```
  { "transcricao": "sem_fala_detectada", "usage": { "transcribe_calls": 1 } }
  ```
  Ou seja: o actor está rodando (attempt = 1), mas `extractTranscript()` devolve string vazia e o código marca como "sem fala".
- README/schema atual do actor (build default `0.0.24`, modificado em 17/03/2026) documenta o novo formato de item do dataset:
  ```json
  {
    "status": "success",
    "data": {
      "video_info": { ... },
      "transcript": [ { "text": "...", "start": 0.0, "end": 1.5 } ]
    }
  }
  ```
  A função hoje até tenta ler `result?.data?.transcript`, mas não considera casos de erro (`status: "error"`) nem o formato de segmentos exato — e, como não há logs de nenhuma tentativa, não conseguimos ver o payload real vindo do Apify para confirmar.
- Logs recentes de `social-extract-copy` mostram apenas `booted` — nenhum `console.log` de payload nem de erro. Não dá para saber se o actor está devolvendo `status:"error"`, um wrapper novo, ou 0 itens sem instrumentar.

## O que fazer

Mudanças apenas em `supabase/functions/social-extract-copy/index.ts` (nenhuma mudança de frontend, schema ou outras funções).

### 1. Instrumentar `transcribeReel`
- Logar, para cada tentativa: URL usada, HTTP status, tamanho do array `results`, e (quando `results[0]` existir) as chaves de topo + `status`/`error` do item. Isso dá visibilidade imediata do novo formato real.

### 2. Ampliar `extractTranscript` para o schema atual do actor
- Aceitar explicitamente o formato documentado:
  - `result.data.transcript` (array de `{text,start,end}`) → juntar `text` na ordem.
  - `result.data.video_info` presente confirma o novo wrapper.
- Manter os fallbacks antigos (`result.transcript`, `result.output.transcript`, `result.text`, string direta) para não regredir.
- Tratar itens onde `result.status === "error"` como "erro do actor" (não como "sem fala"): retornar string vazia mas sinalizar no status.

### 3. Diferenciar os estados finais retornados ao frontend
- Atual: `status.transcricao` só tem `ok` | `sem_fala_detectada` | `erro_config`.
- Adicionar `erro_actor` (quando o actor retornou item com `status:"error"` ou HTTP não-2xx em todas as tentativas). O front (`CopyExtractionStep`) já exibe o valor do status como badge; nenhum ajuste de UI é necessário — o novo texto simplesmente aparece.

### 4. Validar
- Após deploy, chamar `/social-extract-copy` com um Reel público conhecido (ex.: `C_L9MBOvb3q`) via `supabase--curl_edge_functions` e conferir:
  - `transcricao` não vazio, ou
  - `status.transcricao` = `erro_actor` com logs claros do motivo (crédito Apify, URL bloqueada, etc.).
- Ler `edge_function_logs` para confirmar o payload real e ajustar o parser caso ainda haja um wrapper não previsto.

## Fora de escopo
- Trocar de actor (ex.: `tictechid/anoxvanzi-Transcriber`) — só se o `invideoiq` estiver com falha persistente após o fix.
- Mudanças em OCR/carrossel/legenda.
- Mudanças no `apify-scrape` ou no fluxo do Social Mídia Studio no frontend.
