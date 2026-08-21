/**
 * Vocabulário do UGC Studio.
 *
 * Duas coisas moram aqui: os tipos que espelham as tabelas `ugc_projects` e
 * `ugc_clips`, e as tabelas de constantes que a interface e o prompt
 * compartilham. Manter os dois juntos é deliberado — foi assim que o
 * Criativo Studio evitou que rótulo de tela e texto de prompt divergissem.
 */

export type UgcClipKind = 'avatar' | 'broll';

/** Os quatro papéis narrativos de um anúncio UGC, na ordem em que rodam. */
export const UGC_SEGMENTS = ['hook', 'body_1', 'body_2', 'cta'] as const;
export type UgcSegment = (typeof UGC_SEGMENTS)[number];

export const UGC_SEGMENT_LABELS: Record<UgcSegment, string> = {
  hook: 'Gancho',
  body_1: 'Corpo pt. 1',
  body_2: 'Corpo pt. 2',
  cta: 'Chamada',
};

/** O que cada segmento precisa fazer — vira dica na tela e no prompt. */
export const UGC_SEGMENT_HINTS: Record<UgcSegment, string> = {
  hook: 'Para o dedo. Um problema reconhecível, nunca a apresentação do produto.',
  body_1: 'Nomeia a dor por dentro. É onde a pessoa se reconhece.',
  body_2: 'A virada: o que mudou e por quê. O produto entra como meio.',
  cta: 'O próximo passo, dito leve. Convite, não ordem.',
};

/**
 * Presets de ângulo do B-roll.
 *
 * O rótulo é o que aparece no card; `promptFragment` é o que entra no
 * prompt de vídeo. Separar os dois permite escrever a instrução em inglês
 * (que é o idioma em que os modelos de vídeo respondem melhor) sem que isso
 * vaze para a interface.
 */
export interface BrollAngle {
  id: string;
  label: string;
  promptFragment: string;
  /**
   * Gradiente da capa do card.
   *
   * Existe porque não temos banco de imagens de exemplo por ângulo: sem uma
   * superfície própria, o card virava um retângulo vazio e o rótulo branco
   * sumia no tema claro. O gradiente evoca a luz de cada ângulo — quente na
   * luz de janela, frio no noturno — e dá contraste ao texto.
   */
  gradient: [string, string];
}

export const BROLL_ANGLES: BrollAngle[] = [
  {
    id: 'hand_hold',
    gradient: ['#C8A27A', '#8A6B4F'],
    label: 'Na mão',
    promptFragment: 'a hand holding the product up to the camera, natural skin texture, slight handheld motion',
  },
  {
    id: 'table_flat_lay',
    gradient: ['#E8B27A', '#C4703E'],
    label: 'Mesa de cima',
    promptFragment: 'top-down flat lay of the product on a clean surface with complementary props, slow push-in',
  },
  {
    id: 'outdoor_natural',
    gradient: ['#7FA36B', '#3F5C38'],
    label: 'Ambiente externo',
    promptFragment: 'the product outdoors in natural daylight, shallow depth of field, gentle breeze in the scene',
  },
  {
    id: 'slow_rotate',
    gradient: ['#8F9BC4', '#4A5378'],
    label: 'Giro lento',
    promptFragment: 'the product rotating slowly on its axis against a soft gradient backdrop, studio lighting',
  },
  {
    id: 'unbox_reveal',
    gradient: ['#C98A6B', '#7A4530'],
    label: 'Revelação',
    promptFragment: 'hands opening the packaging and revealing the product, anticipation, close framing',
  },
  {
    id: 'in_use_close',
    gradient: ['#D9A79A', '#9B6154'],
    label: 'Uso em close',
    promptFragment: 'extreme close-up of the product being applied or used, texture visible, macro feel',
  },
  {
    id: 'window_light',
    gradient: ['#EBD3A4', '#B99A63'],
    label: 'Luz de janela',
    promptFragment: 'the product near a window with directional daylight and soft falloff, calm interior',
  },
  {
    id: 'night_moody',
    gradient: ['#3C4460', '#171A26'],
    label: 'Noturno',
    promptFragment: 'the product in a dark moody setting with a single warm light source and deep shadows',
  },
];

export function brollAngle(id: string | null | undefined): BrollAngle | null {
  return BROLL_ANGLES.find((a) => a.id === id) ?? null;
}

/**
 * Durações do clipe de avatar.
 *
 * Discretas de propósito: a fala precisa caber no tempo, e o orçamento de
 * palavras é calculado a partir daqui. O B-roll, que não tem fala para
 * orçar, usa duração livre.
 */
export const AVATAR_DURATIONS = [4, 6, 8] as const;
export const BROLL_DURATION_RANGE = { min: 3, max: 10, step: 1 } as const;

export const UGC_RESOLUTIONS = ['720p', '1080p', '4K'] as const;
export type UgcResolution = (typeof UGC_RESOLUTIONS)[number];

/** Ver `PALAVRAS_POR_SEGUNDO` na edge function `ugc-script`. */
export const WORDS_PER_SECOND = 2.7;

export function wordBudget(durationSeconds: number): number {
  return Math.round(durationSeconds * WORDS_PER_SECOND);
}

export function countWords(texto: string): number {
  const limpo = texto.trim();
  return limpo ? limpo.split(/\s+/).length : 0;
}

/**
 * Custo estimado, em créditos.
 *
 * A assimetria é real e vale mostrar: um clipe de avatar falando custa
 * várias vezes um clipe de produto. É o que justifica a orientação de
 * deixar o B-roll cobrir a maior parte do anúncio — economia, não estética.
 */
export function estimatedCredits(kind: UgcClipKind, durationSeconds: number, resolution: UgcResolution): number {
  const base = kind === 'avatar' ? 7 : 1.5;
  const fatorResolucao = resolution === '4K' ? 2 : resolution === '1080p' ? 1 : 0.7;
  return Math.round(base * durationSeconds * fatorResolucao * 10) / 10;
}

export type UgcTier = 'standard' | 'premium';
export type UgcClipStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface UgcScript {
  hook: string;
  body_1: string;
  body_2: string;
  cta: string;
}

export interface UgcProject {
  id: string;
  clientId: string | null;
  title: string;
  avatarAssetId: string | null;
  tier: UgcTier;
  productImageUrl: string | null;
  script: UgcScript | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UgcClip {
  id: string;
  projectId: string;
  kind: UgcClipKind;
  segment: UgcSegment | null;
  anglePreset: string | null;
  speech: string | null;
  durationSeconds: number;
  resolution: UgcResolution;
  audio: boolean;
  status: UgcClipStatus;
  url: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  prompt: string | null;
  model: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function emptyScript(): UgcScript {
  return { hook: '', body_1: '', body_2: '', cta: '' };
}
