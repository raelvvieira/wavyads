import type { SlideTipo } from "@/types/social";

export type TemplateId = "A" | "B" | "C";
export type FormatoSlide = "cover" | "light" | "text_only" | "dark" | "cta";

export interface SocialProfile {
  nome: string;
  handle: string;
  avatarUrl: string;
}

export const DEFAULT_PROFILE: SocialProfile = {
  nome: "WAVY",
  handle: "@wavy.mkt",
  avatarUrl: "https://i.ibb.co/bMtB5PZL/488223687-8876273612474124-8754739128155263998-n.jpg",
};

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

export interface TemplateSlideProps {
  slideIndex: number; // 0-based
  total: number;
  titulo: string;
  corpo: string;
  imgUrl?: string;
  tipoSlide: SlideTipo;
  formato: FormatoSlide;
  profile: SocialProfile;
}

export function determinarFormato(tipoSlide: SlideTipo, slideIndex: number, total: number): FormatoSlide {
  if (slideIndex === 0 || tipoSlide === "cover") return "cover";
  if (slideIndex === total - 1 || tipoSlide === "cta") return "cta";
  if (tipoSlide === "prova") return "text_only";
  if (tipoSlide === "problema" || tipoSlide === "agitacao") return "dark";
  return "light";
}

export const FONT_LINK = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap";
