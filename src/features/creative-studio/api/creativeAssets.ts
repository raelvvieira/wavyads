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
  const extra = row as AssetRow & {
    strategic_angle?: string | null;
    strategic_thesis?: string | null;
    quality_score?: number | null;
  };
  const meta = asRecord(row.metadata);
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
    metadata: meta,
    strategicAngle: extra.strategic_angle ?? meta.strategicAngle ?? null,
    strategicThesis: extra.strategic_thesis ?? meta.strategicThesis ?? null,
    qualityScore: extra.quality_score ?? meta.qualityScore ?? null,
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
  /**
   * Nulo para insumo e template.
   *
   * A coluna sempre foi nulável no banco; era o tipo daqui que obrigava um
   * projeto. Com ele obrigatório, subir um logo criava um "Novo projeto"
   * vazio só para ter o que carimbar — e o projeto novo acendia o chip
   * "Só este projeto", estreitando o canvas sem que ninguém tivesse pedido.
   * Insumo é do cliente e atravessa campanhas; projeto é da arte.
   */
  projectId: string | null;
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
  /** Fator Criativo V2 — o ângulo e o veredito de qualidade viram coluna
   *  porque é por eles que se filtra e ordena depois; o resto fica em JSON. */
  strategicAngle?: string | null;
  angleSubtype?: string | null;
  strategicThesis?: string | null;
  awarenessLevel?: string | null;
  dominantEmotion?: string | null;
  qualityScore?: number | null;
  strategyJson?: Record<string, any> | null;
  validationJson?: Record<string, any> | null;
  generationVersion?: string | null;
}

/**
 * Cria um asset. `rootAssetId` é deliberadamente ausente do input: quem calcula
 * é o trigger no banco, a partir do pai. Deixar isso para o cliente é como a
 * árvore ficaria inconsistente na primeira chamada que esquecesse de propagar.
 */
export async function createCreativeAsset(input: CreateCreativeAssetInput): Promise<CreativeAsset> {
  const { data: userData } = await supabase.auth.getUser();
  const url = input.url ?? null;

  const linha = {
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
      strategic_angle: input.strategicAngle ?? null,
      angle_subtype: input.angleSubtype ?? null,
      strategic_thesis: input.strategicThesis ?? null,
      awareness_level: input.awarenessLevel ?? null,
      dominant_emotion: input.dominantEmotion ?? null,
      quality_score: input.qualityScore ?? null,
      strategy_json: input.strategyJson ?? null,
      validation_json: input.validationJson ?? null,
      generation_version: input.generationVersion ?? null,
      created_by: userData.user?.id ?? null,
  };

  const { data, error } = await supabase.from('creative_assets').insert(linha).select('*').single();
  if (!error) return mapAssetRow(data);

  // As colunas da V2 do Fator podem não existir: a migração vive no
  // repositório, mas quem a aplica no banco é um passo de deploy separado, e
  // um banco atrasado derrubava os CINCO inserts do lote de uma vez — depois
  // de a geração de texto já ter sido paga, e sem deixar um card na tela.
  //
  // Aqui a linha é regravada sem esses campos. Nada se perde: a estratégia
  // inteira já viaja em `metadata`, que é jsonb e sempre existe. As colunas
  // dedicadas são otimização de consulta, não pré-requisito do recurso.
  if (!ehErroDeColunaDesconhecida(error)) throw error;

  const { data: dataLegado, error: erroLegado } = await supabase
    .from('creative_assets')
    .insert(semCamposV2(linha))
    .select('*')
    .single();
  if (erroLegado) throw erroLegado;
  return mapAssetRow(dataLegado);
}

/** Colunas que só existem depois da migração do Fator Criativo V2. */
const CAMPOS_V2 = [
  'strategic_angle', 'angle_subtype', 'strategic_thesis', 'awareness_level',
  'dominant_emotion', 'quality_score', 'strategy_json', 'validation_json',
  'generation_version',
] as const;

// O retorno continua `T`: todos os campos removidos são opcionais no tipo
// de insert, então tirá-los não deixa a linha inválida — e `Partial<T>`
// tornaria `type` opcional, que o insert exige.
function semCamposV2<T extends Record<string, unknown>>(linha: T): T {
  const copia: Record<string, unknown> = { ...linha };
  for (const campo of CAMPOS_V2) delete copia[campo];
  return copia as T;
}

/**
 * `PGRST204` é o PostgREST dizendo que a coluna não está no schema cache;
 * `42703` é o Postgres dizendo que ela não existe. Qualquer outro erro
 * (RLS, CHECK, FK) é problema de verdade e continua subindo.
 */
function ehErroDeColunaDesconhecida(error: { code?: string | null }): boolean {
  return error?.code === 'PGRST204' || error?.code === '42703';
}

/**
 * Apaga um asset — chamada direta, sem edge function. A RLS `FOR ALL` de
 * admin já cobre `DELETE`, mesmo caminho que a tela V1 já usa para apagar
 * uma referência. Não é soft-delete: a linha some do banco de verdade.
 *
 * `parent_asset_id`/`root_asset_id`/`group_id` de eventuais filhos são
 * `ON DELETE SET NULL` — filhos não são apagados junto, só orfanados.
 */
export async function deleteCreativeAsset(id: string): Promise<void> {
  const { error } = await supabase.from('creative_assets').delete().eq('id', id);
  if (error) throw error;
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
  /**
   * Restringe por tipo, no BANCO.
   *
   * Existia como parâmetro fantasma: `UgcProjectPage` já passava
   * `types: ['avatar']` com um `as any`, e a consulta simplesmente ignorava
   * — o seletor de avatar do UGC recebia o acervo inteiro do cliente,
   * artes e tudo. O cast escondia justamente o erro que o tipo pegaria.
   */
  types?: readonly CreativeAssetType[];
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
  if (filtro.types?.length) query = query.in('type', filtro.types as string[]);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssetRow);
}

export interface UpdateCreativeAssetInput {
  status?: CreativeAssetStatus;
  /** Marca a arte como referência aprovada da marca. */
  isClientIntelligence?: boolean;
  url?: string | null;
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
  width?: number | null;
  height?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Atualiza um asset já gravado.
 *
 * Existe para o ciclo `queued/generating` → `ready`/`failed`: o V2 grava a
 * linha ANTES de chamar a IA, para que a arte apareça no canvas gerando de
 * verdade, e completa a mesma linha quando a resposta volta — em vez de só
 * inserir no fim, que escondia qualquer falha a meio do caminho.
 */
export async function updateCreativeAsset(
  id: string,
  patch: UpdateCreativeAssetInput,
): Promise<CreativeAsset> {
  const row: Record<string, any> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = patch.thumbnailUrl;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.width !== undefined) row.width = patch.width;
  if (patch.height !== undefined) row.height = patch.height;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  if (patch.isClientIntelligence !== undefined) row.is_client_intelligence = patch.isClientIntelligence;

  const { data, error } = await supabase
    .from('creative_assets')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapAssetRow(data);
}
