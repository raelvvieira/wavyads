# Plano — Uso de IA persistente, edição de imagem por prompt, URL → copy sugerida

## 1. Contador "Uso de I.A" persistente (multi-usuário, admin-only)

Hoje o contador vive em `localStorage` (`aiUsageTracker.ts`) — por isso zera ao trocar de dispositivo/navegador e some quando o `localStorage` é limpo. Vamos migrar para o banco para que seja **um único acumulado por mês para toda a equipe**.

### Banco (migration)
Nova tabela `ai_usage_events`:
- `id uuid pk`, `created_at timestamptz default now()`
- `user_id uuid` (auth.uid, opcional, só pra auditoria)
- `usage_type text` (ex.: `text-flash`, `image-gemini-flash`, etc.)
- `count int default 1`
- `cost_usd numeric`, `tokens int`
- `month_key text generated always as (to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')) stored`
- Índice em `(month_key)`.

RLS:
- INSERT: qualquer `authenticated` (todo admin que dispara IA registra; já hoje só admins veem o Criativo Studio).
- SELECT: somente `has_role(auth.uid(),'admin')`.

### `src/lib/aiUsageTracker.ts`
- `recordAiUsage(type, count)` → `supabase.from('ai_usage_events').insert(...)` com `cost_usd`/`tokens` calculados pelas tabelas atuais. Fire-and-forget (não bloqueia UI).
- `useAiUsage()` → consulta agregada do mês atual:
  ```ts
  supabase.from('ai_usage_events')
    .select('count, cost_usd, tokens, usage_type')
    .eq('month_key', currentMonthKeySP)
  ```
  agrega no cliente (`reduce`) e expõe `{ costUsd, costBrl, tokens, totalCalls, monthLabel }`. Removemos `reset`, `cleanupOldMonths`, escrita em `localStorage` e o evento `ai-usage-changed`.
- Realtime opcional: assina `ai_usage_events` para atualizar o card sem reload.
- "Vira o mês" → como `month_key` muda, a query do mês corrente naturalmente retorna 0.

### `src/components/AppSidebar.tsx`
- Card mais fino e sem botão de reset:
  - Remover `RotateCcw` e o `<button>` de reset.
  - Reduzir padding (`p-3` → `p-2.5`), tirar a linha "X chamadas · $... USD" (mantém só mês, R$ e tokens em uma única linha enxuta).
  - Layout final (uma linha de label, uma de valor):
    ```
    USO DE I.A · MAI. DE 26
    R$ 0,00         0 tok
    ```

## 2. Etapa 4 — Editar imagem por prompt (lado-a-lado)

Funcionalidade aplicável tanto à arte principal quanto a cada arte do Fator (story e square).

### UI
Em cada arte renderizada (`renderArtCard` que já existe para Principal e variações de Fator), adicionar **abaixo dos botões existentes** ("Baixar", "Recriar em 1080x1080"):
- Botão `Editar com I.A` (ícone `Wand2`, variant ghost).
- Ao clicar, expande um pequeno painel inline com:
  - `<Textarea>` placeholder "Ex.: deixe o céu mais dramático, troque o CTA por 'Comece agora', remova o galho da esquerda…"
  - Botão verde **Aplicar edição** + botão `Cancelar`.
- Enquanto carrega: skeleton + loader.
- Quando a edição volta: a imagem editada é renderizada **em uma nova coluna ao lado** da original (mesmo grid já usado pelo Fator), com:
  - badge "EDITADA" no topo
  - botão `Baixar versão editada`
  - botão `Editar novamente` (gera v3, v4…)
  - botão `Descartar`
- Estado: novo array `editedVersions: Record<string, { url: string; feedback: string }[]>` chaveado por `'main' | 'story:i' | 'square:i' | 'square:main'`.

### Backend
Nova edge function `criativo-edit-image`:
- Input: `{ originalImage: dataUrl, userFeedback: string, originalPrompt: string, analysis, businessContext, aspect: 'story'|'square' }`.
- Passo A — **Prompt Builder (Gemini 2.5 Flash, texto)**: pega o `userFeedback` curto do usuário + o `originalPrompt` (o mesmo build usado na geração) e produz um **prompt de edição cirúrgica**. System prompt deixa claro:
  - aplicar **apenas** as mudanças pedidas
  - preservar enquadramento, identidade dos rostos, logo, paleta, tipografia, composição, qualidade
  - não re-renderizar áreas não mencionadas
  - manter aspect ratio do original
  - sem inventar copy/elementos não solicitados
- Passo B — **Image edit (Gemini image)**: chama `gemini-3.1-flash-image-preview` (mesma rota da `criativo-generate`) passando o `inline_data` da imagem original + o prompt construído no passo A + (se houver) logo/produto/storyReference para coerência.
- Registra usage `text-flash` + `image-gemini-flash-2` (`recordAiUsage`).
- Retorna `{ editedImageUrl, generatedPrompt }`.

### Hook no front
- `editArt(targetKey, feedback)` chama a edge, salva em `editedVersions[targetKey]`.
- `originalPrompt` recuperado de:
  - principal/square: `buildFinalPrompt(aspect)` que já existe
  - fator: `factorVariations[i].promptCompleto`
- O grid da etapa 4 passa a iterar `[principal, ...edicoes_principal, ...fator_e_suas_edicoes]` mantendo a regra "story em cima, square embaixo na mesma coluna".

## 3. Etapa 2 — URL do site/produto → leitura → copy sugerida editável

### UI (no card "2. Copywriting")
Acima do `<Textarea>` da copy:
- Linha com `<Input placeholder="Cole a URL do site ou produto (opcional)">` + botão `Ler site`.
- Estados:
  - `urlReading: boolean` → mostra `Loader2 + "Lendo conteúdo do site…"` abaixo do input.
  - `urlSummary: string | null` → quando ok, badge verde `✓ Site lido — usado como base`.
  - `urlError: string | null` → toast + texto vermelho.
- Após leitura **bem-sucedida** (ou se o usuário pular), a sugestão de copy **já aparece pré-preenchida dentro do `<Textarea>`** (não num bloco separado). Acima do textarea, um pequeno chip:
  - "Sugestão da IA" + botão verde `Usar copy sugerida` (substitui o conteúdo atual pela sugestão) + `Regenerar`.
- O textarea continua **totalmente editável** após aceitar.
- Se o usuário começar a digitar manualmente, a sugestão fica disponível até ele clicar "Usar".

Fluxo:
1. (Opcional) cola URL → clica "Ler site" → spinner → ✓.
2. Sistema chama `criativo-suggest-copy` já passando `urlSummary` no payload.
3. Sugestão preenche o textarea (ou aparece num "chip-card" acima dele com pré-visualização e botão `Usar copy sugerida`).
4. Usuário edita livre e segue para "Melhorar copy" como hoje.

### Backend
**Nova edge function `criativo-fetch-url`:**
- Input: `{ url: string }`.
- Valida URL (http/https), faz `fetch` com `User-Agent` de browser, timeout 12s, limita 1.5 MB.
- Extrai texto: remove `<script>`, `<style>`, `<nav>`, `<footer>`; pega `<title>`, `<meta description>`, `<meta og:*>`, `<h1>…<h3>`, primeiros 6000 chars do `<main>`/`<body>` em texto plano.
- Retorna `{ title, description, text }` (trunca em ~5k chars).
- Sem chamadas de IA aqui — leitura pura.

**`criativo-suggest-copy/index.ts` (extensão):**
- Aceita campo opcional `urlContext: { title, description, text }`.
- Quando presente, prepende ao `userPrompt`:
  ```
  Conteúdo do site fornecido pelo anunciante (use como base principal da oferta):
  Título: {title}
  Descrição: {description}
  Trecho: {text}
  ```
- System prompt reforça: "Se houver conteúdo do site, baseie a oferta nele; não invente dados que não estejam ali."

### Estado no `CriativoStudioPage.tsx`
```ts
const [productUrl, setProductUrl] = useState('');
const [urlReading, setUrlReading] = useState(false);
const [urlContext, setUrlContext] = useState<{title:string;description:string;text:string}|null>(null);
```
A função `loadCopySuggestion()` (já existente) passa a aceitar `urlContext` e é chamada também logo após "Ler site" concluir.

## Diagrama do novo Step 4 com edições

```text
Principal      Principal-Edit1   Fator-1        Fator-1-Edit1   ...
[Story 9:16]   [Story 9:16]      [Story 9:16]   [Story 9:16]
⬇ Baixar       ⬇ Baixar          ⬇ Baixar       ⬇ Baixar
⟳ 1080         ⟳ 1080            ⟳ 1080         ⟳ 1080
✎ Editar       ✎ Editar nova     ✎ Editar       ✎ Editar nova
[Square 1:1]   [Square 1:1]      [Square 1:1]   [Square 1:1]
⬇ Baixar       ⬇ Baixar          ⬇ Baixar       ⬇ Baixar
```

## Arquivos afetados

- **Migração:** nova tabela `ai_usage_events` + RLS.
- `src/lib/aiUsageTracker.ts` — reescrita para Supabase.
- `src/components/AppSidebar.tsx` — card mais fino, sem reset.
- `src/pages/CriativoStudioPage.tsx`:
  - Step 2: input URL + estados + chip de sugestão dentro do textarea.
  - Step 4: botão "Editar com I.A" + painel inline + render de versões editadas no grid.
- `supabase/functions/criativo-suggest-copy/index.ts` — aceita `urlContext`.
- `supabase/functions/criativo-fetch-url/index.ts` — **novo** (leitura do site, sem JWT).
- `supabase/functions/criativo-edit-image/index.ts` — **novo** (prompt builder + Gemini image edit).
- `supabase/config.toml` — adicionar `[functions.criativo-fetch-url] verify_jwt = false` (caso necessário) e registrar `criativo-edit-image`.

## Validação

1. Login em 2 contas admin diferentes → ambas veem o mesmo total acumulado do mês; gerar IA em uma reflete na outra (refresh ou realtime).
2. Card do sidebar: 1 linha de label + 1 linha "R$ X,XX … 0 tok", sem ícone de reset, mais fino.
3. Vira o mês → query retorna 0 sem qualquer ação manual.
4. Etapa 4: clicar "Editar com I.A" em qualquer arte → digitar "tire o galho da esquerda" → nova coluna aparece com versão editada, original intacta, baixável.
5. Edição não muda rosto, logo, copy, paleta — só o que foi pedido.
6. Etapa 2: colar URL real → spinner → ✓ → sugestão coerente com o site aparece no textarea, editável; botão "Usar copy sugerida" substitui conteúdo.
7. URL inválida/timeout → mensagem amigável, fluxo continua sem URL.
