/**
 * MOTOR DE CONCEITO (Diretor de Arte) — camada client.
 *
 * Decide O QUE a imagem mostra, antes de qualquer decisão técnica. O resultado
 * (`image_generation_core`) alimenta o placeholder {VISUAL_PROMPT} do motor de
 * renderização (wavyImageStyles.buildImagePrompt), que cuida de câmera, luz,
 * pele, grão e negativos.
 *
 * Fronteira (docs/wavy-image-skill/04-motor-de-conceito.md):
 *   conceito → sujeito, cena, twist, composição, entidades reais
 *   renderização → câmera, lente, luz, textura, color grading, acabamento
 */
import { supabase } from "@/integrations/supabase/client";
import type { CopyPatternId, Slide } from "@/types/social";

export type VisualFamily =
  | "factual_editorial"
  | "premium_editorial"
  | "creator_explainer"
  | "product_storytelling"
  | "hybrid_digital_editorial"
  | "concrete_visual_metaphor";

export interface VisualConcept {
  message_core: string;
  content_intent: string;
  visual_objective: string;
  grounding?: {
    required: boolean;
    type: string;
    real_entities: { name: string; entity_type: string; visual_role: string }[];
  };
  visual_family: VisualFamily;
  text_image_balance?: string;
  primary_subject?: { type: string; description: string };
  secondary_subjects?: { type: string; description: string; narrative_role: string }[];
  creative_concept: string;
  creative_twist: string;
  concept_rationale?: string;
  scene?: {
    moment: string; environment: string; action: string;
    emotional_signal?: string; key_detail?: string;
  };
  composition?: {
    type: string; hero_element: string; subject_position: string;
    headline_safe_area: string; visual_density: string;
  };
  must_show?: string[];
  must_avoid?: string[];
  image_generation_core: string;
  scores?: Record<string, number>;
}

/**
 * Zona de texto que o TEMPLATE DE DESIGN impõe. O diretor de arte recebe isto
 * como restrição e deve respeitá-la — não inventar outra área segura.
 * Espelha os TEMPLATE_SUFFIXES de wavyImageStyles.ts.
 */
export function headlineSafeAreaFor(pattern: CopyPatternId): string {
  switch (pattern) {
    case "1A": return "Sujeito nos 60% superiores; os 40% inferiores ficam mais limpos/claros para o texto do passo.";
    case "1B": return "Eixo vertical central limpo para o texto de contraste dividido.";
    case "2A": return "Sujeito nos 65% superiores; os 35% inferiores naturalmente mais escuros para o corpo do texto.";
    case "2B": return "35% inferiores bem escuros para uma headline longa e provocadora.";
    case "4":  return "Sujeito nas bordas; os 40% centrais precisam de respiro para um texto grande sobreposto.";
    case "5":  return "25% do topo E 35% da base limpos/escuros para tese e antítese. Simétrico.";
    default:   return "15% do topo e 15% da base mais escuros para título e navegação.";
  }
}

/**
 * Família visual (natureza do CONTEÚDO) → estilo de acabamento FOTOGRÁFICO.
 * São eixos diferentes: a família diz o que a imagem é; o estilo diz como ela
 * é renderizada. O mapeamento é um DEFAULT — o usuário pode trocar o estilo.
 */
export function styleFromVisualFamily(family?: VisualFamily): string | null {
  switch (family) {
    case "factual_editorial":        return "editorial";
    case "premium_editorial":        return "cinematic";
    case "creator_explainer":        return "ugc";
    case "product_storytelling":     return "editorial";
    case "hybrid_digital_editorial": return "editorial";
    case "concrete_visual_metaphor": return "minimalist";
    default:                         return null;
  }
}

/** Junta os negativos do conceito ao prompt (os técnicos já vêm do COMMON_TAIL). */
export function conceptNegatives(concept?: VisualConcept | null): string {
  const avoid = concept?.must_avoid?.filter(Boolean) || [];
  return avoid.length ? `\n\nDO NOT INCLUDE: ${avoid.join("; ")}.` : "";
}

/** Chama o motor de conceito para um slide. Lança em erro. */
export async function generateVisualConcept(params: {
  tema: string;
  briefing?: string;
  slide: Slide;
  slideIndex: number;
  total: number;
  formato?: string;
  slidesAround?: { titulo: string; corpo?: string }[];
  pattern: CopyPatternId;
  marca?: string;
}): Promise<VisualConcept> {
  const { data, error } = await supabase.functions.invoke("social-visual-concept", {
    body: {
      tema: params.tema,
      briefing: params.briefing,
      titulo: params.slide.titulo,
      corpo: params.slide.corpo,
      tipoSlide: params.slide.tipo,
      formato: params.formato,
      slide_index: params.slideIndex,
      total: params.total,
      slides_around: params.slidesAround,
      headline_safe_area: headlineSafeAreaFor(params.pattern),
      marca: params.marca,
    },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  const concept = (data as any)?.concept as VisualConcept;
  if (!concept?.image_generation_core) throw new Error("Conceito inválido");
  return concept;
}
