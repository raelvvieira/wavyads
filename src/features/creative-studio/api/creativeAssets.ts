import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  ARTWORK_ASSET_TYPES,
  type CreativeArtworkSections,
  type CreativeAsset,
  type CreativeAssetGroup,
  type CreativeAssetGroupType,
  type CreativeAssetStatus,
  type CreativeAssetType,
  type FactorAxis,
  type FactorGroupView,
} from '../types/creative';

type AssetRow = Database['public']['Tables']['creative_assets']['Row'];
type GroupRow = Database['public']['Tables']['creative_asset_groups']['Row'];

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export function mapAssetRow(row: AssetRow): CreativeAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    type: row.type as CreativeAssetType,
    status: (row.status as CreativeAssetStatus) || 'ready',
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    parentAssetId: row.parent_asset_id,
    rootAssetId: row.root_asset_id,
    groupId: row.group_id,
    factorAxis: (row.factor_axis as FactorAxis | null) ?? null,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    width: row.width,
    height: row.height,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt,
    model: row.model,
    errorMessage: row.error_message,
    filename: row.filename,
    isClientIntelligence: row.is_client_intelligence,
    metadata: asRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapGroupRow(row: GroupRow): CreativeAssetGroup {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as CreativeAssetGroupType,
    parentAssetId: row.parent_asset_id,
    title: row.title,
    metadata: asRecord(row.metadata),
    createdAt: row.created_at,
  };
}

export interface CreateCreativeAssetInput {
  projectId: string;
  type: CreativeAssetType;
  /** Ausente quando o asset é criado antes da imagem existir (queued/generating). */
  url?: string | null;
  thumbnailUrl?: string | null;
  status?: CreativeAssetStatus;
  /** A arte da qual esta derivou. Fator, edição e resize sempre têm pai. */
  parentAssetId?: string | null;
  groupId?: string | null;
  factorAxis?: FactorAxis | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  width?: number | null;
  height?: number | null;
  prompt?: string | null;
  negativePrompt?: string | null;
  model?: string | null;
  filename?: string | null;
  clientId?: string | null;
  isClientIntelligence?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Cria um asset. `rootAssetId` é deliberadamente ausente do input: quem calcula
 * é o trigger no banco, a partir do pai. Deixar isso para o cliente é como a
 * árvore ficaria inconsistente na primeira chamada que esquecesse de propagar.
 */
export async function createCreativeAsset(input: CreateCreativeAssetInput): Promise<CreativeAsset> {
  const { data: userData } = await supabase.auth.getUser();
  const url = input.url ?? null;

  const { data, error } = await supabase
    .from('creative_assets')
    .insert({
      project_id: input.projectId,
      client_id: input.clientId ?? null,
      type: input.type,
      status: input.status ?? (url ? 'ready' : 'queued'),
      url,
      thumbnail_url: input.thumbnailUrl ?? url,
      parent_asset_id: input.parentAssetId ?? null,
      group_id: input.groupId ?? null,
      factor_axis: input.factorAxis ?? null,
      aspect_ratio: input.aspectRatio ?? null,
      resolution: input.resolution ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      prompt: input.prompt ?? null,
      negative_prompt: input.negativePrompt ?? null,
      model: input.model ?? null,
      filename: input.filename ?? null,
      is_client_intelligence: input.isClientIntelligence ?? false,
      metadata: input.metadata ?? {},
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapAssetRow(data);
}

export interface UpdateCreativeAssetInput {
  url?: string | null;
  thumbnailUrl?: string | null;
  status?: CreativeAssetStatus;
  errorMessage?: string | null;
  isClientIntelligence?: boolean;
  metadata?: Record<string, any>;
}

export async function updateCreativeAsset(
  assetId: string,
  patch: UpdateCreativeAssetInput,
): Promise<CreativeAsset> {
  const payload: Database['public']['Tables']['creative_assets']['Update'] = {};
  if (patch.url !== undefined) payload.url = patch.url;
  if (patch.thumbnailUrl !== undefined) payload.thumbnail_url = patch.thumbnailUrl;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  if (patch.isClientIntelligence !== undefined) payload.is_client_intelligence = patch.isClientIntelligence;
  if (patch.metadata !== undefined) payload.metadata = patch.metadata;

  const { data, error } = await supabase
    .from('creative_assets')
    .update(payload)
    .eq('id', assetId)
    .select('*')
    .single();

  if (error) throw error;
  return mapAssetRow(data);
}

/** Só as artes produzidas — insumos (referência, logo, produto) ficam de fora. */
export async function listProjectArtworks(projectId: string): Promise<CreativeAsset[]> {
  const { data, error } = await supabase
    .from('creative_assets')
    .select('*')
    .eq('project_id', projectId)
    .in('type', ARTWORK_ASSET_TYPES as unknown as string[])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapAssetRow);
}

export async function listProjectAssetGroups(projectId: string): Promise<CreativeAssetGroup[]> {
  const { data, error } = await supabase
    .from('creative_asset_groups')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapGroupRow);
}

export async function createAssetGroup(input: {
  projectId: string;
  type: CreativeAssetGroupType;
  parentAssetId?: string | null;
  title?: string | null;
  metadata?: Record<string, any>;
}): Promise<CreativeAssetGroup> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('creative_asset_groups')
    .insert({
      project_id: input.projectId,
      type: input.type,
      parent_asset_id: input.parentAssetId ?? null,
      title: input.title ?? null,
      metadata: input.metadata ?? {},
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapGroupRow(data);
}

/**
 * Monta as seções do Canvas a partir da linhagem — função pura, sem I/O.
 * É isto que substitui as listas paralelas (storyImage/factorImages/
 * editedVersions) que hoje vivem no state do React.
 */
export function buildArtworkSections(
  assets: CreativeAsset[],
  groups: CreativeAssetGroup[] = [],
): CreativeArtworkSections {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const buckets = new Map<string, FactorGroupView>();

  for (const asset of assets) {
    if (asset.type !== 'factor') continue;
    // Lotes antigos não têm grupo: caem para a arte de origem, depois para a
    // raiz da árvore. Sem nenhum vínculo, a própria arte vira seu bucket em vez
    // de todas as órfãs se fundirem num grupo falso.
    const key = asset.groupId ?? asset.parentAssetId ?? asset.rootAssetId ?? asset.id;
    let bucket = buckets.get(key);
    if (!bucket) {
      const group = asset.groupId ? groupById.get(asset.groupId) ?? null : null;
      bucket = {
        group,
        parentAssetId: group?.parentAssetId ?? asset.parentAssetId ?? null,
        assets: [],
      };
      buckets.set(key, bucket);
    }
    bucket.assets.push(asset);
  }

  return {
    originals: assets.filter((asset) => asset.type === 'original' || asset.type === 'imported'),
    factorGroups: Array.from(buckets.values()),
    edited: assets.filter((asset) => asset.type === 'edited'),
    resizes: assets.filter((asset) => asset.type === 'resize'),
  };
}

/** Todas as artes que descendem de uma raiz — uma query, por mais fundo que vá. */
export async function listAssetLineage(rootAssetId: string): Promise<CreativeAsset[]> {
  const { data, error } = await supabase
    .from('creative_assets')
    .select('*')
    .eq('root_asset_id', rootAssetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapAssetRow);
}
