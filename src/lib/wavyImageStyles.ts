/**
 * WAVY IMAGE SKILL — 3 estratégias visuais editáveis
 *
 * Cada estilo carrega o "skill" (promptTemplate) usado para montar o prompt
 * final de geração de imagem. O texto é editável pelo usuário na Etapa 5
 * (painel "Editar estilos") e persistido em social_image_style_skills.
 *
 * O ESTILO é desacoplado do template de copy: a sugestão vem da leitura da
 * copy inteira, não do pattern_id. O pattern só define a COMPOSIÇÃO/layout
 * (onde sobra espaço para texto), via TEMPLATE_SUFFIXES.
 */
import type { Slide, CopyPatternId } from "@/types/social";

export type WavyPath = "ia" | "upload";

export interface WavyStyle {
  id: string;
  nome: string;
  caminho: WavyPath;
  resumo: string;
  quando: string;
  emoji: string;
  descricao_longa: string;
  /** Skill editável: template do prompt com placeholders {VISUAL_PROMPT}, {TEMA}, {TITULO}, {CORPO}, {COR_PRIMARIA}, {INFLUENCIA_VISUAL}. */
  promptTemplate: string;
  /** true = estilo embutido (editável, não deletável). false = custom do usuário. */
  builtin: boolean;
}

const COMMON_TAIL = `
No text, no watermark, no logo, no UI overlays, no AI artifacts, no extra or malformed fingers/hands, no uncanny-valley skin, no plastic/waxy rendering.
Photorealistic only — not illustrated, not painterly, not 3D-rendered, not CGI, not an "AI-generated" look.`;

export const WAVY_STYLES: WavyStyle[] = [
  {
    id: "cinematic",
    nome: "Cinematográfico",
    caminho: "ia",
    builtin: true,
    emoji: "🎬",
    resumo: "Drama, pessoas, narrativa. Photojournalism + cinematography.",
    quando: "Quando a história é sobre pessoas, emoção, transformação pessoal.",
    descricao_longa:
      "Estilo fotojornalístico com qualidade cinematográfica. Sony A7RV, 85mm f/1.4, chiaroscuro. Ideal para pessoas reais, momentos dramatúrgicos, narrativas de transformação, mindset.",
    promptTemplate: `[TIPO] Photojournalism meets narrative cinematography — the visual language of a character-driven documentary crossed with an award-winning portrait. Not a stock photo, not a corporate headshot.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. A real person caught mid-thought or mid-action, not posing for the camera.
[NARRATIVA] Specific situation: {TITULO}. Context: {CORPO}. Expression and body language must read as authentic to this exact moment, not generic "confident business person" stock energy.
[COMPOSIÇÃO] Three-quarter angle or profile, eye level or slightly low angle for presence, rule-of-thirds, 3:4 portrait vertical with top 15% clear for typography. Subject off-center, negative space breathes.
[ATMOSFERA] Single hard key light with visible falloff, subtle rim/edge light separating subject from background, deep chiaroscuro shadows that aren't crushed to pure black. Color grading: {COR_PRIMARIA} as the dominant accent in practicals or wardrobe, teal-orange or desaturated-warm complementary grade. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R IV, 85mm f/1.4 GM. Shallow depth of field, tack-sharp focus on the eyes, creamy circular bokeh. Visible skin texture and pores, natural catchlights in the eyes, no airbrushed skin. Subtle 35mm film grain, warm film-like color science, slightly desaturated shadows. Ultra-realistic, indistinguishable from a real photograph.${COMMON_TAIL}`,
  },
  {
    id: "editorial",
    nome: "Editorial",
    caminho: "ia",
    builtin: true,
    emoji: "📰",
    resumo: "Jornalístico, dados, cases, números. Bloomberg/Wired quality.",
    quando: "Quando o foco é dados, resultados, provas numéricas, análise.",
    descricao_longa:
      "Estilo editorial jornalístico. Bloomberg, Wired, NYT quality. Composição 65/35, informação clara, números legíveis. Ideal para slides de prova, resultados, cases de cliente, dashboards, metodologia.",
    promptTemplate: `[TIPO] Editorial magazine photography — the visual language of a Bloomberg Businessweek or Wired cover story. Journalistic, information-forward, never staged-looking corporate stock.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. Real environment and real tools of the trade (screens, documents, workspace), not a generic "person pointing at chart" cliché.
[NARRATIVA] Specific to: {TITULO}. Details: {CORPO}. The scene should feel caught by a photojournalist on assignment, not arranged for a stock shoot.
[COMPOSIÇÃO] Elevated or eye-level angle, 65/35 composition, 3:4 portrait vertical with information hierarchy (top 15% clear for text, data/detail visible around the lower 35%).
[ATMOSFERA] Natural window light or clean studio light, soft shadows, info-forward and legible. Color: {COR_PRIMARIA} as a controlled accent (UI element, object or wardrobe detail), rest of the palette cool-neutral. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Shot on Sony A7R IV, 50mm f/1.8. Moderate depth of field, sharp on the key element with a gently defocused background. Clean digital capture, minimal grain, true-to-life color, no oversaturation or HDR look. Ultra-realistic, publication-ready.${COMMON_TAIL}`,
  },
  {
    id: "minimalist",
    nome: "Minimalista",
    caminho: "ia",
    builtin: true,
    emoji: "✨",
    resumo: "Abstrato, conceitual, gradientes. Quando o texto domina.",
    quando: "Quando o conceito/ideia é mais importante que o objeto visual.",
    descricao_longa:
      "Estilo conceitual e fine art. Atmospheric gradients, macro abstrato, bokeh circles, negative space. Ideal para slides statement, frase mestre, valor intangível, estratégia pura.",
    promptTemplate: `[TIPO] Abstract fine art / conceptual photography — the visual language of a gallery print or a high-end brand campaign for an intangible idea. Never generic "gradient background" filler.
[SUJEITO] {VISUAL_PROMPT} — tema {TEMA}. An object, texture or atmospheric phenomenon standing in for the idea, chosen because its form echoes the concept.
[NARRATIVA] Conveys: {TITULO}. Subtext: {CORPO}. The single visual idea should be legible in under a second — resist adding a second competing element.
[COMPOSIÇÃO] Centered or rule-of-thirds, 3:4 portrait vertical. Negative space dominant, one clear focal point. Top/bottom 15% left darker or emptier for text overlay.
[ATMOSFERA] Soft directional light through haze/smoke, or macro lighting that reveals texture at extreme close range. Color: {COR_PRIMARIA} as the singular dominant hue, everything else desaturated toward it. Reference: {INFLUENCIA_VISUAL}.
[QUALIDADE] Fine art / macro specialty lens, extremely shallow focus or evenly soft throughout — pick one, don't mix. Visible material texture (grain, dust, condensation, fabric weave) sharpens the realism. Intangible, contemplative mood, gallery-print quality. Ultra-realistic, not a 3D render.${COMMON_TAIL}`,
  },
];

/** Composição/layout derivada do pattern (espaço para texto + leve direção de luz/clima por padrão). */
const TEMPLATE_SUFFIXES: Record<string, string> = {
  template_1a_step:
    "\n\nCOMPOSITION: Vertical 3:4, bright and tutorial-friendly light. Subject upper 60%; bottom 40% cleaner, lighter area for step instruction text.",
  template_1b_contrast:
    "\n\nCOMPOSITION: Vertical 3:4, heavier chiaroscuro, two-tone mood. Center vertical axis kept clean for split contrast text overlay.",
  template_2a_editorial:
    "\n\nCOMPOSITION: Vertical 3:4, real photojournalism feel. Subject occupies upper 65%, lower 35% naturally darker for body text.",
  template_2b_dark:
    "\n\nCOMPOSITION: Vertical 3:4, cinematic chiaroscuro, subject lit by a single key light. Bottom 35% deep dark for long provocative headline.",
  post_frase_a:
    "\n\nCOMPOSITION: Vertical 3:4, dark atmospheric mood. Subject at edges; center 40% must have breathing room for large text overlay.",
  template_5_master:
    "\n\nCOMPOSITION: Vertical 3:4, symmetric and meditative. Top 25% AND bottom 35% kept dark/clean for tese/antítese text overlay.",
  template_1_cover:
    "\n\nCOMPOSITION: Vertical 3:4 portrait 1080x1350px. Top 15% and bottom 15% darker for title/navigation.",
};

export function getStyle(id: string, styles: WavyStyle[] = WAVY_STYLES): WavyStyle | undefined {
  return styles.find((s) => s.id === id);
}

/** Sufixo de composição enviado ao prompt builder, derivado do pattern. */
export function templateSuffixFromPattern(p: CopyPatternId): string {
  switch (p) {
    case "1A": return "template_1a_step";
    case "1B": return "template_1b_contrast";
    case "2A": return "template_2a_editorial";
    case "2B": return "template_2b_dark";
    case "4":  return "post_frase_a";
    case "5":  return "template_5_master";
    case "3":  return "template_1_cover";
  }
}

/**
 * Monta o prompt final no client (mesma lógica do server), para poder exibir
 * e editar o prompt no drawer lateral antes de gerar.
 */
export function buildImagePrompt(params: {
  style: WavyStyle;
  template_id?: string;
  visual_prompt: string;
  tema: string;
  slide_titulo?: string;
  slide_corpo?: string;
  cor_primaria_hex?: string;
  influencia_visual?: string;
}): string {
  const suffix = TEMPLATE_SUFFIXES[params.template_id || ""] || TEMPLATE_SUFFIXES.template_1_cover;
  // Substituição via função: evita que '$&', '$$' etc. na copy sejam
  // interpretados como padrões especiais de String.replace.
  const vals: Record<string, string> = {
    VISUAL_PROMPT: params.visual_prompt || "",
    TEMA: params.tema || "",
    TITULO: params.slide_titulo || "",
    CORPO: params.slide_corpo || "",
    // #FD4638 é o laranja de marca da Wavy (mesmo usado nos templates de design) —
    // manter os dois em paleta evita a foto competir com o accent do carrossel.
    COR_PRIMARIA: params.cor_primaria_hex || "#FD4638",
    INFLUENCIA_VISUAL: params.influencia_visual || "high-end real photography, not stock",
  };
  const filled = params.style.promptTemplate.replace(
    /\{(VISUAL_PROMPT|TEMA|TITULO|CORPO|COR_PRIMARIA|INFLUENCIA_VISUAL)\}/g,
    (_m, key) => vals[key] ?? "",
  );
  return filled + suffix;
}

const CINEMATIC_KEYWORDS = ["pessoa", "pessoas", "gestor", "ceo", "cliente", "equipe", "time", "história", "historia", "jornada", "mindset", "decisão", "decisao", "medo", "coragem", "sonho", "vida", "rotina", "humano", "emoção", "emocao", "transformação", "transformacao"];
const EDITORIAL_KEYWORDS = ["roas", "faturamento", "faturou", "leads", "r$", "%", "conversões", "conversoes", "dashboard", "ads manager", "campanha", "métrica", "metrica", "resultado", "número", "numero", "dados", "caso", "case", "prova", "relatório", "relatorio", "analise", "análise"];
const MINIMALIST_KEYWORDS = ["valor", "qualidade", "conceito", "estratégia", "estrategia", "intangível", "intangivel", "filosofia", "pensamento", "ideia", "princípio", "principio", "premium", "exclusivo", "essência", "essencia", "simplicidade"];

const lower = (s?: string) => (s || "").toLowerCase();
const countHits = (h: string, n: string[]) => n.reduce((acc, x) => acc + (h.includes(x) ? 1 : 0), 0);

/**
 * Sugere um estilo lendo a copy inteira (contexto global) + o slide específico.
 * Desacoplado do template — decide só pelo conteúdo textual.
 */
export function suggestStyleId(slide: Slide, fullCopyText: string, tema?: string): string {
  // slide pesa mais (x2) que o contexto global, mas ambos contam
  const slideText = [slide.titulo, slide.corpo, slide.visual_prompt].map(lower).join(" ");
  const globalText = [fullCopyText, tema].map(lower).join(" ");

  const score = (kws: string[]) => countHits(slideText, kws) * 2 + countHits(globalText, kws);

  const scores: Record<string, number> = {
    cinematic: score(CINEMATIC_KEYWORDS),
    editorial: score(EDITORIAL_KEYWORDS),
    minimalist: score(MINIMALIST_KEYWORDS),
  };

  // Vieses leves por tipo de slide (desempate, não sobrepõe conteúdo forte)
  if (slide.tipo === "prova") scores.editorial += 1;
  if (slide.tipo === "cover" || slide.tipo === "cta") scores.cinematic += 1;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  // Se ninguém pontuou, default editorial (neutro/versátil)
  if (best[0][1] === 0) return "editorial";
  return best[0][0];
}
