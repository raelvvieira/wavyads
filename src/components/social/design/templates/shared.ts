import type { SlideTipo } from "@/types/social";

/** IDs de design. Os 6 primeiros espelham a Wavy Copy Skill; we-* são designs
 *  "Wavy Editorial" (claro/escuro) aplicáveis a QUALQUER padrão de copy. */
export type TemplateId = "1A" | "1B" | "2A" | "2B" | "4" | "5" | "we-light" | "we-dark";
export type FormatoSlide = "cover" | "content" | "statement" | "tension" | "cta";

export interface SocialProfile {
  nome: string;
  handle: string;
  avatarUrl: string;
  /** Masthead editorial (opcional) — nome do "veículo" no topo do slide. */
  veiculo?: string;
  /** Tag do masthead (ex.: "Conteúdo com IA"). */
  veiculoTag?: string;
  /** Mostra o selo verificado ao lado do nome. */
  verificado?: boolean;
}

export const DEFAULT_PROFILE: SocialProfile = {
  nome: "Rael Vieira",
  handle: "@wavy.mkt",
  avatarUrl: "https://i.ibb.co/bMtB5PZL/488223687-8876273612474124-8754739128155263998-n.jpg",
  veiculo: "Wavy",
  veiculoTag: "Conteúdo com IA",
  verificado: true,
};

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

// Wavy palette
export const C = {
  orange: "#FD4638",
  orangeDark: "#E8102A",
  gradOrange: "linear-gradient(135deg,#FD4638,#E8102A)",
  black: "#0A0A0A",
  blackDeep: "#080808",
  offWhite: "#F5F2EE",
  white: "#FFFFFF",
  darkSurface: "#111114",
  muted: "#8A8A9A",
  twGray: "#536471",
  twBlack: "#0F1419",
  twBlue: "#1DA1F2",
  borderLight: "#E8E5E0",
  borderDark: "#1A1A1A",
};

export const FONT_LINKS = [
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,500;0,700;0,800;1,400;1,500&family=Inter:wght@400;700;800&display=swap",
];

export const F = {
  display: "'Bebas Neue', 'Barlow', sans-serif",
  body: "'Barlow', sans-serif",
  twitter: "'Inter', sans-serif",
};

export interface TemplateSlideProps {
  slideIndex: number;
  total: number;
  titulo: string;
  corpo: string;
  imgUrl?: string;
  tipoSlide: SlideTipo;
  formato: FormatoSlide;
  profile: SocialProfile;
}

export function determinarFormato(tipo: SlideTipo, slideIndex: number, total: number): FormatoSlide {
  if (slideIndex === 0 || tipo === "cover") return "cover";
  if (slideIndex === total - 1 || tipo === "cta") return "cta";
  if (tipo === "prova") return "statement";
  if (tipo === "problema" || tipo === "agitacao") return "tension";
  if (tipo === "lista") return "content";
  return "content";
}

/** Identidade — TemplateId já é igual ao CopyPatternId (exceto Reel "3" que não tem design). */
export function templateFromPattern(p?: string | null): TemplateId {
  if (p === "1A" || p === "1B" || p === "2A" || p === "2B" || p === "4" || p === "5") return p;
  return "2A"; // default storytelling
}
