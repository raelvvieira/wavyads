import { ASPECT_CONFIG, RESOLUTION_CONFIG } from '../constants/formats';
import { safeAreaFor, safeRect, typeScaleFor, verticalLift, type SafeArea } from './safeArea';
import type { BackendAspect, CreativeAspectRatio, CreativeResolution } from '../types/creative';

// Montagem do prompt final de geração. Estava dentro do CriativoStudioPage,
// lendo ~12 pedaços do state; aqui recebe tudo explicitamente para que o
// workspace novo possa gerar arte usando EXATAMENTE a mesma lógica. Duplicar
// isso seria garantir que os dois fluxos divergissem na primeira mudança.
//
// O texto dos blocos é resultado de ajuste fino contra o modelo de imagem —
// mudanças aqui alteram a qualidade da arte, não só a organização do código.

export interface PromptCopyBlocks {
  label?: string;
  titulo?: string;
  subtitulo?: string;
  dados?: string;
  cta?: string;
}

export type PromptCopy =
  | { source: 'ai'; blocks: PromptCopyBlocks }
  | { source: 'original'; text: string }
  | null;

export interface CreativePromptInput {
  aspect: BackendAspect;
  aspectRatio?: CreativeAspectRatio | null;
  resolution?: CreativeResolution | null;
  language?: string;
  businessContext?: string;
  designSystemDoc?: string;
  /**
   * O que aparece no quadro e como está composto.
   *
   * É a camada que separava a arte do Fator Criativo da geração normal. O
   * Fator sempre teve uma direção escrita por um modelo de raciocínio — a
   * geração normal recebia só o que o usuário digitasse no dock, e quando
   * ele não digitava nada o prompt caía em "a professional brand", que não
   * diz ao modelo de imagem uma palavra sobre o que desenhar.
   */
  artDirection?: { mainSubject: string; composition: string } | null;
  copy?: PromptCopy;
  productImageCount?: number;
  /** Quantas das fotos anexadas são avatares de persona. */
  avatarCount?: number;
  /**
   * Quantas são produto de verdade.
   *
   * Existe porque `productImageCount` é a SOMA de produtos e avatares — as
   * duas coisas viajam no mesmo canal do backend. Sem separar, não há como
   * dizer ao modelo QUAIS imagens são o produto, e o bloco [PRODUCT] não
   * teria o que indexar.
   */
  productCount?: number;
  preserveFaces?: boolean;
  hasLogo?: boolean;
  /** Story usado como verdade visual quando se gera a versão quadrada. */
  hasStoryReference?: boolean;
  template?: { name: string; category: string | null; layoutStructure: unknown } | null;
  mood?: { adjetivos: string[]; referencias: string[]; evita: string[] } | null;
  antiPadroes?: string[] | null;
  negativePrompt?: string;
}

function languageName(language: string): string {
  if (language === 'pt-BR') return 'Portuguese (Brazil)';
  if (language === 'es') return 'Spanish';
  return 'English';
}

/** Linha do [DO NOT INCLUDE] que corresponde ao formato de verdade. */
function safeAreaViolationLine(area: SafeArea): string {
  const rect = safeRect(area);
  return `- Any headline, body copy, logo, badge or call-to-action outside the safe area (outside x ${rect.x0}-${rect.x1}, y ${rect.y0}-${rect.y1} on the nominal canvas)`;
}

/**
 * Bloco [SAFE ZONE] do prompt.
 *
 * A distinção que sustenta este bloco: safe zone restringe a MENSAGEM, não a
 * imagem. Antes disso, o prompt pedia margem sem dizer para quê, e o modelo
 * encolhia o fundo junto com o texto — desperdiçando o frame inteiro.
 */
export function buildSafeZoneBlock(ratio: CreativeAspectRatio | null | undefined): string {
  const area = safeAreaFor(ratio);
  const rect = safeRect(area);
  const lift = verticalLift(area);
  const type = typeScaleFor(area);
  const { width, height } = area.canvas;

  // Faixas em que nada legível pode entrar, em porcentagem da altura.
  const bandaTexto = { topo: area.topPct, base: 100 - area.bottomPct };

  const linhas: string[] = [
    '[SAFE ZONE]',
    // 0. A regra em termos de composição, não de especificação. Modelo de
    //    imagem posiciona muito melhor a partir de "esta faixa fica vazia" do
    //    que de "mantenha 14% livres" — e o que vem primeiro pesa mais.
    `LAYOUT RULE — READ FIRST: the top ${area.topPct}% and the bottom ${area.bottomPct}% of the image are EMPTY BACKGROUND. No text, no logo, no badge, no button, nothing readable may appear in those bands — they contain only the continuation of the background artwork. Every readable element is grouped together in the band between ${bandaTexto.topo}% and ${bandaTexto.base}% of the image height, and no closer than ${area.sidePct}% to the left or right edge.`,
    // 1. A imagem é livre. Vem cedo porque é o mal-entendido mais caro.
    'IMAGERY IS NOT RESTRICTED. The photograph, background, gradient, texture and any purely visual element MUST fill the entire frame, edge to edge, full bleed. Never shrink, letterbox or inset the artwork to respect the margins below. A full-bleed background is preferred.',
    // 2. A mensagem é presa.
    `THE MESSAGE IS RESTRICTED. Every element that carries meaning — headline, subheadline, body copy, price, date, badge, brand logo and call-to-action — must sit ENTIRELY inside the safe area described below, because the platform UI (profile picture, caption, CTA button, engagement bar) is drawn on top of everything outside it.`,
    // 3. Números: porcentagem manda, pixel é referência.
    `SAFE AREA: keep the top ${area.topPct}% and the bottom ${area.bottomPct}% of the frame free of message elements, plus ${area.sidePct}% on each side. On the nominal ${width}x${height} canvas that is the rectangle from x=${rect.x0} to x=${rect.x1} and from y=${rect.y0} to y=${rect.y1} (${rect.width}x${rect.height}px). The percentages are the rule; the pixels are only a reference.`,
  ];

  // 4. Correção de composição: só entra onde a assimetria é real.
  if (lift >= 20) {
    linhas.push(
      `COMPOSE HIGHER. The safe area is not centred: its vertical midpoint sits ${lift}px ABOVE the centre of the frame. Anything you centre on the canvas will land too low and be covered. Bias the entire text composition upward, into the upper-middle of the frame.`,
    );
  }

  // 5. Tipografia medida contra a caixa segura, não contra o frame.
  linhas.push(
    `TYPE SIZE. Size the type against the SAFE BOX (${rect.width}x${rect.height}px), not against the full frame — type that looks right relative to the whole canvas reads as small once confined to the safe box. At this canvas width use roughly: headline ${type.headlineMin}-${type.headlineMax}px, subheadline ${type.subheadMin}-${type.subheadMax}px, body and data ${type.bodyMin}-${type.bodyMax}px, call-to-action ${type.ctaMin}-${type.ctaMax}px. Text must stay legible on a phone screen.`,
  );

  // 6. Folga. O motivo muda: em tela cheia o aparelho corta ou aplica
  // letterbox; em feed o risco é só o recorte de borda do dispositivo.
  linhas.push(
    area.bottomRightPct
      ? 'LEAVE BREATHING ROOM. Do not push elements right up against the safe boundary. Phones taller than this ratio get the creative zoomed in (cropping whatever falls outside the safe area) or letterboxed, and the advertiser does not control which.'
      : 'LEAVE BREATHING ROOM. Do not push elements right up against the safe boundary — leave visible margin inside it, so edge cropping on some devices never touches the message.',
  );

  // 7. Canto inferior direito: barra de engajamento.
  if (area.bottomRightPct) {
    linhas.push(
      `BOTTOM-RIGHT CORNER: reserve ${area.bottomRightPct}% instead of ${area.bottomPct}% on the right-hand side of the lower area — the like, comment, share and audio controls stack there.`,
    );
  }

  return linhas.join('\n');
}

export function buildCreativePrompt(input: CreativePromptInput): string {
  const {
    aspect,
    aspectRatio,
    resolution,
    language = 'pt-BR',
    businessContext = '',
    designSystemDoc = '',
    artDirection = null,
    copy = null,
    productImageCount = 0,
    avatarCount = 0,
    productCount = 0,
    preserveFaces = true,
    hasLogo = false,
    hasStoryReference = false,
    template = null,
    mood = null,
    antiPadroes = null,
    negativePrompt = '',
  } = input;

  const aspectConfig = aspectRatio && ASPECT_CONFIG[aspectRatio]
    ? ASPECT_CONFIG[aspectRatio]
    : aspect === 'story'
      ? ASPECT_CONFIG['9:16']
      : ASPECT_CONFIG['1:1'];
  const resolutionConfig = resolution && RESOLUTION_CONFIG[resolution]
    ? RESOLUTION_CONFIG[resolution]
    : RESOLUTION_CONFIG['4K'];

  const lang = languageName(language);

  const intro = `[INTRODUCTION]
Create a ${aspectConfig.promptDims} advertisement image for ${businessContext.trim() || 'a professional brand'}.
Quality target: ${resolutionConfig.promptQuality}.`;

  // A frase sobre rosto e pele só entra quando há PESSOA anexada. Antes ela
  // era emitida sempre que houvesse qualquer imagem, então uma lata de
  // refrigerante recebia "do not alter faces, skin tone, body shape" — ruído
  // que gasta atenção do modelo em algo que não existe no quadro.
  const temPessoa = avatarCount > 0;
  const photoBlock = productImageCount > 0
    ? [
        '[ATTACHED PHOTOS]',
        `${productImageCount} reference image(s) provided showing the product/person/scene that must appear in the composition.`,
        // Sem a lista, o ternário sem pessoa deixava uma linha em branco no
        // meio do bloco — mesma classe de ruído do `Not: .` e do
        // `[DESIGN SYSTEM]` órfão.
        preserveFaces && temPessoa
          ? 'Preserve their exact likeness. Do NOT alter faces, skin tone, body shape or appearance in any way. Treat the subject as a fixed reference.'
          : '',
        'Integrate the subject naturally into the composition described below.',
      ].filter(Boolean).join('\n')
    : '';

  /**
   * A única camada positiva do prompt — e ela vem cedo de propósito.
   *
   * Tudo o que segue é restrição: onde o texto NÃO pode ficar, o que NÃO
   * incluir, o que NÃO alterar. Um prompt feito só de restrição produz arte
   * tímida, porque o modelo não recebe nada para construir, só coisas para
   * evitar. Esta é a instrução que diz o que desenhar, então ela vem antes
   * da parede.
   */
  const artDirectionBlock = artDirection && (artDirection.mainSubject.trim() || artDirection.composition.trim())
    ? [
        '[ART DIRECTION]',
        artDirection.mainSubject.trim() ? `Main subject: ${artDirection.mainSubject.trim()}` : '',
        artDirection.composition.trim() ? `Composition: ${artDirection.composition.trim()}` : '',
      ].filter(Boolean).join('\n')
    : '';

  // IMPORTANTE: nunca injetar copy_structure/base_prompt do template — ambos
  // podem conter texto literal (headline, CTA) do projeto em que o template foi
  // salvo, e o modelo de imagem renderiza esse texto antigo junto com a copy
  // atual. O template influencia apenas LAYOUT/ESTILO.
  const templateBlock = template
    ? `[TEMPLATE STRUCTURE]
Use the following reusable template structure as the creative foundation — layout, visual hierarchy, typography rhythm, spacing and composition only.
Template name: ${template.name}
Template category: ${template.category || 'not specified'}
Template visual structure: ${JSON.stringify(template.layoutStructure || {})}

This structure defines LAYOUT AND STYLE ONLY. Do NOT reuse, reference or render any headline, label, subtitle, CTA or body copy from a previous use of this template. ALL text content for this artwork comes exclusively from the [TEXT BLOCKS] section below, verbatim — adapt only the text, product, references and business context from the current project.`
    : '';

  // Sem aspectRatio explícito, 'story' historicamente significa 9:16.
  const safeRatio: CreativeAspectRatio = aspectRatio ?? (aspect === 'story' ? '9:16' : '1:1');
  const safe = buildSafeZoneBlock(safeRatio);

  let textBlocks = '';
  if (copy?.source === 'ai') {
    const parts: string[] = [];
    const blocks = copy.blocks;
    if (blocks.label) parts.push(`LABEL (top, small uppercase, wide tracking, secondary color): "${blocks.label}"`);
    if (blocks.titulo) parts.push(`MAIN TITLE (dominant, large, primary typeface, high contrast): "${blocks.titulo}"`);
    if (blocks.subtitulo) parts.push(`SUBTITLE (medium, secondary typeface, supports the title): "${blocks.subtitulo}"`);
    if (blocks.dados) parts.push(`DATA LINE (small, factual: date/place/price/spots): "${blocks.dados}"`);
    if (blocks.cta) parts.push(`CTA (pill or button, accent color, bold): "${blocks.cta}"`);
    // Sem guarda de parts vazio: mantém paridade exata com o fluxo clássico,
    // para este refactor ser provadamente sem mudança de comportamento. Quem
    // decide se há copy é o chamador, ao passar (ou não) o objeto.
    textBlocks = `[TEXT BLOCKS]
All text must be rendered exactly as written, in ${lang}, with professional typography and perfect legibility.
${parts.join('\n')}`;
  } else if (copy?.source === 'original' && copy.text.trim()) {
    // Uma frase só fazia duas coisas aqui, e só uma delas estava certa:
    // proibia texto novo (certo) e, na mesma respiração, proibia hierarquia
    // (errado). O resultado era arte lisa — o modelo obedecia. Agora as
    // duas regras estão separadas: as PALAVRAS são intocáveis, o DESENHO
    // delas não é.
    const referenciaAoSistema = designSystemDoc.trim()
      ? ' Follow the typography system and hierarchy from the design system above.'
      : '';
    textBlocks = `[TEXT BLOCKS — USER-WRITTEN COPY, FINAL]
Render ONLY the exact text below as overlay on the creative, in ${lang}, professional typography, perfect legibility. Do not paraphrase, shorten, expand or reword it.
"""
${copy.text.trim()}
"""
THE WORDS ARE FIXED. This is the COMPLETE and FINAL copy — the user wrote it themselves. Do NOT add any headline, kicker, tagline, subtitle, CTA label, price, offer or any other text that is not written above, even if the composition seems to have room for it or a reference or template suggests one. If the text above has no explicit call-to-action line, do not invent one.
THE TYPOGRAPHY IS YOURS TO DESIGN. Distribute this exact text across the composition as a designer would: give each line or segment a distinct typographic role — size, weight, case, colour and spacing — instead of setting it all at one size. A short opening line is a label: small, uppercase, wide tracking, secondary colour. The most important line is dominant: large, high contrast, primary typeface. Supporting lines are medium and quieter. If a line above already reads as a call to action, render THAT line inside a pill or button in the accent colour — do not write a new one. A rule, divider or colour accent on a single word is welcome; new words are not.${referenciaAoSistema}`;
  }

  // O [ATTACHED PHOTOS] fala de "product/person/scene" genericamente —
  // fraco demais para sustentar identidade. Quando há avatar anexado, o
  // prompt precisa dizer que aquela pessoa É o talento do anúncio.
  const talentBlock = avatarCount > 0
    ? `[TALENT]
The first ${avatarCount} attached reference image(s) are the TALENT for this advertisement — the person who must appear in the artwork.
Preserve their facial structure, skin tone, hair and overall likeness exactly. Do NOT swap, average or beautify the face.
Place them naturally in the scene described above, at a scale and pose that fits the composition, with lighting that matches the rest of the artwork.`
    : '';

  /**
   * O produto tem a mesma proteção que a pessoa e o logo.
   *
   * Até aqui, `[ATTACHED PHOTOS]` era a única instrução que o produto
   * recebia — e ela só pede para "integrar naturalmente". Enquanto isso o
   * avatar ganhava [TALENT] com "preserve exactly / do NOT swap, average or
   * beautify", e o logo ganhava "do NOT distort, recolor, recreate or
   * redesign". O item que o anúncio de fato vende era o menos protegido dos
   * três, e o modelo tratava a embalagem como sugestão: redesenhava rótulo,
   * mudava proporção, inventava tipografia.
   *
   * A indexação por ORDEM é o que torna o bloco executável. O backend
   * recebe `[...avatares, ...produtos]`, então [TALENT] fala das PRIMEIRAS
   * imagens e este fala das ÚLTIMAS. Sem isso, com avatar e produto
   * anexados juntos, os dois blocos apontariam para o mesmo lugar.
   */
  const productBlock = productCount > 0
    ? `[PRODUCT — CRITICAL]
The last ${productCount} attached reference image(s) are the PRODUCT being advertised. That exact product must appear in the artwork.
Treat it as visual ground truth: preserve its shape, proportions, colour, material, finish, and every label, logo and piece of text printed on it, exactly as photographed.
Do NOT redesign, restyle, simplify, "improve" or re-letter the packaging. Do NOT invent variants, flavours or sizes that are not in the reference.
You may change how it is lit, framed, angled and staged to fit the composition — but the object itself is fixed.`
    : '';

  const logoBlock = hasLogo
    ? `[BRAND LOGO]
A brand logo is provided as a separate reference. Place it discreetly in a corner (top-left or bottom-right preferred), small, clean. Do NOT distort, recolor, recreate or redesign it — treat as a fixed brand asset.`
    : '';

  // Cada linha só entra se tiver conteúdo. Com `evita` vazio o bloco saía
  // com um literal `Not: .` — instrução sem objeto, que ensina o modelo a
  // ler o resto do prompt com menos rigor.
  const moodLinhas = mood
    ? [
        `Feels like: ${mood.referencias.join(', ') || 'professional advertising'}.`,
        mood.adjetivos.length ? `Tone: ${mood.adjetivos.join(', ')}.` : '',
        mood.evita.length ? `Not: ${mood.evita.join(', ')}.` : '',
      ].filter(Boolean)
    : [];
  const moodBlock = moodLinhas.length ? `[MOOD]\n${moodLinhas.join('\n')}` : '';

  const userNegatives = negativePrompt.trim()
    ? negativePrompt.split('\n').map((line) => `- ${line.trim().replace(/^-+\s*/, '')}`).filter((line) => line.length > 2)
    : [];
  const evitaList = mood?.evita.map((item) => `- ${item}`) || [];
  const antiPadroesList = antiPadroes?.map((item) => `- ${item}`) || [];

  // Junta como lista, não como template: com as três primeiras fontes
  // vazias — que é o caso comum — o template deixava uma linha em branco
  // logo abaixo do cabeçalho, no meio de uma lista de itens.
  const doNot = [
    '[DO NOT INCLUDE]',
    ...evitaList,
    ...antiPadroesList,
    ...userNegatives,
    safeAreaViolationLine(safeAreaFor(safeRatio)),
    `- Any text in a language other than ${lang}`,
    '- Misspelled, garbled or fake-looking text',
    '- Watermarks, signatures, low-resolution artifacts',
    '- Generic stock-photo aesthetic',
  ].join('\n');

  const closing = `All text in the artwork MUST be written in ${lang}. Final result: ${resolutionConfig.promptQuality}, polished, professional advertising design, sharp typography, brand-grade composition.`;

  const consistency = aspect === 'square' && hasStoryReference
    ? `[VISUAL CONSISTENCY — CRITICAL]
A reference Story version of this same creative is attached as the FIRST image. The square version MUST replicate its EXACT color palette, lighting, color grading, photographic treatment, typography choices and overall mood. Only the framing/composition changes to fit a 1:1 square. Treat that Story as the visual ground truth — do NOT shift hues, saturation, contrast or styling.`
    : '';

  // `'[DESIGN SYSTEM]\n' + ''` é truthy e passava pelo `.filter(Boolean)`:
  // todo prompt do sistema carregava um cabeçalho sem nada embaixo, e o
  // bloco de copy chegava a mandar seguir "the design system above".
  const designSystemBlock = designSystemDoc.trim() ? `[DESIGN SYSTEM]\n${designSystemDoc.trim()}` : '';

  return [
    intro,
    photoBlock,
    artDirectionBlock,
    designSystemBlock,
    templateBlock,
    safe,
    consistency,
    talentBlock,
    productBlock,
    logoBlock,
    textBlocks,
    moodBlock,
    doNot,
    closing,
  ].filter(Boolean).join('\n\n');
}
