
# Criativo Studio

Nova página admin com fluxo guiado de 4 passos para gerar criativos publicitários usando IA (análise visual com Gemini + geração de imagem com Freepik).

## Fluxo do usuário

```
[1] Referências visuais  →  [2] Copy + sugestão IA  →  [3] Imagens de produto/rosto  →  [4] Escolher modelo + Gerar
        ↓                          ↓                              ↓                              ↓
  upload/colar imgs          escrever copy bruta            upload imgs reais          1º: Story 1080x1920
  Gemini analisa             Gemini sugere melhor           (ficam no contexto)        depois: Quadrado 1080x1080
  (paleta, layout,           OK / Refazer                                              Botão "Baixar"
   tipografia, etc.)
```

## Passo a passo

### Passo 1 — Referências visuais
- Dropzone com upload por clique, drag-and-drop **e colar (Ctrl+V)** capturando o evento `paste` global.
- Grid de miniaturas das referências carregadas (com remover).
- Botão "Analisar referências" → chama edge function que envia as imagens para `google/gemini-2.5-pro` (visão) com instrução para extrair: paleta de cores (HEX), tipografia, estilo de layout, elementos gráficos, mood, recortes, efeitos.
- Resultado da análise mostrado em card editável (textarea) — usuário pode ajustar antes de seguir.

### Passo 2 — Copywriting
- Textarea: "O que você quer vender?" (copy bruta do usuário).
- Botão "Melhorar copy com IA" → chama edge function com `google/gemini-2.5-flash` retornando headline + subheadline + CTA otimizados em PT-BR.
- Resultado mostrado em card. Botões: **OK, usar essa** / **Refazer**.

### Passo 3 — Imagens de produto/pessoa (opcional)
- Mesmo dropzone do passo 1 (upload + paste).
- Sem análise — essas imagens são apenas anexadas ao prompt final como referência visual para o modelo de geração.

### Passo 4 — Geração
- Seletor de modelo Freepik (ex.: Flux Dev, Mystic, Imagen3, Classic Fast — listamos os principais que a API oferece).
- Botão **Gerar criativo (Story 1080x1920)**.
- Edge function monta o prompt final consolidando: análise das referências (passo 1) + copy aprovada (passo 2) + descrição das imagens de produto (passo 3) + dimensões.
- Chama Freepik API → retorna URL da imagem gerada.
- Imagem mostrada em preview grande. Botões abaixo:
  - **Baixar Story**
  - **Recriar em quadrado (1080x1080)** → reusa o mesmo prompt mudando aspect ratio
  - **Baixar Quadrado** (após gerar)
  - **Começar do zero** (reseta o fluxo)

## UI / Layout

- Página `/criativo-studio`, item na sidebar **Gestão WAVY** (entre "Google Ads I.A" e "Configurações"), ícone `Wand2` ou `Palette`, visível apenas para admin.
- Stepper horizontal no topo (4 passos, com checkmark verde nos completos).
- Cada passo é um `GlassCard` grande, mantendo o design Apple Glass Morphism + accent verde `#1ACD8A`.
- Avança automaticamente para o próximo passo quando o usuário completa o atual, mas permite voltar.

## Segurança & Acesso

- Rota protegida: redireciona não-admin para `/dashboard`.
- Edge functions verificam `has_role(user, 'admin')` antes de processar.

## Sem persistência no banco
Conforme combinado: nenhuma tabela nova. Imagens de referência, copy e geradas vivem só na sessão do navegador. Usuário baixa o que quiser manter.

---

## Detalhes técnicos

**Arquivos novos:**
- `src/pages/CriativoStudioPage.tsx` — página principal com state machine dos 4 passos.
- `src/components/criativo/ImageDropzone.tsx` — componente reutilizável (upload + drag + paste).
- `src/components/criativo/StepIndicator.tsx` — stepper visual.
- `supabase/functions/criativo-analyze-refs/index.ts` — Gemini 2.5 Pro vision, recebe array de imagens base64, retorna análise estruturada (tool calling).
- `supabase/functions/criativo-improve-copy/index.ts` — Gemini 2.5 Flash, recebe copy bruta, retorna headline/sub/CTA.
- `supabase/functions/criativo-generate/index.ts` — chama Freepik API (`https://api.freepik.com/v1/ai/...`), recebe prompt + modelo + aspect ratio, retorna URL da imagem.

**Arquivos editados:**
- `src/App.tsx` — nova rota `/criativo-studio`.
- `src/components/AppSidebar.tsx` — novo item em `adminItems`.

**Secret necessário:** `FREEPIK_API_KEY` (vou solicitar via `add_secret` no início da implementação).

**Modelos Freepik suportados (selecionáveis no passo 4):**
- `flux-dev` — equilíbrio qualidade/velocidade
- `mystic` — alta qualidade fotorrealista
- `imagen3` — Google Imagen 3 via Freepik
- `classic-fast` — rápido e barato

**Edge functions config:** todas com CORS padrão, sem `verify_jwt` extra (pattern atual do projeto usa LOVABLE_API_KEY para Gemini + verificação de admin via `client_users`/role).
