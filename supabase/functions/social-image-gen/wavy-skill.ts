/**
 * WAVY IMAGE SKILL — Server-side prompt builder
 * Simplificado: 3 estratégias visuais, prompts de 6 camadas (tipo, sujeito, narrativa, composição, atmosfera, qualidade).
 * Prompts compactos porém efetivos, melhor controle de resultados.
 */

export type WavyPath = "ia" | "upload";

export interface StyleSpec {
  id: string;
  nome: string;
  caminho: WavyPath;
  /** Template base do prompt — 6 camadas + atmosfera global */
  promptTemplate: string;
}

const COMMON_TAIL = `
No text, no watermark, no logo, no UI overlays, no AI artifacts, no extra or malformed fingers/hands, no uncanny-valley skin, no plastic/waxy rendering.
Any screens, monitors or documents in frame must be turned off, blurred or out of focus — NEVER show generated/legible text on them (garbled fake text is the #1 AI giveaway).
Photorealistic only — not illustrated, not painterly, not 3D-rendered, not CGI, not an "AI-generated" look.`;

export const STYLES: Record<string, StyleSpec> = {
  ugc: {
    id: "ugc",
    nome: "UGC / Celular",
    caminho: "ia",
    promptTemplate: `[TIPO] Authentic UGC photo, shot on a modern smartphone (iPhone-style), a real candid moment someone actually captured — NOT an ad, NOT a stock photo, NOT a studio shoot.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. A real, ordinary-looking person in the middle of a real moment, not modeling for the camera.
[NARRATIVA] Specific situation: {TITULO}. Context: {CORPO}. Everyday, unstaged, a little imperfect — the kind of scene you'd scroll past on a friend's feed.
[COMPOSIÇÃO] Slightly off-kilter handheld framing, natural eye-level or casual angle, subject not perfectly centered, 3:4 portrait vertical with top 15% clear for typography.
[ATMOSFERA] Natural available indoor light (window, lamp, screen glow) or soft daylight — never studio lighting, never a beauty-dish look. Real domestic or office setting (sofa, bed, desk, kitchen, commute). Muted, true-to-life color, {COR_PRIMARIA} only if it appears naturally in the scene. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Phone-camera realism: slightly soft, natural depth, mild sensor noise/grain in shadows, realistic skin with pores and blemishes, no retouching, no bokeh-machine background. Looks like a real photo taken 5 minutes ago, indistinguishable from an actual smartphone snapshot.${COMMON_TAIL}`,
  },
  cinematic: {
    id: "cinematic",
    nome: "Cinematográfico",
    caminho: "ia",
    promptTemplate: `[TIPO] Photojournalism meets narrative cinematography — the visual language of a character-driven documentary crossed with an award-winning portrait. Not a stock photo, not a corporate headshot.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. A real person caught mid-thought or mid-action, not posing for the camera.
[NARRATIVA] Specific situation: {TITULO}. Context: {CORPO}. Expression and body language must read as authentic to this exact moment, not generic "confident business person" stock energy.
[COMPOSIÇÃO] Three-quarter angle or profile, eye level or slightly low angle for presence, rule-of-thirds, 3:4 portrait vertical with top 15% clear for typography. Subject off-center, negative space breathes.
[ATMOSFERA] Single hard key light with visible falloff, subtle rim/edge light separating subject from background, deep chiaroscuro shadows that aren't crushed to pure black. Color grading: {COR_PRIMARIA} as the dominant accent in practicals or wardrobe, teal-orange or desaturated-warm complementary grade. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R IV, 85mm f/1.4 GM. Shallow depth of field, tack-sharp focus on the eyes, creamy circular bokeh. Visible skin texture and pores, natural catchlights in the eyes, no airbrushed skin. Subtle 35mm film grain, warm film-like color science, slightly desaturated shadows. Ultra-realistic, indistinguishable from a real photograph.${COMMON_TAIL}`,
  },
  editorial: {
    id: "editorial",
    nome: "Editorial",
    caminho: "ia",
    promptTemplate: `[TIPO] Editorial magazine photography — the visual language of a Bloomberg Businessweek or Wired cover story. Journalistic, information-forward, never staged-looking corporate stock.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. Real environment and real tools of the trade (screens, documents, workspace), not a generic "person pointing at chart" cliché.
[NARRATIVA] Specific to: {TITULO}. Details: {CORPO}. The scene should feel caught by a photojournalist on assignment, not arranged for a stock shoot.
[COMPOSIÇÃO] Elevated or eye-level angle, 65/35 composition, 3:4 portrait vertical with information hierarchy (top 15% clear for text, data/detail visible around the lower 35%).
[ATMOSFERA] Natural window light or clean studio light, soft shadows, info-forward and legible. Color: {COR_PRIMARIA} as a controlled accent (UI element, object or wardrobe detail), rest of the palette cool-neutral. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R IV, 50mm f/1.8. Moderate depth of field, sharp on the key element with a gently defocused background. Clean digital capture, minimal grain, true-to-life color, no oversaturation or HDR look. Ultra-realistic, publication-ready.${COMMON_TAIL}`,
  },
  minimalist: {
    id: "minimalist",
    nome: "Minimalista",
    caminho: "ia",
    promptTemplate: `[TIPO] Abstract fine art / conceptual photography — the visual language of a gallery print or a high-end brand campaign for an intangible idea. Never generic "gradient background" filler.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. An object, texture or atmospheric phenomenon standing in for the idea, chosen because its form echoes the concept.
[NARRATIVA] Conveys: {TITULO}. Subtext: {CORPO}. The single visual idea should be legible in under a second — resist adding a second competing element.
[COMPOSIÇÃO] Centered or rule-of-thirds, 3:4 portrait vertical. Negative space dominant, one clear focal point. Top/bottom 15% left darker or emptier for text overlay.
[ATMOSFERA] Soft directional light through haze/smoke, or macro lighting that reveals texture at extreme close range. Color: {COR_PRIMARIA} as the singular dominant hue, everything else desaturated toward it. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Fine art / macro specialty lens, extremely shallow focus or evenly soft throughout — pick one, don't mix. Visible material texture (grain, dust, condensation, fabric weave) sharpens the realism. Intangible, contemplative mood, gallery-print quality. Ultra-realistic, not a 3D render.${COMMON_TAIL}`,
  },
};

const TEMPLATE_SUFFIXES: Record<string, string> = {
  // Legacy
  template_1_cover:
    "\n\nCOMPOSITION: Vertical 3:4 portrait 1080x1350px. Top 15% darker/less detail for title. Bottom 15% darker for navigation.",
  template_1_content:
    "\n\nCOMPOSITION: Vertical 3:4 portrait. High contrast, dark mood. Subject centered or rule-of-thirds.",
  post_frase_a:
    "\n\nCOMPOSITION: Vertical 3:4. Dark atmospheric. Subject at edges; center 40% must have breathing room for large text overlay.",
  post_frase_b:
    "\n\nCOMPOSITION: Vertical 3:4. Bright airy warm. Lower-right area lighter/simpler for contrasting dark text.",
  post_frase_cd:
    "\n\nCOMPOSITION: Vertical 3:4. Person upper 60-65%. Lower 35-40% transitions to darker simpler area for text overlay.",
  template_4_virada:
    "\n\nCOMPOSITION: Vertical 3:4. Subject fills top 55%. Lower 40% darker simpler area for numerical data overlay.",
  // Wavy pattern-aligned
  template_1a_step:
    "\n\nCOMPOSITION: Vertical 3:4 LIGHT background, bright and tutorial-friendly. Subject upper 60%; bottom 40% lighter/cleaner area for step instruction text.",
  template_1b_contrast:
    "\n\nCOMPOSITION: Vertical 3:4 DARK background, heavier chiaroscuro, two-tone mood. Center vertical axis kept clean for split contrast text overlay.",
  template_2a_editorial:
    "\n\nCOMPOSITION: Vertical 3:4 EDITORIAL light, real photojournalism feel. Subject occupies upper 65%, lower 35% naturally darker for body text.",
  template_2b_dark:
    "\n\nCOMPOSITION: Vertical 3:4 EDITORIAL DARK with cinematic chiaroscuro, subject lit by a single key light. Bottom 35% deep black for long provocative headline.",
  template_5_master:
    "\n\nCOMPOSITION: Vertical 3:4, symmetric and meditative. Centered minimal icon or abstract gradient. Top 25% AND bottom 35% kept dark/clean for tese/antítese text overlay.",
};

export function buildWavyPrompt(params: {
  style_id?: string;
  template_id?: string;
  visual_prompt: string;
  tema: string;
  slide_titulo?: string;
  slide_corpo?: string;
  sujeito?: string;
  cor_primaria_hex?: string;
  influencia_visual?: string;
  estilo_global?: string;
}): { prompt: string; style_id: string; caminho: WavyPath } {
  const style = STYLES[params.style_id || ""] || STYLES.ugc;
  const suffix = TEMPLATE_SUFFIXES[params.template_id || ""] || TEMPLATE_SUFFIXES.template_1_cover;
  // Substituição via função: evita que '$&', '$$' etc. na copy sejam
  // interpretados como padrões especiais de String.replace.
  const vals: Record<string, string> = {
    VISUAL_PROMPT: params.visual_prompt || "",
    TEMA: params.tema || "",
    TITULO: params.slide_titulo || "",
    CORPO: params.slide_corpo || "",
    SUJEITO: params.sujeito || params.visual_prompt || "the main subject",
    // #FD4638 é o laranja de marca da Wavy (mesmo usado nos templates de design) —
    // manter os dois em paleta evita a foto competir com o accent do carrossel.
    COR_PRIMARIA: params.cor_primaria_hex || "#FD4638",
    INFLUENCIA_VISUAL: params.influencia_visual || "high-end real photography, not stock",
    ESTILO_GLOBAL: params.estilo_global || "",
  };
  const filled = style.promptTemplate.replace(
    /\{(VISUAL_PROMPT|TEMA|TITULO|CORPO|SUJEITO|COR_PRIMARIA|INFLUENCIA_VISUAL|ESTILO_GLOBAL)\}/g,
    (_m, key) => vals[key] ?? "",
  );
  return { prompt: filled + suffix, style_id: style.id, caminho: style.caminho };
}
