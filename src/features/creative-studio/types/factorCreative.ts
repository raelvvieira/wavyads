/**
 * Vocabulário do Fator Criativo V2.
 *
 * A V1 tinha 5 eixos fixos e rodava sempre os cinco na mesma ordem. A V2
 * tem 12 ângulos estratégicos e ESCOLHE quais cabem na oferta — um ângulo
 * sem os dados que ele exige (prova sem evidência aprovada, mecanismo sem
 * mecanismo real) é substituído em vez de inventado.
 */

export const STRATEGIC_ANGLES = [
  'problem',
  'mechanism',
  'proof',
  'contrast',
  'objection',
  'transformation',
  'opportunity',
  'cost_of_inaction',
  'identity',
  'belief_shift',
  'behind_the_scenes',
  'ease',
] as const;
export type StrategicAngleId = (typeof STRATEGIC_ANGLES)[number];

export const STRATEGIC_ANGLE_LABELS: Record<StrategicAngleId, string> = {
  problem: 'Problema',
  mechanism: 'Mecanismo',
  proof: 'Prova',
  contrast: 'Contraste',
  objection: 'Objeção',
  transformation: 'Transformação',
  opportunity: 'Oportunidade',
  cost_of_inaction: 'Custo da inação',
  identity: 'Identidade',
  belief_shift: 'Quebra de crença',
  behind_the_scenes: 'Bastidores',
  ease: 'Facilidade',
};

/** Uma linha por ângulo, para o chip explicar o que ele faz. */
export const STRATEGIC_ANGLE_HINTS: Record<StrategicAngleId, string> = {
  problem: 'Revela a dor antes da solução',
  mechanism: 'Lidera pelo como/porquê funciona',
  proof: 'Começa pela evidência aprovada',
  contrast: 'Nova abordagem vs. método antigo',
  objection: 'Parte de um motivo real para não comprar',
  transformation: 'Estado atual → estado desejado',
  opportunity: 'Mudança de mercado que abriu espaço',
  cost_of_inaction: 'O que se perde ao não agir',
  identity: 'Quem o público é ou quer ser',
  belief_shift: 'Desafia uma crença e substitui',
  behind_the_scenes: 'Como o resultado é construído',
  ease: 'Reduz a complexidade percebida',
};

/** Ordem preferencial do modo automático (§7 da spec). */
export const DEFAULT_ANGLE_ORDER: StrategicAngleId[] = [
  'problem', 'mechanism', 'proof', 'contrast',
];

export interface OfferProof {
  type: 'metric' | 'testimonial' | 'case' | 'demonstration' | 'credential' | 'process';
  content: string;
  source?: string;
  approvedForAds: boolean;
}

/**
 * O briefing da oferta.
 *
 * Derivado pela IA e revisado pelo usuário — `proofs` nasce SEMPRE vazio:
 * a spec (§10) proíbe inventar número, depoimento ou case, e inferir prova
 * a partir de um prompt seria exatamente isso.
 */
export interface OfferIntelligence {
  productName: string;
  category: string;
  offerDescription: string;
  audience: string[];
  customerSituations: string[];
  pains: string[];
  desires: string[];
  objections: string[];
  differentiators: string[];
  mechanism?: {
    name?: string;
    explanation: string;
    whyItWorks: string;
    contrastWithCommonApproach?: string;
  } | null;
  proofs: OfferProof[];
  offerTerms?: {
    price?: string;
    payment?: string;
    bonuses?: string[];
    deadline?: string;
    capacity?: string;
    guarantee?: string;
  } | null;
  callToAction: string;
  prohibitedClaims: string[];
}

export interface OriginalDiagnosis {
  originalAngle: StrategicAngleId | 'unclear';
  originalThesis: string;
  originalAudience: string;
  originalAwarenessLevel: string;
  originalEmotion: string;
  originalCopyStructure: string;
  originalVisualHook: string;
  invariantElements: string[];
  diversificationRisks: string[];
}

export interface FactorVariation {
  slot: 1 | 2 | 3 | 4 | 5;
  label: string;
  strategy: {
    angle: StrategicAngleId;
    angleSubtype: string;
    angleViability: 'valid' | 'substituted';
    strategicThesis: string;
    whySelected: string;
    recognition: string;
    beliefBefore: string;
    beliefAfter: string;
    reasonToBelieve: string;
  };
  audience: {
    persona: string;
    awarenessLevel: string;
    situation: string;
    objection?: string;
  };
  execution: {
    dominantEmotion: string;
    offerFrame: string;
    argumentStructure: string[];
    visualHookType: string;
  };
  copy: {
    label?: string;
    title: string;
    subtitle?: string;
    body?: string;
    data?: string[];
    price?: string;
    cta: string;
  };
  visualDirection: {
    dominantHook: string;
    mainSubject: string;
    composition: string;
    hierarchy: string[];
    mood: string;
    relationshipToThesis: string;
    differencesFromOriginal: string[];
    differencesFromOtherVariations: string[];
  };
  validation: {
    supportedFactsUsed: string[];
    unsupportedClaims: string[];
    changedDimensions: Array<'thesis' | 'message' | 'receiver' | 'tone' | 'visual'>;
    scores: Record<string, number>;
    qualityScore: number;
  };
  promptCompleto: string;
}

export interface FactorCreativeOutput {
  originalDiagnosis: OriginalDiagnosis;
  strategySummary: {
    sharedOfferTruth: string;
    selectedAngles: StrategicAngleId[];
    selectionRationale: string;
    unavailableAngles: Array<{ angle: StrategicAngleId; reason: string }>;
  };
  variations: FactorVariation[];
}

/** Briefing em branco — o fallback quando a análise falha. */
export function emptyOfferIntelligence(): OfferIntelligence {
  return {
    productName: '',
    category: '',
    offerDescription: '',
    audience: [],
    customerSituations: [],
    pains: [],
    desires: [],
    objections: [],
    differentiators: [],
    mechanism: null,
    proofs: [],
    offerTerms: null,
    callToAction: '',
    prohibitedClaims: [],
  };
}

/**
 * O rótulo do ângulo de uma arte já gravada.
 *
 * `strategic_angle` é V2; artes V1 só têm `factor_axis` com os eixos
 * antigos. O fallback é o que a §20 da spec pede durante a migração.
 */
export function angleLabel(strategicAngle: string | null | undefined): string | null {
  if (!strategicAngle) return null;
  return STRATEGIC_ANGLE_LABELS[strategicAngle as StrategicAngleId] ?? null;
}
