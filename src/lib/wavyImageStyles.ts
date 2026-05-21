/**
 * WAVY IMAGE SKILL — Client metadata
 * 10 estilos visuais + heurística de sugestão (sem custo de API).
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
}

export const WAVY_STYLES: WavyStyle[] = [
  { id: "ceo_hiperreal", nome: "CEO Hiper-realista", caminho: "ia", emoji: "🧑‍💼", resumo: "CEO real (Zuckerberg, Jensen, Altman…) em situação improvável e cinematográfica.", quando: "Cover ou slide que cita figura pública de tech." },
  { id: "cinematico", nome: "Cinematográfico Dramático", caminho: "ia", emoji: "🎬", resumo: "Cena de thriller corporativo ou sci-fi — robô, IA, ambiente futurista.", quando: "IA, automação, futuro do trabalho, disrupção." },
  { id: "editorial_real", nome: "Editorial de Pessoa Real", caminho: "upload", emoji: "📸", resumo: "Foto real do Rael, cliente ou parceiro em contexto de trabalho.", quando: "Posicionamento pessoal, case real, post frase com pessoa." },
  { id: "objeto_premium", nome: "Objeto Premium Isolado", caminho: "ia", emoji: "💎", resumo: "Close macro extremo em objeto de luxo. Comunica valor antes da palavra.", quando: "Posicionamento premium, cobrar mais caro, qualidade > preço." },
  { id: "marca_organica", nome: "Composição com Marca", caminho: "ia", emoji: "🏷️", resumo: "Pessoa ou ambiente com marca integrada organicamente — parece foto real.", quando: "Cover sobre empresa tech, lançamento de produto." },
  { id: "gradiente_atmosferico", nome: "Gradiente Atmosférico", caminho: "ia", emoji: "🌫️", resumo: "Sem objeto. Gradiente + grain que age como imagem.", quando: "Slides statement, frase mestre, quando o texto domina." },
  { id: "workspace_tech", nome: "Workspace Tech", caminho: "ia", emoji: "🖥️", resumo: "Setup ou ambiente tech sem rosto. Presença humana sugerida.", quando: "Processo, dashboards, metodologia, gestão de tráfego." },
  { id: "resultado_numero", nome: "Resultado com Número", caminho: "upload", emoji: "📊", resumo: "Foto real ou screenshot do dashboard com número de resultado.", quando: "Slide de virada com prova numérica, case de cliente." },
  { id: "pessoa_pequena", nome: "Pessoa Pequena em Espaço Grande", caminho: "ia", emoji: "🏛️", resumo: "Figura humana mínima (10-15%) em arquitetura imponente.", quando: "Mindset, escala, ambição, peso da decisão." },
  { id: "macro_abstrato", nome: "Macro Abstrato", caminho: "ia", emoji: "✨", resumo: "Macro extremo + bokeh. Reconhecível mas não literal.", quando: "Valor intangível, estratégia, qualidade > quantidade." },
];

export function getStyle(id: string): WavyStyle | undefined {
  return WAVY_STYLES.find((s) => s.id === id);
}

const CEO_KEYWORDS = ["zuckerberg", "mark zuck", "jensen", "huang", "nvidia", "sam altman", "altman", "openai", "tim cook", "apple", "elon", "musk", "tesla", "bezos", "amazon", "sundar", "pichai", "google", "satya", "nadella", "microsoft", "meta"];
const TECH_BRAND_KEYWORDS = ["meta ads", "google ads", "tiktok ads", "pixel", "ga4", "gtm", "blackwell", "gpu"];
const ROBOT_AI_KEYWORDS = ["robô", "robo", "robot", "ia", "inteligência artificial", "automação", "automacao", "automation", "ai ", "chatgpt"];
const RAEL_CLIENT_KEYWORDS = ["rael", "cliente wavy", "wavy", "nosso cliente"];
const NUMBER_RESULT_KEYWORDS = ["roas", "faturamento", "leads", "r$", "%", "conversões", "conversoes"];
const HARDWARE_KEYWORDS = ["rolex", "relógio", "relogio", "carro", "chip", "iphone", "macbook", "produto físico"];
const WORKSPACE_KEYWORDS = ["dashboard", "ads manager", "campanha", "processo", "workflow", "setup", "monitor"];
const MINDSET_KEYWORDS = ["mindset", "decisão", "decisao", "escala", "crescimento", "ambição", "ambicao", "custo de não"];
const PREMIUM_KEYWORDS = ["premium", "valor", "qualidade", "exclusivo", "luxo"];

const lower = (s?: string) => (s || "").toLowerCase();
const hasAny = (h: string, n: string[]) => n.some((x) => h.includes(x));

/** Heurística zero-custo + viés por pattern_id. */
export function suggestStyle(slide: Slide, tema?: string, pattern?: CopyPatternId | null): WavyStyle {
  const text = [slide.titulo, slide.corpo, slide.visual_prompt, tema].map(lower).join(" ");

  // Viés por padrão (skill)
  if (pattern === "2A" || pattern === "2B") {
    if (hasAny(text, RAEL_CLIENT_KEYWORDS)) return getStyle("editorial_real")!;
    if (slide.tipo === "cover" || slide.tipo === "agitacao") return getStyle("cinematico")!;
  }
  if (pattern === "1A") {
    if (hasAny(text, HARDWARE_KEYWORDS) || hasAny(text, PREMIUM_KEYWORDS)) return getStyle("objeto_premium")!;
    if (slide.tipo === "cover") return getStyle("marca_organica")!;
    if (hasAny(text, WORKSPACE_KEYWORDS)) return getStyle("workspace_tech")!;
  }
  if (pattern === "4") {
    // Post frase normalmente quer pessoa real OU gradiente atmosférico
    if (hasAny(text, RAEL_CLIENT_KEYWORDS)) return getStyle("editorial_real")!;
    return getStyle("gradiente_atmosferico")!;
  }
  if (pattern === "5") {
    if (slide.tipo === "prova") return getStyle("resultado_numero")!;
    if (slide.tipo === "cover") return getStyle("pessoa_pequena")!;
    return getStyle("gradiente_atmosferico")!;
  }

  // Heurística por conteúdo (fallback genérico)
  if (hasAny(text, CEO_KEYWORDS)) return getStyle("ceo_hiperreal")!;
  if (hasAny(text, NUMBER_RESULT_KEYWORDS)) return getStyle("resultado_numero")!;
  if (hasAny(text, RAEL_CLIENT_KEYWORDS)) return getStyle("editorial_real")!;
  if (hasAny(text, ROBOT_AI_KEYWORDS)) return getStyle("cinematico")!;
  if (hasAny(text, HARDWARE_KEYWORDS)) return getStyle("objeto_premium")!;
  if (hasAny(text, TECH_BRAND_KEYWORDS)) return getStyle("marca_organica")!;
  if (hasAny(text, WORKSPACE_KEYWORDS)) return getStyle("workspace_tech")!;
  if (hasAny(text, MINDSET_KEYWORDS)) return getStyle("pessoa_pequena")!;
  if (hasAny(text, PREMIUM_KEYWORDS)) return getStyle("macro_abstrato")!;

  if (slide.tipo === "cover") return getStyle("cinematico")!;
  if (slide.tipo === "cta") return getStyle("editorial_real")!;
  if (slide.tipo === "prova") return getStyle("resultado_numero")!;
  return getStyle("gradiente_atmosferico")!;
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
