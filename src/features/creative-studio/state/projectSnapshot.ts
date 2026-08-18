import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';

/**
 * Codec do snapshot de projeto do Criativo Studio.
 *
 * O autosave grava o estado inteiro da sessão em
 * `creative_project_state.state_json`. Enquanto isso vivia dentro do
 * componente, dois defeitos reais passaram despercebidos por não haver onde
 * testar: campos gravados e nunca repostos, e as âncoras de linhagem
 * ausentes do snapshot.
 *
 * A leitura é tolerante de propósito: todo projeto já salvo é uma versão
 * anterior deste formato, e abrir um projeto antigo não pode falhar por
 * causa de um campo que ainda não existia quando ele foi salvo.
 */

/** Chaves que o snapshot carrega. Serve de contrato para os dois lados. */
export const SNAPSHOT_KEYS = [
  'currentStage', 'rightPanelMode', 'conversationMessages', 'initialPrompt',
  'selectedAspectRatio', 'selectedResolution', 'step', 'refImages', 'analysis',
  'editedDoc', 'rawCopy', 'copyVariations', 'selectedVariationIdx', 'copyApproved',
  'copySource', 'suggestedRawCopy', 'productUrl', 'urlContext', 'logoImage',
  'productImages', 'preserveFaces', 'model', 'language', 'businessContext',
  'negativePrompt', 'storyImage', 'squareImage',
  'mainStoryAssetId', 'mainSquareAssetId', 'factorAssetIds', 'factorSquareAssetIds',
  'factorVariations', 'factorImages', 'factorErrors', 'factorSquareImages',
  'editedVersions', 'projectTitle', 'selectedTemplateId', 'selectedTemplate',
  'selectedClientId',
] as const;

export type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];

export const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
export const DEFAULT_LANGUAGE = 'pt-BR';
export const DEFAULT_ASPECT_RATIO: CreativeAspectRatio = '4:5';
export const DEFAULT_RESOLUTION: CreativeResolution = '4K';

const CINCO_NULOS = [null, null, null, null, null];

/** Cinco posições, uma por eixo do Fator. Snapshot curto é completado. */
function cincoSlots<T>(valor: unknown, vazio: T): (T | null)[] {
  const base = Array.isArray(valor) ? valor : [];
  return Array.from({ length: 5 }, (_, i) => (base[i] ?? vazio) as T | null);
}

export interface ProjectSnapshot {
  [key: string]: unknown;
}

/**
 * Estado normalizado para repor na interface.
 *
 * `any` nos campos de domínio é herança do componente, que ainda não tipa
 * análise, copy e template. Tipar isso é trabalho de outra etapa; forçar
 * agora só moveria o `any` de lugar.
 */
export interface RestoredProjectState {
  currentStage: string;
  rightPanelMode: string;
  conversationMessages: any[];
  initialPrompt: string;
  selectedAspectRatio: CreativeAspectRatio;
  selectedResolution: CreativeResolution;
  step: number;
  refImages: any[];
  analysis: any | null;
  editedDoc: string;
  rawCopy: string;
  copyVariations: any[];
  selectedVariationIdx: number | null;
  copyApproved: boolean;
  copySource: string;
  suggestedRawCopy: string;
  productUrl: string;
  urlContext: any | null;
  logoImage: any[];
  productImages: any[];
  preserveFaces: boolean;
  model: string;
  language: string;
  businessContext: string;
  negativePrompt: string;
  storyImage: string | null;
  squareImage: string | null;
  mainStoryAssetId: string | null;
  mainSquareAssetId: string | null;
  factorAssetIds: (string | null)[];
  factorSquareAssetIds: (string | null)[];
  factorVariations: any[] | null;
  factorImages: any[];
  factorErrors: any[];
  factorSquareImages: (string | null)[];
  editedVersions: Record<string, any[]>;
  projectTitle: string;
  selectedTemplateId: string | null;
  selectedTemplate: any | null;
  selectedClientId: string | null;
}

/** Lê um snapshot de qualquer época e devolve estado pronto para a interface. */
export function readProjectSnapshot(raw: ProjectSnapshot | null | undefined): RestoredProjectState {
  const s = (raw ?? {}) as Record<string, any>;

  return {
    currentStage: s.currentStage || 'initial',
    rightPanelMode: s.rightPanelMode || 'none',
    conversationMessages: s.conversationMessages || [],
    initialPrompt: s.initialPrompt || '',
    selectedAspectRatio: (s.selectedAspectRatio || DEFAULT_ASPECT_RATIO) as CreativeAspectRatio,
    selectedResolution: (s.selectedResolution || DEFAULT_RESOLUTION) as CreativeResolution,
    step: typeof s.step === 'number' ? s.step : 0,
    refImages: s.refImages || [],
    analysis: s.analysis || null,
    editedDoc: s.editedDoc || '',
    rawCopy: s.rawCopy || '',
    copyVariations: s.copyVariations || [],
    selectedVariationIdx: s.selectedVariationIdx ?? null,
    copyApproved: !!s.copyApproved,
    copySource: s.copySource || 'ai',
    suggestedRawCopy: s.suggestedRawCopy || '',
    productUrl: s.productUrl || '',
    urlContext: s.urlContext || null,
    logoImage: s.logoImage || [],
    productImages: s.productImages || [],
    // `?? true` e não `|| true`: `false` é uma escolha do usuário, não ausência.
    preserveFaces: s.preserveFaces ?? true,
    model: s.model || DEFAULT_MODEL,
    language: s.language || DEFAULT_LANGUAGE,
    businessContext: s.businessContext || '',
    negativePrompt: s.negativePrompt || '',
    storyImage: s.storyImage || null,
    squareImage: s.squareImage || null,
    mainStoryAssetId: s.mainStoryAssetId || null,
    mainSquareAssetId: s.mainSquareAssetId || null,
    factorAssetIds: cincoSlots<string>(s.factorAssetIds, null),
    factorSquareAssetIds: cincoSlots<string>(s.factorSquareAssetIds, null),
    factorVariations: s.factorVariations || null,
    factorImages: s.factorImages || [],
    factorErrors: s.factorErrors || [],
    factorSquareImages: cincoSlots<string>(s.factorSquareImages, null),
    editedVersions: s.editedVersions || {},
    projectTitle: s.projectTitle || (s.initialPrompt || '').slice(0, 60) || 'Novo criativo',
    selectedTemplateId: s.selectedTemplateId || null,
    selectedTemplate: s.selectedTemplate || null,
    selectedClientId: s.selectedClientId || null,
  };
}

/**
 * Thumbnail do histórico.
 *
 * Um `data:` URI aqui infla a listagem inteira, que lê a coluna em massa —
 * e um data URI só aparece quando o upload ao Storage falhou. Cada candidato
 * é avaliado por si: o primeiro truthy pode ser justamente o inválido.
 */
export function pickThumbnailUrl(candidatos: (string | null | undefined)[]): string | null {
  return candidatos.find((u): u is string => !!u && !u.startsWith('data:')) ?? null;
}
