import { buildCreativePrompt, buildSafeZoneBlock } from '../lib/promptBuilder';
import { getBackendAspectFromSelectedRatio } from '../constants/formats';
import { IMAGE_GENERATION_MODEL } from './capabilities';
import type { BackendAspect, CreativeAspectRatio, CreativeResolution } from '../types/creative';

/**
 * Monta as chamadas de edge function do V2.
 *
 * Puro de propósito: a diferença entre a tela antiga e esta é só a
 * origem do texto (um wizard de várias etapas vs. uma linha no dock), não a
 * regra de geração. Reconstruir a lógica de safe zone e formato aqui seria
 * garantir que as duas telas divergissem na primeira mudança.
 */

export interface GenerationRequest {
  prompt: string;
  body: {
    prompt: string;
    aspectRatio: BackendAspect;
    formatRatio: string;
    model: string;
    productImages: string[];
    logoImage: string | null;
    storyReference: string | null;
  };
}

/**
 * Geração a partir do texto livre do dock.
 *
 * O texto vira `businessContext` — a descrição do que gerar — e não copy
 * fixa: sem um wizard de aprovação de copy antes dele, tratar o texto do
 * dock como copy literal renderizaria a frase de comando na arte.
 */
export function buildGenerationRequest(input: {
  brief: string;
  aspectRatio: CreativeAspectRatio;
  resolution?: CreativeResolution;
  language?: string;
  logoImageUrl?: string | null;
  productImageUrls?: string[];
}): GenerationRequest {
  const backendAspect = getBackendAspectFromSelectedRatio(input.aspectRatio);
  const prompt = buildCreativePrompt({
    aspect: backendAspect,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution ?? '2K',
    language: input.language ?? 'pt-BR',
    businessContext: input.brief,
    productImageCount: input.productImageUrls?.length ?? 0,
    hasLogo: !!input.logoImageUrl,
  });
  return {
    prompt,
    body: {
      prompt,
      aspectRatio: backendAspect,
      formatRatio: input.aspectRatio,
      model: IMAGE_GENERATION_MODEL.id,
      productImages: input.productImageUrls ?? [],
      logoImage: input.logoImageUrl ?? null,
      storyReference: null,
    },
  };
}

/**
 * Nova tentativa de uma arte que falhou.
 *
 * A linha falhada já carrega prompt e formato — não pede o brief de novo.
 * Sem formato salvo (asset ainda não chegou a ter um), cai no 4:5 padrão do
 * app em vez de quebrar.
 */
export function buildRetryRequest(asset: {
  prompt: string | null;
  aspectRatio: string | null;
}): GenerationRequest {
  if (!asset.prompt) throw new Error('Esta arte não tem prompt salvo para tentar novamente.');
  const ratio = (asset.aspectRatio as CreativeAspectRatio) || '4:5';
  const backendAspect = getBackendAspectFromSelectedRatio(ratio);
  return {
    prompt: asset.prompt,
    body: {
      prompt: asset.prompt,
      aspectRatio: backendAspect,
      formatRatio: ratio,
      model: IMAGE_GENERATION_MODEL.id,
      productImages: [],
      logoImage: null,
      storyReference: null,
    },
  };
}

export interface EditRequest {
  body: {
    originalImage: string;
    userFeedback: string;
    originalPrompt: string;
    aspect: BackendAspect;
    language: string;
    aspectRatio: CreativeAspectRatio;
    safeZoneBlock: string;
  };
}

/**
 * Edição de uma arte existente.
 *
 * `originalImage` viaja como URL http(s) — a edge function aceita os dois
 * formatos, e converter para data URL no navegador só se justifica quando
 * ela ainda exigia base64.
 */
export function buildEditRequest(input: {
  imageUrl: string;
  feedback: string;
  originalPrompt: string;
  aspectRatio: CreativeAspectRatio;
  language?: string;
}): EditRequest {
  const backendAspect = getBackendAspectFromSelectedRatio(input.aspectRatio);
  return {
    body: {
      originalImage: input.imageUrl,
      userFeedback: input.feedback,
      originalPrompt: input.originalPrompt,
      aspect: backendAspect,
      language: input.language ?? 'pt-BR',
      aspectRatio: input.aspectRatio,
      safeZoneBlock: buildSafeZoneBlock(input.aspectRatio),
    },
  };
}

/**
 * Redimensionamento para 1:1.
 *
 * Reaproveitar o prompt original sem corrigir faria a arte quadrada nascer
 * com a zona segura do formato de origem — por exemplo, a margem inferior
 * de 35% de um Story. O bloco de override manda o modelo IGNORAR toda
 * instrução de enquadramento anterior no prompt e usar só o que vem depois.
 */
export function buildResizeRequest(input: { originalPrompt: string }): GenerationRequest {
  const prompt = `${input.originalPrompt}\n\n[FRAMING OVERRIDE — THIS RENDER IS 1:1]\nThis render is a 1:1 square (1080x1080). Ignore every framing and safe-zone instruction stated earlier in this prompt; the block below replaces them.\n\n${buildSafeZoneBlock('1:1')}`;
  return {
    prompt,
    body: {
      prompt,
      aspectRatio: 'square',
      formatRatio: '1:1',
      model: IMAGE_GENERATION_MODEL.id,
      productImages: [],
      logoImage: null,
      storyReference: null,
    },
  };
}
