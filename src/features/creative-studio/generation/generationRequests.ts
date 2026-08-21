import { buildCreativePrompt, buildSafeZoneBlock } from '../lib/promptBuilder';
import { buildAvatarPrompt } from '../lib/avatarPromptBuilder';
import type { AvatarPersona } from '../types/avatarPersona';
import type { FactorVariation } from '../types/factorCreative';
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
 * O texto vira `businessContext` — a descrição do que gerar. `copy`, quando
 * vem de um anexo "Anexar copy", é outra coisa: texto FINAL, renderizado
 * verbatim (`buildCreativePrompt`'s modo `{source:'original'}`) — a
 * distinção existe porque tratar o texto do dock como copy sem um anexo
 * explícito renderizaria a frase de comando na arte.
 */
export function buildGenerationRequest(input: {
  brief: string;
  aspectRatio: CreativeAspectRatio;
  resolution?: CreativeResolution;
  language?: string;
  logoImageUrl?: string | null;
  productImageUrls?: string[];
  /** Avatares anexados. Viajam no mesmo canal de imagem do backend
   *  (`productImages`), mas ganham um bloco próprio no prompt. */
  avatarImageUrls?: string[];
  copy?: string | null;
  /** Default `IMAGE_GENERATION_MODEL.id` — parametrizável para a Fase 7. */
  modelId?: string;
}): GenerationRequest {
  const backendAspect = getBackendAspectFromSelectedRatio(input.aspectRatio);
  const copyTexto = input.copy?.trim();
  const produtos = input.productImageUrls ?? [];
  const avatares = input.avatarImageUrls ?? [];
  const prompt = buildCreativePrompt({
    aspect: backendAspect,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution ?? '2K',
    language: input.language ?? 'pt-BR',
    businessContext: input.brief,
    // Conta as duas fontes: o bloco [ATTACHED PHOTOS] afirma quantas
    // imagens vieram, e omitir os avatares faria o prompt mentir.
    productImageCount: produtos.length + avatares.length,
    avatarCount: avatares.length,
    // Separado da soma acima: é o que permite ao bloco [PRODUCT] dizer
    // QUAIS imagens são o produto, já que produtos e avatares chegam ao
    // backend no mesmo canal.
    productCount: produtos.length,
    hasLogo: !!input.logoImageUrl,
    copy: copyTexto ? { source: 'original', text: copyTexto } : null,
  });
  return {
    prompt,
    body: {
      prompt,
      aspectRatio: backendAspect,
      formatRatio: input.aspectRatio,
      model: input.modelId ?? IMAGE_GENERATION_MODEL.id,
      // Avatar primeiro: o modelo pesa mais as primeiras referências, e a
      // identidade da pessoa é o que menos pode derreter.
      productImages: [...avatares, ...produtos],
      logoImage: input.logoImageUrl ?? null,
      storyReference: null,
    },
  };
}

/**
 * Geração do retrato de uma persona.
 *
 * Formato fixo em 4:5: retrato é retrato, e deixar o usuário escolher 16:9
 * aqui só produziria avatar mal enquadrado. As fotos de referência viajam
 * em `productImages` porque é o único canal de imagem que a edge function
 * conhece — o que as distingue é o bloco [REFERENCE PHOTOS] do prompt.
 */
export function buildAvatarRequest(input: {
  persona: AvatarPersona;
  referenceImageUrls?: string[];
  modelId?: string;
}): GenerationRequest {
  const referencias = input.referenceImageUrls ?? [];
  const prompt = buildAvatarPrompt({ persona: input.persona, referenceCount: referencias.length });
  return {
    prompt,
    body: {
      prompt,
      aspectRatio: 'story',
      formatRatio: '4:5',
      model: input.modelId ?? IMAGE_GENERATION_MODEL.id,
      productImages: referencias,
      logoImage: null,
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
 *
 * `productImages`/`logoImage` são opcionais e vêm de fora (do `metadata` do
 * asset) — o PROMPT guarda só a MENÇÃO ao logo/produto ("a brand logo is
 * provided..."), não as URLs em si. Sem repassá-las aqui, retentar uma
 * geração com anexos perderia os anexos, mesmo com o prompt intacto.
 */
export function buildRetryRequest(asset: {
  prompt: string | null;
  aspectRatio: string | null;
  productImages?: string[];
  logoImage?: string | null;
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
      productImages: asset.productImages ?? [],
      logoImage: asset.logoImage ?? null,
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

/**
 * Uma variação do Fator Criativo virando prompt de imagem.
 *
 * Este montador existe porque o motor DEIXOU de escrever o prompt. Antes,
 * o modelo devolvia o `promptCompleto` de cada uma das cinco — o prompt
 * inteiro, com safe zone, tipografia e sistema de design — o que passava de
 * 20k tokens de saída e estourava o tempo antes de entregar. Agora ele
 * devolve só a tese, a copy e a direção visual, e o prompt sai daqui.
 *
 * Duas consequências que valem mais que a velocidade: a arte do Fator passa
 * pelo MESMO `buildCreativePrompt` da geração normal — mesma safe zone,
 * mesma escala tipográfica, mesmo sistema — e a safe zone deixa de ser
 * duplicada, porque quem a injeta agora é um só.
 */
export function buildFactorVariationRequest(input: {
  variation: FactorVariation;
  /** Prompt da arte-base: é dele que sai o DNA visual a preservar. */
  originalPrompt: string;
  aspectRatio: CreativeAspectRatio;
  resolution?: CreativeResolution | null;
  language?: string;
  logoImageUrl?: string | null;
  productImageUrls?: string[];
  /** A base, quando o alvo é quadrado: mesma verdade visual do Story. */
  storyReferenceUrl?: string | null;
}): GenerationRequest {
  const v = input.variation;
  const backendAspect = getBackendAspectFromSelectedRatio(input.aspectRatio);
  const produtos = input.productImageUrls ?? [];

  // O contexto carrega o DNA da arte aprovada E a tese nova. Sem o original
  // a variação vira outra marca; sem a tese vira a mesma peça repintada.
  const contexto = [
    'PEÇA APROVADA QUE SERVE DE BASE VISUAL (preserve marca, paleta e tratamento):',
    input.originalPrompt.trim().slice(0, 6000),
    '',
    `NOVA TESE (${v.strategy.angle} · ${v.strategy.angleSubtype}): ${v.strategy.strategicThesis}`,
    `PARA QUEM: ${v.audience.persona} — consciência ${v.audience.awarenessLevel}.`,
    `EMOÇÃO DOMINANTE: ${v.execution.dominantEmotion}.`,
    '',
    `SUJEITO PRINCIPAL: ${v.visualDirection.mainSubject}`,
    `COMPOSIÇÃO: ${v.visualDirection.composition}`,
    v.visualDirection.differencesFromOriginal?.length
      ? `O QUE MUDA EM RELAÇÃO À PEÇA BASE: ${v.visualDirection.differencesFromOriginal.join('; ')}`
      : '',
  ].filter(Boolean).join('\n');

  const prompt = buildCreativePrompt({
    aspect: backendAspect,
    aspectRatio: input.aspectRatio,
    resolution: input.resolution ?? '2K',
    language: input.language ?? 'pt-BR',
    businessContext: contexto,
    productImageCount: produtos.length,
    // O Fator gera cinco variações da MESMA oferta: se o produto muda de
    // uma para outra, o lote deixa de ser comparável.
    productCount: produtos.length,
    hasLogo: !!input.logoImageUrl,
    hasStoryReference: backendAspect === 'square' && !!input.storyReferenceUrl,
    // A copy da variação é texto FINAL escrito pelo estrategista, com papel
    // definido por bloco — é exatamente o que o modo `ai` representa.
    copy: {
      source: 'ai',
      blocks: {
        label: v.copy.label,
        titulo: v.copy.title,
        subtitulo: v.copy.subtitle,
        dados: v.copy.data?.join(' · ') || v.copy.price,
        cta: v.copy.cta,
      },
    },
    mood: {
      adjetivos: [v.visualDirection.mood, v.execution.dominantEmotion].filter(Boolean),
      referencias: [],
      evita: [],
    },
  });

  return {
    prompt,
    body: {
      prompt,
      aspectRatio: backendAspect,
      formatRatio: input.aspectRatio,
      model: IMAGE_GENERATION_MODEL.id,
      productImages: produtos,
      logoImage: input.logoImageUrl ?? null,
      storyReference: backendAspect === 'square' ? (input.storyReferenceUrl ?? null) : null,
    },
  };
}
