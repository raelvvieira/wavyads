// Modelo de domínio do Criativo Studio.
//
// Toda imagem é um CreativeAsset, e toda transformação (Fator Criativo,
// edição, resize) cria OUTRO asset ligado ao anterior por parent_asset_id —
// nada é sobrescrito. O vocabulário de `type` e o CHECK do banco andam juntos:
// mudar um sem o outro faz a gravação falhar.

export type CreativeAspectRatio =
  | '1:1' | '4:5' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '21:9';

export type CreativeResolution = '1K' | '2K' | '4K';

/** Formato que a edge function de geração entende (só tem esses dois). */
export type BackendAspect = 'story' | 'square';

/** Insumos que o usuário envia. */
export const SOURCE_ASSET_TYPES = ['reference', 'logo', 'product', 'avatar', 'template'] as const;

/** Artes produzidas — é isso que o Canvas desenha. */
export const ARTWORK_ASSET_TYPES = ['original', 'factor', 'edited', 'resize', 'imported'] as const;

export type SourceAssetType = (typeof SOURCE_ASSET_TYPES)[number];
export type ArtworkAssetType = (typeof ARTWORK_ASSET_TYPES)[number];
export type CreativeAssetType = SourceAssetType | ArtworkAssetType;

export type CreativeAssetStatus = 'queued' | 'generating' | 'ready' | 'failed';

export type FactorAxis = 'emotional' | 'offer' | 'persona' | 'hook' | 'structure';

export type CreativeAssetGroupType = 'original' | 'factor' | 'variations' | 'resize' | 'edited';

export interface CreativeAsset {
  id: string;
  projectId: string | null;
  clientId: string | null;
  type: CreativeAssetType;
  status: CreativeAssetStatus;
  /** Nulo enquanto o asset está em 'queued'/'generating'. */
  url: string | null;
  thumbnailUrl: string | null;
  parentAssetId: string | null;
  /** Raiz da árvore. Derivado por trigger no banco, nunca informado pelo cliente. */
  rootAssetId: string | null;
  groupId: string | null;
  factorAxis: FactorAxis | null;
  aspectRatio: string | null;
  resolution: string | null;
  width: number | null;
  height: number | null;
  prompt: string | null;
  negativePrompt: string | null;
  model: string | null;
  errorMessage: string | null;
  filename: string | null;
  isClientIntelligence: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeAssetGroup {
  id: string;
  projectId: string;
  type: CreativeAssetGroupType;
  parentAssetId: string | null;
  title: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export const FACTOR_AXIS_LABELS: Record<FactorAxis, string> = {
  emotional: 'Emocional',
  offer: 'Oferta',
  persona: 'Persona',
  hook: 'Hook',
  structure: 'Estrutura',
};

export const ASSET_STATUS_LABELS: Record<CreativeAssetStatus, string> = {
  queued: 'Na fila',
  generating: 'Gerando',
  ready: 'Pronta',
  failed: 'Falhou',
};

/** Rótulo de exibição do tipo — só os que o Canvas desenha têm um aqui. */
export const ASSET_ORIGIN_LABELS: Partial<Record<CreativeAssetType, string>> = {
  original: 'Geração original',
  factor: 'Fator Criativo',
  edited: 'Edição',
  resize: 'Redimensionamento',
  imported: 'Importada',
};

// A IA do Fator Criativo devolve o eixo em português livre ("Emocional",
// "emoção", "Oferta"...). O banco guarda o valor canônico, então normalizamos
// aqui — sem casar, grava null em vez de estourar o CHECK constraint.
const FACTOR_AXIS_ALIASES: Array<[FactorAxis, string[]]> = [
  ['emotional', ['emotional', 'emocional', 'emocao', 'emocional/afetivo']],
  ['offer', ['offer', 'oferta', 'preco', 'promocao']],
  ['persona', ['persona', 'publico', 'avatar', 'audiencia']],
  ['hook', ['hook', 'gancho', 'headline']],
  ['structure', ['structure', 'estrutura', 'layout', 'formato']],
];

export function normalizeFactorAxis(raw?: string | null): FactorAxis | null {
  if (!raw) return null;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  for (const [axis, aliases] of FACTOR_AXIS_ALIASES) {
    if (aliases.some((alias) => normalized === alias || normalized.startsWith(alias))) return axis;
  }
  return null;
}
