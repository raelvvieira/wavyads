# Plano — Integrar a skill `criativo-studio` ao fluxo do Criativo Studio

A skill é um framework profissional de 3 etapas (Leitura → Copy → Prompt). Hoje o Criativo Studio implementa o esqueleto, mas o output é genérico demais. Esse plano refina cada etapa para seguir literalmente a skill, mantendo o fluxo visual já aprovado de 4 passos.

## Resumo das mudanças por etapa

### Etapa 1 — `criativo-analyze-refs` (edge function)
Reescrever o system prompt do Gemini Vision para extrair **as 8 dimensões da skill** e devolver o **Design System Document** estruturado:

```json
{
  "composicao":   { "formato", "estrutura", "hierarquia", "silencio" },
  "fotografia":   { "tipo", "luz", "tratamento", "integracao" },
  "paleta":       { "dominante", "secundaria", "acento", "saturacao", "hexes": [] },
  "tipografia":   { "familiaA", "familiaB", "contraste", "alinhamento" },
  "camadas":      [ "Layer 1: …", "Layer 2: …", … ],
  "hierarquiaVisual": "…",
  "espaco":       "…",
  "mood":         { "adjetivos": [], "referencias": [], "evita": [] },
  "designSystemDoc": "string completa em formato markdown pronta pra ir no prompt final"
}
```

A UI passa a renderizar essas seções (incluindo "Camadas" como lista numerada e "Evita" em chip vermelho), mantendo o textarea editável agora preenchido com o `designSystemDoc` completo.

### Etapa 2 — `criativo-improve-copy` (edge function)
Reescrever para devolver a copy nos **5 blocos visuais** da skill, não em headline/sub/cta:

```json
{
  "label":     "string opcional (topo, uppercase)",
  "titulo":    "string (dominante)",
  "subtitulo": "string opcional",
  "dados":     "string opcional (data, local, preço, vagas)",
  "cta":       "string",
  "avaliacao": { "clareza", "hierarquia", "brevidade", "gatilho", "tom" },
  "justificativa": "string"
}
```

A UI dos dois cards (original × IA) passa a mostrar esses blocos. A copy "original" continua sendo o texto cru do usuário (a IA não interfere se ele escolher essa).

### Etapa 3 — Inputs novos identificados pela skill

A skill exige informações que hoje **não estamos coletando**. Vou adicionar de forma enxuta, sem virar um formulário gigante:

1. **Contexto do negócio** (textarea curto, 1 linha)
   Onde: bloco no topo do Step 4 (ou pequeno acordeão).
   Por quê: a skill diz "Premium facial harmonization mentorship ≠ beauty course". Sem isso o prompt fica genérico.
   Default sugerido: vazio.

2. **Idioma dos textos na arte** (Select: PT-BR / EN / ES)
   Onde: Step 4, ao lado do Modelo.
   Por quê: a skill exige "all text in the artwork must be in [idioma]" — default PT-BR.

3. **Preservar rostos** (Switch)
   Onde: Step 3, junto às imagens de produto/pessoa.
   Por quê: skill diz "Preserve their exact likeness. Do not alter faces…".
   Aparece apenas quando há ≥ 1 imagem em `productImages`.

4. **DO NOT INCLUDE** (textarea opcional, colapsável)
   Onde: Step 4, em "Opções avançadas".
   Por quê: princípio 5 da skill — fechar brechas criativas.
   Default: vazio (o sistema já injeta itens padrão como "no platform UI overlays").

> Outras coisas que a skill pede (safe zones, ordem de camadas, princípios) são geradas automaticamente pelo `buildFinalPrompt`, sem virar input do usuário.

### Etapa 4 — `buildFinalPrompt` (frontend)

Reescrever para seguir literalmente a **Estrutura Universal do Prompt** da skill:

```
[INTRODUÇÃO]
Create a {story|square} advertisement image (9:16 1080x1920 | 1:1 1080x1080)
for {contextoDoNegocio}.

[ATTACHED PHOTOS] (se houver productImages)
The provided reference images contain {produto/pessoa/cenário}.
{se preservarRostos: Preserve their exact likeness. Do not alter faces, skin tone or appearance.}

[BACKGROUND & ATMOSPHERE]
{Fotografia.tratamento, integração, temperatura — vindo da Etapa 1}

[SAFE ZONE]
Story → 280px top + 280px bottom livres.
Square → 120px top + 120px bottom livres.

[LAYER STACK]
{Camadas extraídas pela Etapa 1, em ordem}

[TEXT BLOCKS]
{Blocos da copy escolhida — label/título/subtítulo/dados/cta com posição,
família tipográfica vinda da Etapa 1, peso, cor da paleta}

[TYPOGRAPHY SYSTEM]
{Família A + Família B vindas da Etapa 1}

[COLOR PALETTE]
{Hexadecimais vindos da Etapa 1}

[BRAND LOGO] (se houver logoImage)
Place the brand logo discreetly in {top-left|bottom-right}, do not distort, do not recolor.

[MOOD]
Feels like {referências}. Tone: {adjetivos}. Not {evita}.

[DO NOT INCLUDE]
- {evita da Etapa 1}
- {DO NOT INCLUDE custom do usuário}
- Any element within the top or bottom safe zones
- Any text in a language other than {idiomaSelecionado}

All text in the artwork must be written in {idiomaSelecionado}.
```

### Etapa 5 — Tabela "iteração" da skill (futuro, fora deste escopo)

A skill traz uma matriz de "problema observado → ajuste no prompt". Isso seria um próximo passo (botão "tive um problema com…" para iterar). Fora do escopo desta entrega.

## Arquivos afetados

- `supabase/functions/criativo-analyze-refs/index.ts` — novo system prompt + novo schema JSON.
- `supabase/functions/criativo-improve-copy/index.ts` — novo schema com 5 blocos + avaliação.
- `src/pages/CriativoStudioPage.tsx`:
  - Tipos `VisualAnalysis` e `CopyResult` reescritos.
  - Renderização do Design System Document na Step 1.
  - Renderização dos 5 blocos da copy na Step 2.
  - Novos campos: `businessContext`, `language`, `preserveFaces`, `negativePrompt`.
  - `buildFinalPrompt` reescrito conforme estrutura universal.

## Fora do escopo

- Persistência (continua só sessão).
- Novos modelos de geração.
- Iteração assistida pós-imagem (problema → ajuste).
- Mudar o componente `ImageDropzone` ou `StepIndicator`.
