/**
 * WAVY IMAGE SKILL — 3 core visual strategies
 * Simplificado de 10 → 3 estilos para reduzir fricção.
 * Cada estilo herda moodboard (cor + influência visual) da Etapa 2.
 * Server-side equivalente em supabase/functions/social-image-gen/wavy-skill.ts
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
}

export const WAVY_STYLES: WavyStyle[] = [
  {
    id: "cinematic",
    nome: "Cinematográfico",
    caminho: "ia",
    emoji: "🎬",
    resumo: "Drama, pessoas, CEO, narrativa. Photojournalism + cinematography.",
    quando: "Quando a história é sobre pessoas, emoção, transformação pessoal.",
    descricao_longa: "Estilo fotojornalístico com qualidade cinematográfica. Sony A7RV, 85mm f/1.4, chiaroscuro. Ideal para: CEO/pessoas reais, momentos dramatúrgicos, narrativas de transformação, mindset."
  },
  {
    id: "editorial",
    nome: "Editorial",
    caminho: "ia",
    emoji: "📰",
    resumo: "Jornalístico, dados, cases, números. Bloomberg/Wired quality.",
    quando: "Quando o foco é dados, resultados, provas numéricas, análise.",
    descricao_longa: "Estilo editorial jornalístico. Bloomberg, Wired, NYT quality. Composição 65/35, informação clara, números legíveis. Ideal para: slides de prova, resultados, cases de cliente, dashboards, methodology."
  },
  {
    id: "minimalist",
    nome: "Minimalista",
    caminho: "ia",
    emoji: "✨",
    resumo: "Abstrato, conceitual, gradientes. Quando o texto domina.",
    quando: "Quando o conceito/ideia é mais importante que o objeto visual.",
    descricao_longa: "Estilo conceitual e fine art. Atmospheric gradients, macro abstrato, bokeh circles, negative space. Ideal para: slides statement, frase mestre, valor intangível, estratégia pura."
  },
];

export function getStyle(id: string): WavyStyle | undefined {
  return WAVY_STYLES.find((s) => s.id === id);
}

const CINEMATIC_KEYWORDS = ["zuckerberg", "mark zuck", "jensen", "huang", "sam altman", "tim cook", "elon", "musk", "bezos", "pessoa", "mindset", "decisão", "decisao", "escala", "crescimento", "ambição", "ambicao", "robô", "robo", "robot", "ia", "inteligência artificial", "automação", "automacao", "automation", "ai"];
const EDITORIAL_KEYWORDS = ["roas", "faturamento", "leads", "r$", "%", "conversões", "conversoes", "dashboard", "ads manager", "campanha", "processo", "workflow", "resultado", "número", "numero", "caso", "case", "prova"];
const MINIMALIST_KEYWORDS = ["valor", "qualidade", "conceito", "estratégia", "estrategia", "intangível", "intangivel", "filosofia", "pensamento", "ideia", "premium", "exclusivo", "luxo"];

const lower = (s?: string) => (s || "").toLowerCase();
const hasAny = (h: string, n: string[]) => n.some((x) => h.includes(x));

/** Heurística simplificada: sempre retorna um dos 3 estilos core. */
export function suggestStyle(slide: Slide, tema?: string, pattern?: CopyPatternId | null, visual_strategy?: string): WavyStyle {
  const text = [slide.titulo, slide.corpo, slide.visual_prompt, tema].map(lower).join(" ");

  // Se moodboard definiu estratégia visual, usar como base
  if (visual_strategy === "cinematic") return getStyle("cinematic")!;
  if (visual_strategy === "editorial") return getStyle("editorial")!;
  if (visual_strategy === "minimalist") return getStyle("minimalist")!;

  // Caso contrário, heurística por conteúdo
  if (hasAny(text, EDITORIAL_KEYWORDS)) return getStyle("editorial")!;
  if (hasAny(text, MINIMALIST_KEYWORDS)) return getStyle("minimalist")!;
  if (hasAny(text, CINEMATIC_KEYWORDS)) return getStyle("cinematic")!;

  // Fallback por tipo de slide
  if (slide.tipo === "prova") return getStyle("editorial")!;
  if (slide.tipo === "cta") return getStyle("cinematic")!;
  if (slide.tipo === "cover") return getStyle("cinematic")!;

  // Default universal
  return getStyle("editorial")!;
}

/** Sufixo de composição enviado ao prompt builder server-side, derivado do pattern. */
export function templateSuffixFromPattern(p: CopyPatternId): string {
  switch (p) {
    case "1A": return "template_1a_step";
    case "1B": return "template_1b_contrast";
    case "2A": return "template_2a_editorial";
    case "2B": return "template_2b_dark";
    case "4":  return "post_frase_a";
    case "5":  return "template_5_master";
    case "3":  return "template_1_cover"; // reel não usa, mas fallback seguro
  }
}
