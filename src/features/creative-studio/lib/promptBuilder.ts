import { ASPECT_CONFIG, RESOLUTION_CONFIG } from '../constants/formats';
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
  copy?: PromptCopy;
  productImageCount?: number;
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

export function buildCreativePrompt(input: CreativePromptInput): string {
  const {
    aspect,
    aspectRatio,
    resolution,
    language = 'pt-BR',
    businessContext = '',
    designSystemDoc = '',
    copy = null,
    productImageCount = 0,
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

  const photoBlock = productImageCount > 0
    ? `[ATTACHED PHOTOS]
${productImageCount} reference image(s) provided showing the product/person/scene that must appear in the composition.
${preserveFaces ? 'Preserve their exact likeness. Do NOT alter faces, skin tone, body shape or appearance in any way. Treat the subject as a fixed reference.' : ''}
Integrate the subject naturally into the composition described below.`
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

  const safe = `[SAFE ZONE]
${aspectConfig.safeZone}
${aspect === 'square' ? 'Centered composition optimized for square 1:1 framing.' : ''}`;

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
    textBlocks = `[TEXT BLOCKS — USER-WRITTEN COPY, FINAL]
Render ONLY the exact text below as overlay on the creative, in ${lang}, professional typography, perfect legibility. Do not paraphrase, shorten, expand or reword it.
"""
${copy.text.trim()}
"""
This is the COMPLETE and FINAL copy — the user wrote it themselves and it must not be changed. Do NOT add any headline, kicker, tagline, subtitle, CTA button, price, offer or any other text that is not written above, even if the composition seems to have room for it or a reference/template suggests one. If the text above has no explicit call-to-action line, do not invent one. Distribute exactly this text across the composition following the typography system and hierarchy from the design system above — do not add new text elements to fill the layout.`;
  }

  const logoBlock = hasLogo
    ? `[BRAND LOGO]
A brand logo is provided as a separate reference. Place it discreetly in a corner (top-left or bottom-right preferred), small, clean. Do NOT distort, recolor, recreate or redesign it — treat as a fixed brand asset.`
    : '';

  const moodBlock = mood
    ? `[MOOD]
Feels like: ${mood.referencias.join(', ') || 'professional advertising'}.
Tone: ${mood.adjetivos.join(', ')}.
Not: ${mood.evita.join(', ')}.`
    : '';

  const userNegatives = negativePrompt.trim()
    ? negativePrompt.split('\n').map((line) => `- ${line.trim().replace(/^-+\s*/, '')}`).filter((line) => line.length > 2)
    : [];
  const evitaList = mood?.evita.map((item) => `- ${item}`) || [];
  const antiPadroesList = antiPadroes?.map((item) => `- ${item}`) || [];

  const doNot = `[DO NOT INCLUDE]
${[...evitaList, ...antiPadroesList, ...userNegatives].join('\n')}
- Any element within the top or bottom safe zones
- Any text in a language other than ${lang}
- Misspelled, garbled or fake-looking text
- Watermarks, signatures, low-resolution artifacts
- Generic stock-photo aesthetic`;

  const closing = `All text in the artwork MUST be written in ${lang}. Final result: ${resolutionConfig.promptQuality}, polished, professional advertising design, sharp typography, brand-grade composition.`;

  const consistency = aspect === 'square' && hasStoryReference
    ? `[VISUAL CONSISTENCY — CRITICAL]
A reference Story version of this same creative is attached as the FIRST image. The square version MUST replicate its EXACT color palette, lighting, color grading, photographic treatment, typography choices and overall mood. Only the framing/composition changes to fit a 1:1 square. Treat that Story as the visual ground truth — do NOT shift hues, saturation, contrast or styling.`
    : '';

  return [
    intro,
    photoBlock,
    '[DESIGN SYSTEM]\n' + designSystemDoc,
    templateBlock,
    safe,
    consistency,
    logoBlock,
    textBlocks,
    moodBlock,
    doNot,
    closing,
  ].filter(Boolean).join('\n\n');
}
