## Etapa 4 — Image Agent (apenas formatos com imagem)

**Regra de entrada:** se `pipeline.formato === "reel"`, o pipeline encerra na Etapa 3 (copy aprovada = entregável final, mostrar tela de conclusão com roteiro/legenda/hashtags + botão "Exportar"). Para os demais formatos (`carrossel_imagem`, `carrossel_texto`, `carrossel_lista`, `post_unico`), seguir para a Etapa 4.

### Fluxo UX

1. Grid com 1 card por slide (mesma ordem da copy). Cada card mostra: número, título, badge do tipo, `visual_prompt` e placeholder de imagem.
2. Topo: **"Gerar imagens de todos os slides"** com progresso "Gerando 3/7…".
3. Ações inline por card:
   - **🔄 Regerar** — refaz só aquela imagem.
   - **✏️ Editar prompt** — `Dialog` com textarea do `visual_prompt`, salva e regera.
   - **⬆️ Upload manual** — input file, substitui a imagem.
   - **🔍 Buscar no banco** — `Dialog` com busca Freepik, grid de resultados clicáveis.
4. Formato de imagem:
   - `carrossel_texto` / `carrossel_lista` → fundo sólido + tipografia (gerado também via IA com prompt específico de "tipografia grande, fundo sólido, sem foto").
   - `carrossel_imagem` / `post_unico` → foto/ilustração 1080x1080.
5. Rodapé: **"Aprovar Imagens →"** salva `pipeline.imagens` e avança para etapa 5. Desabilitado se algum slide estiver sem imagem.

### Geração

- Edge function `social-image-gen` via **Lovable AI Gateway** com `google/gemini-3-pro-image-preview` (sem chave extra, usa `LOVABLE_API_KEY`).
- Input por slide: `{ visual_prompt, formato, tema, estilo_global }`.
- Estilo global derivado do post viral + briefing (paleta, mood), injetado no system prompt para coerência entre slides.
- Output salvo em bucket público `social-media` no Storage; estado guarda apenas a URL.
- Edge function `freepik-search` faz proxy para `https://api.freepik.com/v1/resources` (usa `FREEPIK_API_KEY`).

### Estado

```ts
pipeline.imagens = [
  { slide_index: 0, url: "...", source: "ai" | "freepik" | "upload", prompt_usado: "..." },
  ...
]
pipeline.etapa_atual = 4
```

### Arquivos

Novos:
- `src/components/social/ImageStep.tsx` — orquestração + grid + botão global.
- `src/components/social/SlideImageCard.tsx` — card por slide.
- `src/components/social/FreepikSearchDialog.tsx` — busca no banco.
- `src/components/social/ReelFinalStep.tsx` — tela de entrega final do reel (pula imagens).
- `supabase/functions/social-image-gen/index.ts`
- `supabase/functions/freepik-search/index.ts`

Editar:
- `src/pages/SocialMidiaStudioPage.tsx` — quando `etapa_atual === 3`: renderizar `<ReelFinalStep>` se formato = reel, senão `<ImageStep>`. Atualizar `StepIndicator` para indicar que o reel termina antes (ou ocultar passos 5/6 quando formato = reel). Adicionar `imagens` ao tipo `Pipeline`.

Migration:
- Criar bucket público `social-media` no Storage (apenas admins podem fazer upload).
