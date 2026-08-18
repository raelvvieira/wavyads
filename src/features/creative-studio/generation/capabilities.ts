import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';

/**
 * Capacidades reais dos modelos de imagem.
 *
 * Este arquivo descreve o que o produto FAZ hoje, não o que a interface
 * sugere. A diferença é o ponto: o compositor mostra um seletor de modelo e
 * três resoluções, mas a geração principal usa `gpt-image-2` fixo e a
 * resolução vira texto de qualidade dentro do prompt — nunca parâmetro.
 * Enquanto isso não estiver escrito em algum lugar, a interface continua
 * oferecendo escolha que não existe.
 *
 * O plano trata a correção disso como fase própria, com validação no
 * servidor. Aqui fica só a fonte declarativa: o que é verdade agora, quais
 * capacidades são reais e quais são aparência.
 */

export type MediaType = 'image' | 'video';

export interface GenerationModelCapability {
  id: string;
  label: string;
  provider: 'evolink' | 'gemini';
  mediaTypes: MediaType[];
  ratios: CreativeAspectRatio[];
  /**
   * Resoluções que o provedor aceita como PARÂMETRO.
   *
   * Vazio quando a resolução só existe como texto no prompt — que é o caso
   * de hoje. Declarar `['1K','2K','4K']` aqui seria repetir a promessa falsa
   * que a interface já faz.
   */
  resolutions: CreativeResolution[];
  maxQuantity: number;
  supportsReferences: boolean;
  supportsEditing: boolean;
  supportsFacePreservation: boolean;
  /** Chave de custo em `aiUsageTracker`. */
  usageKey: string;
}

const TODOS_OS_FORMATOS: CreativeAspectRatio[] = [
  '1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2', '21:9',
];

/**
 * O modelo que gera de verdade. É o único usado na geração principal,
 * independentemente do que o seletor da interface mostra.
 */
export const IMAGE_GENERATION_MODEL: GenerationModelCapability = {
  id: 'gpt-image-2',
  label: 'GPT Image 2',
  provider: 'evolink',
  mediaTypes: ['image'],
  ratios: TODOS_OS_FORMATOS,
  // Vazio de propósito: 1K/2K/4K entram no prompt como descrição de
  // qualidade, não como parâmetro da chamada.
  resolutions: [],
  maxQuantity: 1,
  supportsReferences: true,
  supportsEditing: false,
  supportsFacePreservation: true,
  usageKey: 'image-gemini-flash-2',
};

/** O modelo que edita. Provedor diferente do que gera. */
export const IMAGE_EDIT_MODEL: GenerationModelCapability = {
  id: 'gemini-3.1-flash-image-preview',
  label: 'Gemini 3.1 Flash Image',
  provider: 'gemini',
  mediaTypes: ['image'],
  ratios: TODOS_OS_FORMATOS,
  resolutions: [],
  maxQuantity: 1,
  supportsReferences: true,
  supportsEditing: true,
  supportsFacePreservation: true,
  usageKey: 'image-gemini-flash-2',
};

export const MODEL_CAPABILITIES: GenerationModelCapability[] = [
  IMAGE_GENERATION_MODEL,
  IMAGE_EDIT_MODEL,
];

export function findCapability(modelId: string): GenerationModelCapability | null {
  return MODEL_CAPABILITIES.find((m) => m.id === modelId) ?? null;
}

/**
 * Divergências conhecidas entre o que a interface oferece e o que acontece.
 *
 * Existe como dado, e não como comentário, para que a correção possa ser
 * verificada: quando uma delas deixar de ser verdade, o teste que a afirma
 * falha e obriga a remover a entrada.
 */
export interface CapabilityGap {
  id: string;
  uiPromete: string;
  realidade: string;
  faseDeCorrecao: number;
}

export const KNOWN_CAPABILITY_GAPS: CapabilityGap[] = [
  {
    id: 'model-selector-decorative',
    uiPromete: 'três modelos Gemini selecionáveis para a geração',
    realidade: 'a geração usa gpt-image-2 fixo; o valor escolhido só alimenta a contabilidade de custo',
    faseDeCorrecao: 7,
  },
  {
    id: 'resolution-is-prompt-text',
    uiPromete: '1K, 2K e 4K como resolução de saída',
    realidade: 'vira frase de qualidade dentro do prompt; o provedor não recebe resolução',
    faseDeCorrecao: 7,
  },
  {
    id: 'billing-uses-ui-model',
    uiPromete: 'custo do modelo escolhido',
    realidade: 'recordAiUsage cobra pelo modelo do seletor, que não é o que gerou a imagem',
    faseDeCorrecao: 7,
  },
];

/**
 * Resumo da geração para o compositor.
 *
 * Mostra apenas o que o pedido realmente carrega. Repetir aqui o modelo do
 * seletor seria propagar a promessa falsa para mais um lugar da interface.
 */
export function describeGeneration(input: {
  ratio: CreativeAspectRatio;
  quantity?: number;
}): string {
  const partes = [IMAGE_GENERATION_MODEL.label, input.ratio];
  const n = input.quantity ?? 1;
  if (n > 1) partes.push(`${n} imagens`);
  return partes.join(' · ');
}

/** Um formato só é gerável se o modelo declarar suporte. */
export function canGenerateRatio(ratio: CreativeAspectRatio): boolean {
  return IMAGE_GENERATION_MODEL.ratios.includes(ratio);
}
