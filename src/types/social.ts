export type Formato =
  | "carrossel_imagem"
  | "carrossel_texto"
  | "carrossel_lista"
  | "post_unico"
  | "reel";

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
}

export interface SlideImagem {
  slide_index: number;
  url: string;
  source: "ai" | "freepik" | "upload";
  prompt_usado: string;
}
