// Legacy "Formato" — mantém compat com pipelines salvos.
export type Formato =
  | "carrossel_imagem"
  | "carrossel_texto"
  | "carrossel_lista"
  | "post_unico"
  | "reel";

/**
 * IDs canônicos da Wavy Copy Skill (single source of truth a partir de agora).
 * 1A Tutorial · 1B Conflito · 2A Storytelling · 2B Editorial Dark · 3 Reel · 4 Post Frase · 5 Frase Mestre
 */
export type CopyPatternId = "1A" | "1B" | "2A" | "2B" | "3" | "4" | "5";

/** Famílias agrupadoras usadas pela UI da Etapa 3. */
export type FormatoFamilia =
  | "carrossel_direto"      // 1A | 1B
  | "carrossel_narrativo"   // 2A | 2B
  | "reel"                  // 3
  | "post_frase"            // 4
  | "frase_mestre";         // 5

export const PATTERN_TO_FAMILIA: Record<CopyPatternId, FormatoFamilia> = {
  "1A": "carrossel_direto",
  "1B": "carrossel_direto",
  "2A": "carrossel_narrativo",
  "2B": "carrossel_narrativo",
  "3":  "reel",
  "4":  "post_frase",
  "5":  "frase_mestre",
};

/** Útil em locais que ainda esperam o Formato antigo. */
export function patternToFormatoLegacy(p: CopyPatternId): Formato {
  switch (p) {
    case "1A": return "carrossel_lista";
    case "1B": return "carrossel_texto";
    case "2A": return "carrossel_imagem";
    case "2B": return "carrossel_imagem";
    case "3":  return "reel";
    case "4":  return "post_unico";
    case "5":  return "carrossel_imagem";
  }
}

/** Conversão para abrir pipelines antigos com `formato`. */
export function formatoToPattern(f?: Formato | null): CopyPatternId | null {
  if (!f) return null;
  switch (f) {
    case "carrossel_imagem": return "2A";
    case "carrossel_lista":  return "1A";
    case "carrossel_texto":  return "1B";
    case "post_unico":       return "4";
    case "reel":             return "3";
  }
}

export type SlideTipo =
  | "cover"
  | "problema"
  | "agitacao"
  | "solucao"
  | "lista"
  | "prova"
  | "cta";

export interface Slide {
  tipo: SlideTipo;
  titulo: string;
  corpo: string;
  visual_prompt: string;
}

export interface ReelCena {
  tempo: string;
  cena: string;
  fala: string;
}

export interface CopyAprovada {
  slides?: Slide[];
  roteiro?: ReelCena[];
  legenda: string;
  hashtags: string[];
  /** Wavy: pattern_id confirmado no retorno da edge function. */
  pattern_id?: CopyPatternId;
}

export interface SlideImagem {
  slide_index: number;
  url: string;
  source: "ai" | "freepik" | "upload" | "google" | "pexels" | "freepik-stock" | "none";
  prompt_usado: string;
  fonte?: string;
  tipo_visual?: "pessoa" | "empresa" | "hardware" | "diagrama" | "ambiente";
  /** Wavy skill: id do estilo visual escolhido (ceo_hiperreal, cinematico, ...). */
  style_id?: string;
}

export interface PostCopy {
  tipo: "reel" | "carrossel" | "post_estatico";
  transcricao?: string;
  texto_visual?: string;
  slides?: { slide: number; texto: string; status: string }[];
  legenda: string;
  hashtags: string[];
  copy_consolidada: string;
  status: {
    legenda?: string | null;
    transcricao?: string | null;
    ocr?: string | null;
  };
  usage?: { transcribe_calls: number; ocr_calls: number };
}
