# Plano · Etapa 5 — Designer (templates + render no navegador)

## Objetivo

Receber `CopyAprovada` (etapa 3) + `SlideImagem[]` (etapa 4) e montar os slides finais em **3 templates** (A/B/C), com preview ao vivo, troca de template em 1 clique, e exportação em **PNG 1080×1350** (download individual ou ZIP do carrossel). Sem Playwright/Telegram — tudo client-side.

## Stack

- **Renderização**: componentes React puros (1 por template), tamanho fixo 1080×1350 com `transform: scale()` no preview.
- **Export PNG**: `html-to-image` (lib leve, sem dependências de servidor). Adiciona via `bun add html-to-image`.
- **ZIP**: `jszip` para empacotar todos os slides do carrossel.
- **Fonts**: Montserrat via Google Fonts (já carregada no template HTML original).

## Componentes novos

```
src/components/social/design/
├── DesignStep.tsx           # orquestrador da etapa 5
├── TemplatePicker.tsx       # toggle A/B/C com preview thumbnail
├── ProfileEditor.tsx        # nome, @handle, avatar (upload p/ bucket)
├── SlideCanvas.tsx          # wrapper 1080x1350 + scaling responsivo
├── templates/
│   ├── TemplateA.tsx        # dark cinematográfico
│   ├── TemplateB.tsx        # light / twitter style
│   ├── TemplateC.tsx        # editorial escuro
│   └── shared.ts            # tipos + util determinarFormato()
```

Cada `TemplateX.tsx` exporta um componente que recebe:

```ts
interface TemplateSlideProps {
  slideIndex: number;       // 0-based
  total: number;
  titulo: string;
  corpo: string;
  imgUrl?: string;
  tipoSlide: SlideTipo;     // cover, problema, agitacao, solucao, lista, prova, cta
  formato: "cover" | "light" | "text_only" | "dark" | "cta";
  profile: { nome: string; handle: string; avatarUrl: string };
}
```

E renderiza `<div style={{ width: 1080, height: 1350 }}>...</div>` com estilo fiel ao agente Python (cores, fontes, footer com pills WAVY+handle, copyright, gradient avatar ring para template B etc.).

## Mapeamento formato por slide

Igual ao agente v3 (`determinar_formato_slide`):

| Condição | formato |
|---|---|
| `slideIndex === 0` ou `tipoSlide === "cover"` | `cover` |
| `slideIndex === total - 1` ou `tipoSlide === "cta"` | `cta` |
| `tipoSlide === "prova"` | `text_only` |
| `tipoSlide === "problema"` ou `"agitacao"` | `dark` |
| default | `light` |

## Fluxo do `DesignStep`

```text
┌─────────────────────────────────────────────────────────┐
│ Etapa 5 · Design                                        │
├─────────────────────────────────────────────────────────┤
│ [Template: ●A  ○B  ○C]    [Perfil: avatar + @handle]   │
├─────────────────────────────────────────────────────────┤
│ Grid de previews escalados (cada slide 270x337.5)       │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐                                    │
│ │01│ │02│ │03│ │04│  …                                  │
│ └──┘ └──┘ └──┘ └──┘                                    │
├─────────────────────────────────────────────────────────┤
│ [Baixar slide atual]   [Baixar tudo (.zip)]            │
│ [Aprovar e finalizar →]                                 │
└─────────────────────────────────────────────────────────┘
```

- Clicar num slide abre modal com preview 1:1 e botões "Baixar PNG" / "Trocar imagem (volta etapa 4)".
- Export: `toPng(node, { width: 1080, height: 1350, pixelRatio: 1 })` → `Blob` → `JSZip` → `saveAs("carrossel-${tema}.zip")`.

## Perfil persistente

Tabela leve para guardar o perfil padrão do usuário (1 row por user):

```sql
CREATE TABLE social_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT 'WAVY',
  handle text NOT NULL DEFAULT '@wavy.mkt',
  avatar_url text,
  template_padrao text NOT NULL DEFAULT 'A',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON social_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

Avatar é upload normal para bucket `social-media` (já existe, público).

## Integração com `SocialMidiaStudioPage.tsx`

- Após `ImageStep.onApprove(imagens)` → state vai para etapa 5 (`DesignStep`), recebendo `copy`, `imagens`, `tema`, `formato`.
- `DesignStep.onFinish()` finaliza pipeline (pode disparar toast "Carrossel pronto!" e oferecer "Começar novo").
- Para `Formato === "reel"`: pular a etapa 5 (o `ReelFinalStep` já entrega o roteiro). Mostrar mensagem "Reels não geram slides — use o roteiro da etapa 3".

## Tracking de custos

Etapa 5 é 100% client-side, **custo zero de API**. Não precisa `recordAiUsage`.

## Arquivos

**Novos:**
- `src/components/social/design/DesignStep.tsx`
- `src/components/social/design/TemplatePicker.tsx`
- `src/components/social/design/ProfileEditor.tsx`
- `src/components/social/design/SlideCanvas.tsx`
- `src/components/social/design/templates/{TemplateA,TemplateB,TemplateC,shared}.{tsx,ts}`
- `src/hooks/useSocialProfile.ts`
- `supabase/migrations/*_social_profiles.sql`

**Editados:**
- `src/pages/SocialMidiaStudioPage.tsx` — wiring da etapa 5
- `src/types/social.ts` — adicionar `Profile` e `Template = "A"|"B"|"C"`
- `package.json` — `html-to-image`, `jszip`, `file-saver` (via `bun add`)

## Perguntas antes de implementar

1. **Avatar padrão**: a URL hardcoded no script (`PROFILE_IMAGE_FALLBACK = "https://i.ibb.co/bMtB5PZL/..."`) é da WAVY ou de teste? Quer manter como fallback global ou exigir upload na primeira vez?
2. **Templates extras**: começo com os 3 (A/B/C) idênticos ao Python, ou já adapto cores ao tema WAVY Dash (preto + verde #1ACD8A) substituindo os gradientes laranja/rosa atuais?
3. **Resolução de export**: 1080×1350 (4:5 Instagram, fiel ao original) ou também oferecer 1080×1080 (1:1) como opção?
