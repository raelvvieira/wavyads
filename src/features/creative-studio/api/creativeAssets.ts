import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type {
  CreativeAsset,
  CreativeAssetGroup,
  CreativeAssetGroupType,
  CreativeAssetStatus,
  CreativeAssetType,
  FactorAxis,
} from '../types/creative';

type AssetRow = Database['public']['Tables']['creative_assets']['Row'];
type GroupRow = Database['public']['Tables']['creative_asset_groups']['Row'];

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function mapAssetRow(row: AssetRow): CreativeAsset {
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

function mapGroupRow(row: GroupRow): CreativeAssetGroup {
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

export interface ListCreativeAssetsFilter {
  projectId?: string | null;
  clientId?: string | null;
  limit?: number;
}

/**
 * Lê os assets para o canvas.
 *
 * Traz TODOS os tipos, incluindo insumo — o corte de "o que o canvas
 * desenha" é do seletor `visibleCanvasAssets`, não da consulta. Separar
 * assim é o que permite o inspetor montar a linhagem completa: um resize
 * cujo avô ficou de fora da consulta apareceria solto na árvore.
 */
export async function listCreativeAssets(
  filtro: ListCreativeAssetsFilter = {},
): Promise<CreativeAsset[]> {
  let query = supabase
    .from('creative_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filtro.limit ?? 300);

  if (filtro.projectId) query = query.eq('project_id', filtro.projectId);
  if (filtro.clientId) query = query.eq('client_id', filtro.clientId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssetRow);
}
