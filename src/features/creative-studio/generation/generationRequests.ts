import { buildCreativePrompt, buildSafeZoneBlock, type PromptCopyBlocks } from '../lib/promptBuilder';
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
/**
 * O `[MOOD]` da peça, vindo de duas fontes que não se anulam.
 *
 * A análise de referência traz o mood do ESTILO (o que aquele conjunto de
 * imagens é); a direção de arte traz o mood DESTA peça. Perder a segunda
 * apagaria o acabamento pedido para o criativo específico; perder a
 * primeira apagaria a leitura das referências que o usuário anexou.
 */
function moodDoPedido(
  daReferencia: { adjetivos: string[]; referencias: string[]; evita: string[] } | null | undefined,
  direcao: { mood?: string } | null | undefined,
): { adjetivos: string[]; referencias: string[]; evita: string[] } | null {
  const daDirecao = direcao?.mood?.trim();
  if (!daReferencia && !daDirecao) return null;
  const base = daReferencia ?? { adjetivos: [], referencias: [], evita: [] };
  if (!daDirecao) return base;
  return { ...base, adjetivos: [...base.adjetivos, daDirecao] };
}

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
  /**
   * O que aparece no quadro, escrito antes da imagem.
   *
   * Opcional porque a direção pode falhar (IA fora do ar, modelo
   * descontinuado) e uma geração que só sai com direção de arte seria uma
   * geração a menos por um motivo que não é do usuário.
   */
  artDirection?: { mainSubject: string; composition: string; mood?: string } | null;
  /**
   * A copy do usuário já repartida em papéis tipográficos.
   *
   * Só chega aqui depois de `rolesArePartitionOf` confirmar que os papéis
   * reproduzem o texto original — ver `api/artDirection.ts`. Quando vem,
   * substitui o bloco literal pelo modo `ai`, que é o que faz a arte sair
   * com label, hierarquia e botão em vez de linhas do mesmo tamanho.
   */
  copyBlocks?: PromptCopyBlocks | null;
  designSystemDoc?: string | null;
  antiPadroes?: string[] | null;
  mood?: { adjetivos: string[]; referencias: string[]; evita: string[] } | null;
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
    artDirection: input.artDirection ?? null,
    designSystemDoc: input.designSystemDoc ?? '',
    antiPadroes: input.antiPadroes ?? null,
    mood: moodDoPedido(input.mood, input.artDirection),
    // Papéis quando eles foram validados; o texto cru quando não. Nunca os
    // dois: o modo `ai` já renderiza cada pedaço, e repetir a copy inteira
    // logo abaixo faria a arte sair com o texto duplicado.
    copy: input.copyBlocks
      ? { source: 'ai', blocks: input.copyBlocks }
      : copyTexto ? { source: 'original', text: copyTexto } : null,
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
  /**
   * As pessoas anexadas. Viajam no mesmo canal dos produtos, mas PRIMEIRO —
   * o bloco [TALENT] indexa as primeiras imagens e o [PRODUCT] as últimas.
   * Sem elas aqui, o prompt continuava afirmando `avatarCount` e a arte
   * voltava com outro rosto.
   */
  avatarImages?: string[];
  logoImage?: string | null;
  /**
   * A arte de origem, quando o prompt salvo depende de ver uma imagem —
   * é o caso do reenquadramento, cujo texto abre dizendo que a imagem
   * anexada É a arte.
   */
  sourceImage?: string | null;
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
      // Mesma ordem da geração original. Inverter aqui faria [TALENT] apontar
      // para o produto e [PRODUCT] para a pessoa.
      productImages: [...(asset.avatarImages ?? []), ...(asset.productImages ?? [])],
      logoImage: asset.logoImage ?? null,
      storyReference: asset.sourceImage ?? null,
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
 * Isto NÃO é gerar de novo em outro formato — é reenquadrar a arte que já
 * existe. A diferença parece sutil e não é: a arte nunca ia anexada, então
 * tudo o que o modelo recebia era o TEXTO do prompt original. E um prompt
 * descreve uma intenção, não uma peça. Ele reinterpretava a intenção do
 * zero e devolvia outro anúncio — mesma marca, mesma copy, composição
 * inteiramente nova, às vezes com objetos que nunca estiveram na peça
 * aprovada.
 *
 * Duas coisas consertam isso, e as duas eram necessárias:
 *
 * A arte vai anexada, em `storyReference` — o canal que a edge function já
 * entende como "referência de consistência visual", e que o bloco
 * `[VISUAL CONSISTENCY]` do montador já previa. Ninguém preenchia aqui.
 *
 * E o prompt passa a liderar pelo reenquadramento, com o briefing original
 * rebaixado a contexto no fim. O que vem primeiro pesa mais, e o que
 * precisa pesar mais aqui é "a verdade é a imagem anexada", não "faça um
 * anúncio para tal negócio".
 *
 * O override de enquadramento continua: sem ele a arte quadrada nasceria
 * com a zona segura do formato de origem — a margem inferior de 35% de um
 * Story, por exemplo.
 */
export function buildResizeRequest(input: {
  originalPrompt: string;
  /** A arte aprovada. Sem ela isto vira uma geração nova disfarçada. */
  originalImageUrl?: string | null;
}): GenerationRequest {
  const temArte = !!input.originalImageUrl;

  const reframe = temArte
    ? `[REFRAME — THIS IS NOT A NEW ARTWORK]
The attached reference image IS the artwork. It is already approved. This render is that SAME artwork re-composed for a square canvas — not a new interpretation of the brief below.
Keep every element that appears in the attached image: the same person and their exact likeness, the same product, the same background, the same colour palette, the same photographic treatment, the same typefaces, and the same words rendered exactly as they appear there.
Do NOT add any object, prop, person, badge or line of text that is not visible in the attached image. Do NOT remove any either. Nothing enters and nothing leaves.
What changes is ONLY the arrangement: reposition and rescale the existing elements to fit the square frame and to respect the safe area below, and extend the existing background naturally into the space the new proportion opens up.`
    : `[REFRAME — THIS IS NOT A NEW ARTWORK]
Re-compose the artwork described below for a square canvas, keeping every element, colour and word it specifies. Do not introduce anything new.`;

  const override = `[FRAMING OVERRIDE — THIS RENDER IS 1:1]
This render is a 1:1 square (1080x1080). Ignore every framing and safe-zone instruction stated in the brief below; the block that follows replaces them.`;

  // O briefing original vem por último e rotulado: ele carrega paleta,
  // tipografia e a copy exata, que continuam valendo — mas quem manda na
  // composição é a imagem anexada, não este texto.
  const briefing = `[ORIGINAL BRIEF — CONTEXT ONLY]
${temArte
    ? 'The brief that produced the attached artwork. Use it to keep palette, typography and wording consistent — never to re-invent the composition.'
    : 'The brief that produced the artwork.'}
${input.originalPrompt}`;

  const prompt = [reframe, override, buildSafeZoneBlock('1:1'), briefing].join('\n\n');

  return {
    prompt,
    body: {
      prompt,
      aspectRatio: 'square',
      formatRatio: '1:1',
      model: IMAGE_GENERATION_MODEL.id,
      // A arte inteira já contém produto e logo renderizados. Reanexá-los
      // como referência separada convidaria o modelo a desenhá-los de novo,
      // que é o oposto de reenquadrar.
      productImages: [],
      logoImage: null,
      storyReference: input.originalImageUrl ?? null,
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
  /**
   * O sistema visual lido das referências da peça-base.
   *
   * As cinco variações são da mesma oferta e da mesma marca: deixá-las sem
   * o documento que a base teve faria o lote divergir do original
   * justamente no que ele deveria preservar.
   */
  designSystemDoc?: string | null;
  antiPadroes?: string[] | null;
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
    designSystemDoc: input.designSystemDoc ?? '',
    antiPadroes: input.antiPadroes ?? null,
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
