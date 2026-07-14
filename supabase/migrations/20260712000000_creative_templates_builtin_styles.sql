-- Estilos Wavy embutidos: templates curados pela equipe, sempre disponíveis,
-- com design system completo (8 dimensões) e anti-padrões explícitos.
-- Distintos dos templates salvos pelo usuário (is_builtin = false).

ALTER TABLE public.creative_templates
  ADD COLUMN IF NOT EXISTS is_builtin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS creative_templates_is_builtin_idx
  ON public.creative_templates (is_builtin);

-- Idempotência: remove seeds antigos antes de reinserir (permite re-rodar a
-- migration para ajustar o conteúdo dos estilos sem duplicar linhas).
DELETE FROM public.creative_templates WHERE is_builtin = true;

INSERT INTO public.creative_templates (
  created_by, name, description, category, niche, status, visibility,
  aspect_ratio, preferred_resolution, preview_url, design_system_doc,
  base_prompt, negative_prompt, copy_structure, layout_structure,
  style_metadata, tags, usage_count, is_builtin
) VALUES

-- ============ ESTILO 1: EDITORIAL PREMIUM ============
(
  NULL,
  'Editorial Premium',
  'Estética de revista de alto padrão: espaço negativo generoso, tipografia serifada refinada, paleta sóbria e quente. Ideal para marcas que vendem confiança e sofisticação.',
  'editorial',
  'serviços premium, imobiliário, saúde, educação, consultoria',
  'active',
  'global',
  '4:5',
  '4K',
  NULL,
  $doc$EDITORIAL PREMIUM — Design System

COMPOSITION
Aspect ratio: 4:5 portrait (or 1:1 square). Editorial magazine grid: photographic block occupies 60-70% of frame (top or side), typography block occupies the remaining 30-40% with generous negative space (minimum 35% breathing room, no element touching edges within 64px margin).

PHOTOGRAPHY
Subject shot with natural, soft directional side light (golden hour or north-window quality). Medium-high contrast, desaturated 10-15% from true color, no heavy filter or HDR look. Photography reads as authentic editorial reportage, not staged stock photography. If a person is present: candid expression, not posed-smiling-at-camera.

COLOR PALETTE
Dominant: Warm ivory #F5F1EA (background/negative space)
Secondary: Deep charcoal #1C1B19 (typography, structural elements)
Accent: Muted gold #B08D57 (used sparingly — CTA, thin divider line, max 8% of composition)
Saturation: low overall, let the photograph carry color variance

TYPOGRAPHY
Headline: high-contrast serif (Canela/Editorial New style), Light or Regular weight, large size (dominant but not shouting), tight letter-spacing, left-aligned.
Label/CTA: grotesque sans-serif (Suisse/Neue Haas style), Medium/Semibold weight, uppercase, wide letter-spacing (0.08-0.12em), small size — pure typographic contrast against the serif.

LAYERS (bottom to top)
1. Background photo — full or partial bleed, natural light, desaturated 10-15%
2. Gradient overlay — linear, rgba(28,27,25,0.65) to rgba(28,27,25,0), bottom-to-top, covering 35% of frame height, ONLY where text overlaps photo (legibility, not decoration)
3. Typography block — set on ivory #F5F1EA negative space when possible (not on the photo) to avoid needing heavy overlays. Serif headline, sans label below.
4. Divider — 1px hairline rule, gold #B08D57 at 60% opacity, positioned directly above the CTA

VISUAL HIERARCHY
1st: the photographic subject (face, product, or scene)
2nd: serif headline
3rd: CTA (small but color-differentiated via gold accent)
4th: supporting data line (smallest, charcoal at 70% opacity)

NEGATIVE SPACE
Minimum 35% of total composition must be empty/quiet. The typography block should feel like a magazine page margin, not a banner.

MOOD
Refined, timeless, quietly confident, editorial — never loud, never salesy-looking. Should feel like a page from a design magazine, not a Meta Ads template.$doc$,
  NULL,
  $neg$- NEVER use saturated or neon colors anywhere in the composition — palette must stay muted and warm
- NEVER use rounded "glassmorphism" panels, blur-behind cards, or drop shadows on text blocks — this is a flat, editorial layout, not a UI mockup
- NEVER fill the negative space with icons, illustrations, badges, or decorative shapes — silence is the design choice
- NEVER use a bold sans-serif for the headline — the serif/sans contrast is the signature of this style
- NEVER let text touch the edge of the frame — maintain minimum 64px margin on all sides
- NEVER use stock-photo smiling-at-camera poses — photography must feel candid and editorial
- NEVER use pure black (#000000) — use the charcoal #1C1B19 for all dark elements
- NEVER stack more than 2 typefaces
- NEVER use urgency language styling (all-caps red, exclamation marks, countdown badges) — this style communicates confidence, not urgency$neg$,
  '{}'::jsonb,
  jsonb_build_object(
    'visualAnalysis', jsonb_build_object(
      'composicao', jsonb_build_object(
        'formato', '4:5 ou 1:1',
        'estrutura', 'Grid editorial: foto em 60% superior ou lateral, texto em 40% com margem generosa',
        'hierarquia', 'Foto > título > CTA > dados',
        'silencio', 'Mínimo 35% de espaço negativo, nunca elementos colados nas bordas'
      ),
      'fotografia', jsonb_build_object(
        'tipo', 'Pessoa ou produto em ambiente real, meio corpo ou still-life',
        'luz', 'Luz natural lateral suave, direcional, sombras longas e macias',
        'tratamento', 'Levemente dessaturado, contraste médio-alto, sem filtro artificial',
        'integracao', 'Foto ocupa 60-70% do frame como bloco fotográfico, não recortada'
      ),
      'camadas', jsonb_build_array(
        'Layer 1 — Background photo: full or partial-bleed image, natural warm light, desaturated 10-15%',
        'Layer 2 — Gradient overlay: bottom-to-top rgba(28,27,25,0.65) to rgba(28,27,25,0), covering 35% from bottom, for text legibility',
        'Layer 3 — Text block: positioned in generous negative space, serif headline + sans label, no glass/blur effects',
        'Layer 4 — Thin rule line: 1px, gold #B08D57 at 60% opacity, above CTA as a divider'
      ),
      'hierarquiaVisual', '1) rosto ou objeto central da foto, 2) título serifado, 3) CTA em destaque com a cor de acento',
      'espaco', 'Denso na foto, muito solto no bloco de texto — nunca preencher os 40% de texto com elementos extras'
    )
  ),
  jsonb_build_object(
    'mood', jsonb_build_object(
      'adjetivos', jsonb_build_array('editorial', 'refinado', 'atemporal', 'confiante', 'sóbrio'),
      'referencias', jsonb_build_array('Kinfolk', 'The Row', 'Aesop', 'Monocle'),
      'evita', jsonb_build_array('cores vibrantes', 'gradientes coloridos', 'ícones genéricos', 'excesso de elementos')
    ),
    'palette', jsonb_build_object(
      'dominante', 'Warm ivory #F5F1EA',
      'secundaria', 'Deep charcoal #1C1B19',
      'acento', 'Muted gold #B08D57',
      'saturacao', 'baixa',
      'hexes', jsonb_build_array('#F5F1EA', '#1C1B19', '#B08D57')
    ),
    'typography', jsonb_build_object(
      'familiaA', 'High-contrast serif (Editorial New / Canela style), Light/Regular weight for headlines',
      'familiaB', 'Grotesk sans (Neue Haas / Suisse style), Medium weight for labels/CTA',
      'contraste', 'Serif elegante para título vs sans grotesque bold para label/CTA',
      'alinhamento', 'Esquerda, com respiro generoso'
    ),
    'previewGradient', 'linear-gradient(135deg, #F5F1EA 0%, #E8DFD0 45%, #B08D57 100%)'
  ),
  ARRAY['editorial', 'premium', 'minimalista', 'clean'],
  0,
  true
),

-- ============ ESTILO 2: BOLD DIRETO ============
(
  NULL,
  'Bold Direto',
  'Alto contraste, claim tipográfico gigante, cores planas e um único bloco de acento. Feito pra parar o scroll e converter — sem sutileza.',
  'performance',
  'ofertas, promoções, infoprodutos, e-commerce, lançamentos, geração de leads',
  'active',
  'global',
  '1:1',
  '4K',
  NULL,
  $doc$BOLD DIRETO — Design System

COMPOSITION
Aspect ratio: 1:1 or 4:5. Rigid, confident grid. A solid color block (near-black #0A0A0A or brand primary) covers at least 50% of the frame. No soft transitions, no ambient photography — this style communicates through scale and contrast, not atmosphere.

PHOTOGRAPHY / SUBJECT
Subject is isolated: a single product on a seamless background, an extreme close-up of a face, or a massive numeral/statistic as the visual itself. Hard studio lighting, high contrast, no mid-tones, no soft ambient scenes. If cut out, the edge must be crisp — no soft feathered blend.

COLOR PALETTE
Base: Near-black #0A0A0A or Pure white #FFFFFF (pick one as dominant per composition)
Contrast base: the opposite of the base (white on black or black on white)
Accent: one single high-visibility color block used at full saturation (default signal orange #FF4D2E, or brand primary if provided) — used for the CTA and/or one graphic block, never diluted or gradiented
Saturation: flat and maximal on the accent only; base colors stay pure black/white, never off-black or cream

TYPOGRAPHY
Headline claim: ultra-condensed, ultra-bold sans-serif (Druk/Anton weight — 900), ALL CAPS or sentence case at massive scale, occupying 30-40% of the vertical frame. This IS the visual, not a caption on top of a visual.
Supporting text: same sans-serif family, Bold/700 weight, much smaller, high legibility, never competing with the headline.
Never introduce a second typeface family — weight contrast only.

LAYERS (bottom to top)
1. Solid flat color background — no gradient, no texture, no noise
2. Subject cutout — hard edge, rule-of-thirds placement, high contrast lighting
3. Typography claim — massive, bold, positioned to never overlap the subject's focal point (face/product label)
4. CTA block — solid accent-color rectangle or pill shape, bottom third, text in pure white or pure black for max contrast, minimum 8% of frame height

VISUAL HIERARCHY
1st: the typographic claim (read in under 1 second)
2nd: the subject (product/face/number)
3rd: the CTA block (unmissable, high contrast)

NEGATIVE SPACE
Minimal by design — but organized. Every element sits on an implied grid; density communicates confidence, not clutter. No random decorative elements filling gaps.

MOOD
Direct, loud, confident, performance-driven. Built to stop the scroll and be legible at thumbnail size on a phone screen. This is a direct-response ad, not a brand mood piece.$doc$,
  NULL,
  $neg$- NEVER use soft gradients, pastel tones, or muted/desaturated colors — this style is flat and maximal contrast only
- NEVER use a serif typeface anywhere — sans-serif only, weight is the only typographic variable
- NEVER use ambient or lifestyle photography with blurred backgrounds — subjects must be isolated and sharp
- NEVER let the headline claim be small or secondary — it must dominate 30%+ of the vertical frame
- NEVER use glassmorphism, drop shadows, or soft blur effects on any element
- NEVER use more than one accent color per composition
- NEVER make the CTA block subtle — it must be a solid, high-contrast, unmissable shape
- NEVER add decorative icons, sparkles, or illustrative flourishes — every element must serve legibility or hierarchy
- NEVER use off-black or off-white — pure #0A0A0A and pure #FFFFFF only for base colors$neg$,
  '{}'::jsonb,
  jsonb_build_object(
    'visualAnalysis', jsonb_build_object(
      'composicao', jsonb_build_object(
        'formato', '1:1 ou 4:5',
        'estrutura', 'Bloco de cor sólida ocupando pelo menos 50% do frame, claim tipográfico dominante sobre o bloco',
        'hierarquia', 'Claim/número > imagem do produto/pessoa > CTA em bloco separado',
        'silencio', 'Quase nenhum — composição densa e direta, mas organizada em grid rígido, nunca caótica'
      ),
      'fotografia', jsonb_build_object(
        'tipo', 'Produto isolado, dado numérico grande, ou pessoa em close extremo — nunca cena ambiente',
        'luz', 'Alto contraste, iluminação de estúdio dura, sem meio-tom',
        'tratamento', 'Cores saturadas, contraste elevado, nitidez agressiva',
        'integracao', 'Recortado sobre fundo sólido ou bloco de cor — nunca fundo fotográfico difuso'
      ),
      'camadas', jsonb_build_array(
        'Layer 1 — Solid color background block: near-black #0A0A0A or brand primary, flat, no gradient',
        'Layer 2 — Product/subject cutout: hard-edged isolation, no soft shadow blend, positioned off-center following rule-of-thirds',
        'Layer 3 — Typography claim: ultra-bold condensed sans, white or accent color, occupies 30-40% of vertical space',
        'Layer 4 — CTA block: solid accent-color rectangle or pill, high contrast text, bottom third'
      ),
      'hierarquiaVisual', '1) claim tipográfico gigante, 2) produto/pessoa/número, 3) bloco de CTA sólido',
      'espaco', 'Denso e confiante — grid rígido implícito, elementos alinhados com precisão, sem sobreposição confusa'
    )
  ),
  jsonb_build_object(
    'mood', jsonb_build_object(
      'adjetivos', jsonb_build_array('direto', 'confiante', 'urgente', 'impactante', 'cru'),
      'referencias', jsonb_build_array('Liquid Death', 'Gymshark ads', 'Duolingo social', 'performance DTC ads'),
      'evita', jsonb_build_array('fotos suaves e difusas', 'paleta pastel', 'serifas delicadas', 'excesso de elementos decorativos')
    ),
    'palette', jsonb_build_object(
      'dominante', 'Near-black #0A0A0A',
      'secundaria', 'Pure white #FFFFFF',
      'acento', 'Signal orange #FF4D2E (ou cor primária da marca)',
      'saturacao', 'alta no acento apenas',
      'hexes', jsonb_build_array('#0A0A0A', '#FFFFFF', '#FF4D2E')
    ),
    'typography', jsonb_build_object(
      'familiaA', 'Ultra-bold condensed sans-serif (Druk/Anton style) for the headline claim',
      'familiaB', 'Bold sans-serif (Inter/Helvetica Bold) for supporting text',
      'contraste', 'Peso extremo (Black/900) no título vs peso médio no suporte — contraste é de peso, não de família',
      'alinhamento', 'Centralizado ou esquerda, sempre grid rígido'
    ),
    'previewGradient', 'linear-gradient(135deg, #0A0A0A 0%, #0A0A0A 60%, #FF4D2E 100%)'
  ),
  ARRAY['bold', 'alto-contraste', 'performance', 'direto'],
  0,
  true
),

-- ============ ESTILO 3: ORGÂNICO ASPIRACIONAL ============
(
  NULL,
  'Orgânico Aspiracional',
  'Luz natural quente, paleta terrosa, tipografia humana e fotografia autêntica. Para marcas que vendem sensação e conexão, não especificação técnica.',
  'lifestyle',
  'bem-estar, beleza, alimentação saudável, personal brand, coaching, maternidade',
  'active',
  'global',
  '4:5',
  '4K',
  NULL,
  $doc$ORGÂNICO ASPIRACIONAL — Design System

COMPOSITION
Aspect ratio: 4:5 or 9:16. The photographic scene occupies most of the frame — this style trusts the image to carry the emotion. Typography floats in a breathable zone (bottom third or one corner), never boxed or caged. Slight organic asymmetry is welcome; avoid a perfectly rigid grid.

PHOTOGRAPHY
Real people in natural, unposed movement, OR organic still-life (plants, natural fabric, real food, hands). Warm natural light — golden hour or diffused window light — soft, long shadows, never harsh studio flash. A subtle film grain texture is desirable. Integration is full-scene, not a hard cutout; the photograph should feel like a moment, not a product shot.

COLOR PALETTE
Dominant: Warm sand #E8DFD3
Secondary: Terracotta #C97A5A
Accent: Sage green #8A9A7E (used for CTA or one small graphic element)
Saturation: medium, earthy and warm — no cool tones, no neon, no pure white or pure black anywhere in the palette

TYPOGRAPHY
Headline: humanist serif or soft rounded sans (Fraunces/Recoleta style), Medium weight, warm and approachable — never a hard geometric sans.
Body/support: simple humanist sans (Circular/Poppins style), Regular weight, generous line-height.
Contrast between the two is soft — both typefaces carry warmth, the differentiation is size and weight, not rigidity.

LAYERS (bottom to top)
1. Full scene photograph — warm natural light, soft shadows, subtle grain
2. Soft warm gradient — rgba(199,122,90,0.25) to transparent, bottom 25% only, a gentle tint (not a darkening overlay) for text legibility
3. Typography — set directly over the gradient zone, no boxes, panels, or glass cards behind it
4. CTA — text-only or a soft, low-contrast pill in sage green; understated, feels like an invitation, not a demand

VISUAL HIERARCHY
1st: the feeling/scene of the photograph
2nd: the warm, human headline
3rd: a quiet CTA

NEGATIVE SPACE
Generous and organic. Nothing touches the frame edge. Elements can have gentle, natural asymmetry — this is not a rigid poster grid.

MOOD
Warm, human, authentic, calm. Should feel like a moment captured, not an advertisement constructed. Never corporate, never clinical.$doc$,
  NULL,
  $neg$- NEVER use hard studio flash lighting or harsh direct light — light must be warm and natural/diffused
- NEVER use cool tones, neon colors, or pure white/black in the palette — stay warm and earthy
- NEVER use rigid geometric sans-serif fonts for the headline — typography must feel humanist and warm
- NEVER put text inside a hard-edged box, glass panel, or card — text floats directly on the image with a soft gradient only
- NEVER use posed, corporate-looking stock photography — people must look natural and unposed
- NEVER use a generic plain white/gray background — every scene must feel like a real, lived-in place
- NEVER make the CTA aggressive or high-contrast — it should feel like a soft invitation
- NEVER crop people in ways that feel clinical or product-catalog-like — preserve natural framing
- NEVER add corporate iconography (checkmarks, badges, percentage bubbles) — this style relies on photography and warmth, not UI elements$neg$,
  '{}'::jsonb,
  jsonb_build_object(
    'visualAnalysis', jsonb_build_object(
      'composicao', jsonb_build_object(
        'formato', '4:5 ou 9:16',
        'estrutura', 'Cena fotográfica ocupa a maior parte do frame, texto flutua em área respirável',
        'hierarquia', 'Sensação/cena > texto de apoio > CTA discreto',
        'silencio', 'Generoso, elementos nunca tocam as bordas, tudo parece respirar'
      ),
      'fotografia', jsonb_build_object(
        'tipo', 'Pessoa real em movimento natural ou ambiente/still-life orgânico (plantas, tecidos, comida)',
        'luz', 'Luz natural quente, golden hour ou luz de janela difusa, sombras suaves',
        'tratamento', 'Tons quentes acentuados, grain sutil de filme, nada de flash duro',
        'integracao', 'Foto como cena completa, respiro ao redor, nunca recortada de forma agressiva'
      ),
      'camadas', jsonb_build_array(
        'Layer 1 — Full scene photo: warm natural light, soft shadows, subtle film grain texture',
        'Layer 2 — Soft gradient overlay: bottom-to-top warm tint rgba(199,122,90,0.25), only bottom 25%',
        'Layer 3 — Typography: humanist serif headline in terracotta or charcoal, no hard boxes or panels behind text',
        'Layer 4 — CTA: text-only or soft pill shape in sage green, understated'
      ),
      'hierarquiaVisual', '1) a cena/sensação fotográfica, 2) o título humano e caloroso, 3) CTA discreto, quase convite',
      'espaco', 'Solto, orgânico, elementos podem ter leve assimetria — nunca grid perfeito e rígido'
    )
  ),
  jsonb_build_object(
    'mood', jsonb_build_object(
      'adjetivos', jsonb_build_array('acolhedor', 'humano', 'autêntico', 'calmo', 'natural'),
      'referencias', jsonb_build_array('Aesop campaigns', 'Glossier', 'Everlane', 'wellness editorial'),
      'evita', jsonb_build_array('luz de estúdio dura', 'cores frias ou neon', 'poses corporativas rígidas', 'fundos brancos genéricos')
    ),
    'palette', jsonb_build_object(
      'dominante', 'Warm sand #E8DFD3',
      'secundaria', 'Terracotta #C97A5A',
      'acento', 'Sage green #8A9A7E',
      'saturacao', 'média, tons terrosos e quentes',
      'hexes', jsonb_build_array('#E8DFD3', '#C97A5A', '#8A9A7E')
    ),
    'typography', jsonb_build_object(
      'familiaA', 'Soft rounded sans-serif or humanist serif (Fraunces/Recoleta style), Medium weight for headline',
      'familiaB', 'Simple humanist sans (Circular/Poppins style), Regular weight for body',
      'contraste', 'Suave — ambas as famílias têm calor, contraste é de tamanho não de rigidez',
      'alinhamento', 'Centralizado ou levemente orgânico, nunca rígido'
    ),
    'previewGradient', 'linear-gradient(135deg, #E8DFD3 0%, #C97A5A 55%, #8A9A7E 100%)'
  ),
  ARRAY['organico', 'lifestyle', 'caloroso', 'humano'],
  0,
  true
);

NOTIFY pgrst, 'reload schema';
