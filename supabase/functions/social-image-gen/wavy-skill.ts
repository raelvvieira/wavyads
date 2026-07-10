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
No text, no watermark, no logo, no AI artifacts.
Photorealistic only — not illustrated, not painterly, not CGI.`;

export const STYLES: Record<string, StyleSpec> = {
  cinematic: {
    id: "cinematic",
    nome: "Cinematográfico",
    caminho: "ia",
    promptTemplate: `[TIPO] Photojournalism meets cinematography, editorial quality.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}.
[NARRATIVA] Specific situation: {TITULO}. Context: {CORPO}.
[COMPOSIÇÃO] Three-quarter angle, eye level, rule-of-thirds, 3:4 portrait vertical with top 15% clear for typography.
[ATMOSFERA] Cinematic lighting: hard key, rim light, chiaroscuro. Color scheme: {COR_PRIMARIA} primary + complementary. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R V, 85mm f/1.4. Shallow DoF, sharp on subject, creamy bokeh. No watermark, no AI artifacts.${COMMON_TAIL}`,
  },
  editorial: {
    id: "editorial",
    nome: "Editorial",
    caminho: "ia",
    promptTemplate: `[TIPO] Editorial magazine photography, Bloomberg/Wired quality, journalistic.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}.
[NARRATIVA] Specific to: {TITULO}. Details: {CORPO}.
[COMPOSIÇÃO] Elevated angle, 65/35 composition, 3:4 portrait vertical with information hierarchy (top 15% clear for text, data visible at 35% bottom).
[ATMOSFERA] Natural or studio lighting, info-forward. Color: {COR_PRIMARIA} + warm/cool balance. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R V, 50mm f/1.8. Moderate DoF, sharp on key element. Clean, professional, no grain.${COMMON_TAIL}`,
  },
  minimalist: {
    id: "minimalist",
    nome: "Minimalista",
    caminho: "ia",
    promptTemplate: `[TIPO] Abstract fine art, conceptual photography, macro detail or atmospheric.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}.
[NARRATIVA] Conveys: {TITULO}. Subtext: {CORPO}.
[COMPOSIÇÃO] Centered or rule-of-thirds, 3:4 portrait vertical. Negative space dominant, minimal objects. Top/bottom 15% darker for text overlay.
[ATMOSFERA] Subtle, atmospheric. Atmospheric gradient or extreme macro + bokeh. Color: {COR_PRIMARIA} primary, desaturated complementary. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot fine art / macro specialty. Highly selective focus or soft throughout. Intangible feeling. No text, clean.${COMMON_TAIL}`,
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
    "\n\nCOMPOSITION: Vertical 3:4 LIGHT background. Subject upper 60%; bottom 40% lighter/cleaner area for step instruction text. Bright and tutorial-friendly.",
  template_1b_contrast:
    "\n\nCOMPOSITION: Vertical 3:4 DARK background. Center vertical axis kept clean for split contrast text overlay. Heavy chiaroscuro, two-tone mood.",
  template_2a_editorial:
    "\n\nCOMPOSITION: Vertical 3:4 EDITORIAL light, Bloomberg/Wired magazine quality. Subject occupies upper 65%, lower 35% naturally darker for body text. Real photojournalism feel.",
  template_2b_dark:
    "\n\nCOMPOSITION: Vertical 3:4 EDITORIAL DARK with cinematic chiaroscuro. Subject in shadow with single key light. Bottom 35% deep black for long provocative headline.",
  template_5_master:
    "\n\nCOMPOSITION: Vertical 3:4. Centered minimal icon or abstract gradient. Top 25% AND bottom 35% kept dark/clean for tese/antítese text overlay. Symmetric and meditative.",
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
  const style = STYLES[params.style_id || ""] || STYLES.editorial;
  const suffix = TEMPLATE_SUFFIXES[params.template_id || ""] || TEMPLATE_SUFFIXES.template_1_cover;
  const filled = style.promptTemplate
    .replace(/\{VISUAL_PROMPT\}/g, params.visual_prompt || "")
    .replace(/\{TEMA\}/g, params.tema || "")
    .replace(/\{TITULO\}/g, params.slide_titulo || "")
    .replace(/\{CORPO\}/g, params.slide_corpo || "")
    .replace(/\{SUJEITO\}/g, params.sujeito || params.visual_prompt || "the main subject")
    .replace(/\{COR_PRIMARIA\}/g, params.cor_primaria_hex || "#00D9FF")
    .replace(/\{INFLUENCIA_VISUAL\}/g, params.influencia_visual || "editorial magazine quality")
    .replace(/\{ESTILO_GLOBAL\}/g, params.estilo_global || "");
  return { prompt: filled + suffix, style_id: style.id, caminho: style.caminho };
}
