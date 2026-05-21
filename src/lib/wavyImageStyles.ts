/**
 * WAVY IMAGE SKILL — Client metadata
 * 10 estilos visuais + heurística de sugestão (sem custo de API).
 * Server-side equivalente em supabase/functions/social-image-gen/wavy-skill.ts
 */
import type { Slide, Formato } from "@/types/social";

export type WavyPath = "ia" | "upload";

export interface WavyStyle {
  id: string;
  nome: string;
  caminho: WavyPath;
  resumo: string; // descrição curta usada na sugestão (1-2 linhas)
  quando: string; // quando usar
  emoji: string;
}

export const WAVY_STYLES: WavyStyle[] = [
  {
    id: "ceo_hiperreal",
    nome: "CEO Hiper-realista",
    caminho: "ia",
    emoji: "🧑‍💼",
    resumo: "CEO real (Zuckerberg, Jensen, Altman…) em situação improvável e cinematográfica.",
    quando: "Cover ou slide que cita figura pública de tech.",
  },
  {
    id: "cinematico",
    nome: "Cinematográfico Dramático",
    caminho: "ia",
    emoji: "🎬",
    resumo: "Cena de thriller corporativo ou sci-fi — robô, IA, ambiente futurista.",
    quando: "IA, automação, futuro do trabalho, disrupção.",
  },
  {
    id: "editorial_real",
    nome: "Editorial de Pessoa Real",
    caminho: "upload",
    emoji: "📸",
    resumo: "Foto real do Rael, cliente ou parceiro em contexto de trabalho.",
    quando: "Posicionamento pessoal, case real, post frase com pessoa.",
  },
  {
    id: "objeto_premium",
    nome: "Objeto Premium Isolado",
    caminho: "ia",
    emoji: "💎",
    resumo: "Close macro extremo em objeto de luxo. Comunica valor antes da palavra.",
    quando: "Posicionamento premium, cobrar mais caro, qualidade > preço.",
  },
  {
    id: "marca_organica",
    nome: "Composição com Marca",
    caminho: "ia",
    emoji: "🏷️",
    resumo: "Pessoa ou ambiente com marca integrada organicamente — parece foto real.",
    quando: "Cover sobre empresa tech, lançamento de produto.",
  },
  {
    id: "gradiente_atmosferico",
    nome: "Gradiente Atmosférico",
    caminho: "ia",
    emoji: "🌫️",
    resumo: "Sem objeto. Gradiente + grain que age como imagem.",
    quando: "Slides statement, frase mestre, quando o texto domina.",
  },
  {
    id: "workspace_tech",
    nome: "Workspace Tech",
    caminho: "ia",
    emoji: "🖥️",
    resumo: "Setup ou ambiente tech sem rosto. Presença humana sugerida.",
    quando: "Processo, dashboards, metodologia, gestão de tráfego.",
  },
  {
    id: "resultado_numero",
    nome: "Resultado com Número",
    caminho: "upload",
    emoji: "📊",
    resumo: "Foto real ou screenshot do dashboard com número de resultado.",
    quando: "Slide de virada com prova numérica, case de cliente.",
  },
  {
    id: "pessoa_pequena",
    nome: "Pessoa Pequena em Espaço Grande",
    caminho: "ia",
    emoji: "🏛️",
    resumo: "Figura humana mínima (10-15%) em arquitetura imponente.",
    quando: "Mindset, escala, ambição, peso da decisão.",
  },
  {
    id: "macro_abstrato",
    nome: "Macro Abstrato",
    caminho: "ia",
    emoji: "✨",
    resumo: "Macro extremo + bokeh. Reconhecível mas não literal.",
    quando: "Valor intangível, estratégia, qualidade > quantidade.",
  },
];

export function getStyle(id: string): WavyStyle | undefined {
  return WAVY_STYLES.find((s) => s.id === id);
}

const CEO_KEYWORDS = [
  "zuckerberg", "mark zuck", "jensen", "huang", "nvidia", "sam altman", "altman",
  "openai", "tim cook", "apple", "elon", "musk", "tesla", "bezos", "amazon",
  "sundar", "pichai", "google", "satya", "nadella", "microsoft", "meta",
];
const TECH_BRAND_KEYWORDS = ["meta ads", "google ads", "tiktok ads", "pixel", "ga4", "gtm", "blackwell", "gpu"];
const ROBOT_AI_KEYWORDS = ["robô", "robo", "robot", "ia", "inteligência artificial", "automação", "automacao", "automation", "ai ", "chatgpt"];
const RAEL_CLIENT_KEYWORDS = ["rael", "cliente wavy", "wavy", "nosso cliente"];
const NUMBER_RESULT_KEYWORDS = ["roas", "faturamento", "leads", "r$", "%", "conversões", "conversoes"];
const HARDWARE_KEYWORDS = ["rolex", "relógio", "relogio", "carro", "chip", "iphone", "macbook", "produto físico"];
const WORKSPACE_KEYWORDS = ["dashboard", "ads manager", "campanha", "processo", "workflow", "setup", "monitor"];
const MINDSET_KEYWORDS = ["mindset", "decisão", "decisao", "escala", "crescimento", "ambição", "ambicao", "custo de não"];
const PREMIUM_KEYWORDS = ["premium", "valor", "qualidade", "exclusivo", "luxo"];

function lower(s: string | undefined): string {
  return (s || "").toLowerCase();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/** Heurística zero-custo para sugerir estilo por slide. */
export function suggestStyle(slide: Slide, tema?: string): WavyStyle {
  const text = [slide.titulo, slide.corpo, slide.visual_prompt, tema].map(lower).join(" ");

  if (hasAny(text, CEO_KEYWORDS)) return getStyle("ceo_hiperreal")!;
  if (hasAny(text, NUMBER_RESULT_KEYWORDS)) return getStyle("resultado_numero")!;
  if (hasAny(text, RAEL_CLIENT_KEYWORDS)) return getStyle("editorial_real")!;
  if (hasAny(text, ROBOT_AI_KEYWORDS)) return getStyle("cinematico")!;
  if (hasAny(text, HARDWARE_KEYWORDS)) return getStyle("objeto_premium")!;
  if (hasAny(text, TECH_BRAND_KEYWORDS)) return getStyle("marca_organica")!;
  if (hasAny(text, WORKSPACE_KEYWORDS)) return getStyle("workspace_tech")!;
  if (hasAny(text, MINDSET_KEYWORDS)) return getStyle("pessoa_pequena")!;
  if (hasAny(text, PREMIUM_KEYWORDS)) return getStyle("macro_abstrato")!;

  // Defaults por tipo de slide
  if (slide.tipo === "cover") return getStyle("cinematico")!;
  if (slide.tipo === "cta") return getStyle("editorial_real")!;
  if (slide.tipo === "prova") return getStyle("resultado_numero")!;
  return getStyle("gradiente_atmosferico")!;
}

export function templateSuffixFromFormato(f: Formato): string {
  if (f === "carrossel_texto") return "post_frase_a";
  if (f === "carrossel_lista") return "template_1_content";
  if (f === "post_unico") return "post_frase_a";
  return "template_1_cover";
}
