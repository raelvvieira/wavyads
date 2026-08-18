import { readProjectSnapshot, type ProjectSnapshot } from './projectSnapshot';

/**
 * Snapshot V2, agrupado por domínio.
 *
 * O formato atual é um objeto plano de 35 campos, sem versão. Sem uma marca
 * de versão não há como um leitor futuro saber o que está lendo — e com um
 * único nível, cada campo novo aumenta a chance de alguém gravar estado
 * efêmero de interface junto com trabalho do usuário.
 *
 * A regra do plano que este módulo respeita: **abrir um projeto não o
 * converte.** A migração acontece na primeira gravação depois de uma mudança
 * real, e um projeto só lido continua no formato em que estava.
 */

export const STUDIO_SNAPSHOT_VERSION = 2 as const;

export interface StudioSnapshotV2 {
  schemaVersion: 2;
  project: {
    title: string;
    initialPrompt: string;
    businessContext: string;
    clientId: string | null;
    templateId: string | null;
  };
  generation: {
    aspectRatio: string;
    resolution: string;
    model: string;
    language: string;
    preserveFaces: boolean;
  };
  conversation: {
    messages: unknown[];
    stage: string;
    step: number;
  };
  copy: {
    source: string;
    approved: boolean;
    raw: string;
    variations: unknown[];
    selectedIndex: number | null;
  };
  artwork: {
    storyImage: string | null;
    squareImage: string | null;
    /** Âncoras de linhagem. Perdê-las produz arte órfã na próxima edição. */
    mainStoryAssetId: string | null;
    mainSquareAssetId: string | null;
    factorAssetIds: (string | null)[];
    factorSquareAssetIds: (string | null)[];
    factorImages: unknown[];
    factorSquareImages: (string | null)[];
    factorVariations: unknown[] | null;
    factorErrors: unknown[];
    editedVersions: Record<string, unknown[]>;
  };
  /** Campos que o leitor não conhecia. Guardados para não se perderem. */
  legacy?: Record<string, unknown>;
}

/** Chaves do formato plano que o V2 acomoda em algum domínio. */
const MAPEADAS = new Set([
  'projectTitle', 'initialPrompt', 'businessContext', 'selectedClientId', 'selectedTemplateId',
  'selectedAspectRatio', 'selectedResolution', 'model', 'language', 'preserveFaces',
  'conversationMessages', 'currentStage', 'step',
  'copySource', 'copyApproved', 'rawCopy', 'copyVariations', 'selectedVariationIdx',
  'storyImage', 'squareImage', 'mainStoryAssetId', 'mainSquareAssetId',
  'factorAssetIds', 'factorSquareAssetIds', 'factorImages', 'factorSquareImages',
  'factorVariations', 'factorErrors', 'editedVersions',
]);

export function isSnapshotV2(raw: unknown): raw is StudioSnapshotV2 {
  return !!raw && typeof raw === 'object' && (raw as any).schemaVersion === STUDIO_SNAPSHOT_VERSION;
}

/**
 * Converte o formato plano para V2.
 *
 * O que não estava mapeado vai para `legacy` em vez de ser descartado: uma
 * conversão que perde campo silenciosamente é pior que nenhuma conversão,
 * porque o dado some sem deixar rastro.
 */
export function toSnapshotV2(raw: ProjectSnapshot | null | undefined): StudioSnapshotV2 {
  if (isSnapshotV2(raw)) return raw;

  const s = readProjectSnapshot(raw);
  const bruto = (raw ?? {}) as Record<string, unknown>;

  const legacy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(bruto)) {
    if (!MAPEADAS.has(k) && k !== 'schemaVersion') legacy[k] = v;
  }

  return {
    schemaVersion: STUDIO_SNAPSHOT_VERSION,
    project: {
      title: s.projectTitle,
      initialPrompt: s.initialPrompt,
      businessContext: s.businessContext,
      clientId: s.selectedClientId,
      templateId: s.selectedTemplateId,
    },
    generation: {
      aspectRatio: s.selectedAspectRatio,
      resolution: s.selectedResolution,
      model: s.model,
      language: s.language,
      preserveFaces: s.preserveFaces,
    },
    conversation: {
      messages: s.conversationMessages,
      stage: s.currentStage,
      step: s.step,
    },
    copy: {
      source: s.copySource,
      approved: s.copyApproved,
      raw: s.rawCopy,
      variations: s.copyVariations,
      selectedIndex: s.selectedVariationIdx,
    },
    artwork: {
      storyImage: s.storyImage,
      squareImage: s.squareImage,
      mainStoryAssetId: s.mainStoryAssetId,
      mainSquareAssetId: s.mainSquareAssetId,
      factorAssetIds: s.factorAssetIds,
      factorSquareAssetIds: s.factorSquareAssetIds,
      factorImages: s.factorImages,
      factorSquareImages: s.factorSquareImages,
      factorVariations: s.factorVariations,
      factorErrors: s.factorErrors,
      editedVersions: s.editedVersions,
    },
    ...(Object.keys(legacy).length ? { legacy } : {}),
  };
}

/**
 * Volta ao formato plano.
 *
 * Existe para que a V2 possa ser desligada pela feature flag sem deixar
 * projetos ilegíveis para a página antiga — rollback que exige migração de
 * dados não é rollback.
 */
export function fromSnapshotV2(v2: StudioSnapshotV2): Record<string, unknown> {
  return {
    ...(v2.legacy ?? {}),
    projectTitle: v2.project.title,
    initialPrompt: v2.project.initialPrompt,
    businessContext: v2.project.businessContext,
    selectedClientId: v2.project.clientId,
    selectedTemplateId: v2.project.templateId,
    selectedAspectRatio: v2.generation.aspectRatio,
    selectedResolution: v2.generation.resolution,
    model: v2.generation.model,
    language: v2.generation.language,
    preserveFaces: v2.generation.preserveFaces,
    conversationMessages: v2.conversation.messages,
    currentStage: v2.conversation.stage,
    step: v2.conversation.step,
    copySource: v2.copy.source,
    copyApproved: v2.copy.approved,
    rawCopy: v2.copy.raw,
    copyVariations: v2.copy.variations,
    selectedVariationIdx: v2.copy.selectedIndex,
    storyImage: v2.artwork.storyImage,
    squareImage: v2.artwork.squareImage,
    mainStoryAssetId: v2.artwork.mainStoryAssetId,
    mainSquareAssetId: v2.artwork.mainSquareAssetId,
    factorAssetIds: v2.artwork.factorAssetIds,
    factorSquareAssetIds: v2.artwork.factorSquareAssetIds,
    factorImages: v2.artwork.factorImages,
    factorSquareImages: v2.artwork.factorSquareImages,
    factorVariations: v2.artwork.factorVariations,
    factorErrors: v2.artwork.factorErrors,
    editedVersions: v2.artwork.editedVersions,
  };
}
