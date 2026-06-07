## Objetivo

Reescrever completamente `supabase/functions/criativo-generate/index.ts` para usar GPT Image 2 via EvoLink com roteamento condicional entre dois endpoints, mantendo a interface de entrada/saída atual.

## Mudanças

### 1. Interface `GenerateBody`
Mantém todos os campos atuais e garante `quality?: "low" | "medium" | "high"`.

### 2. Helpers
- Manter `parseDataUrl` igual.
- Adicionar `fetchUrlToBase64` que faz fetch da URL retornada pelo EvoLink e converte para data URL `data:image/png;base64,...`.

### 3. Mapeamento de parâmetros
- `size`: `story` → `"2:3"`, `square` → `"1:1"`
- `resolution`: `low` → `"1K"`, `medium` → `"2K"`, `high` → `"4K"`
- `quality`: do body, default `"low"`
- `model`: sempre `"gpt-image-2"`
- `n`: 1

### 4. Montagem do prompt
```
{aspectInstruction}

{prompt}

{referenceHints?}
```
- `aspectInstruction` story/square conforme spec.
- `referenceHints` apenas se houver imagens de referência, com contagem total (`productImages` + `logoImage` + `storyReference`).

### 5. Roteamento
**Com imagens de referência** (`productImages.length > 0 || logoImage || storyReference`):
- `POST {BASE}/images/edits` com `multipart/form-data`
- FormData: `model`, `prompt`, `n`, `size`, `resolution`, `quality`
- Anexar imagens em `image[]` na ordem: productImages (até 14) → logoImage → storyReference (apenas no square)
- Cada imagem convertida via `parseDataUrl` → `Blob`

**Sem imagens**:
- `POST {BASE}/images/generations` com JSON
- Body: `{ model, prompt, n, size, resolution, quality, response_format: "b64_json" }`

### 6. Tratamento da resposta
- Ler `respText = await resp.text()` e logar `status` + primeiros 800 chars.
- Se `!resp.ok`: retornar erro 502 com `EvoLink erro {status}: {body}` (401 → "Chave inválida", 403 → "Permissão negada", 429 → "Limite atingido").
- Parsear JSON. Extrair `data[0].b64_json` ou `data[0].url`:
  - `b64_json` → `data:image/png;base64,{b64}`
  - `url` → fetch + converter para base64 data URL
  - Nenhum dos dois → erro "EvoLink não retornou imagem".
- Retornar `{ imageUrl, model: "gpt-image-2" }`.

### 7. Remoções
- Remover toda a lógica de polling assíncrono (tasks) — não é necessária com a estratégia correta de endpoints.
- Remover `MODEL_NAME` constante (usar literal).

### 8. Preservar
- CORS headers exatos.
- Validação `prompt && aspectRatio` obrigatórios.
- Estrutura de `try/catch` com retorno 500 genérico no catch final.

## Arquivo afetado
- `supabase/functions/criativo-generate/index.ts` (rewrite completo)

Nenhuma outra mudança no projeto (sem alterações no frontend ou outras edge functions).