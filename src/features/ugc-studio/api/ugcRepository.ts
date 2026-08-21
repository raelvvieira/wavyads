import { supabase } from '@/integrations/supabase/client';
import type {
  UgcClip, UgcClipKind, UgcClipStatus, UgcProject, UgcResolution, UgcScript, UgcSegment, UgcTier,
} from '../types/ugc';

/**
 * Acesso a banco do UGC Studio.
 *
 * As tabelas são novas e ainda não estão nos tipos gerados do Supabase, daí
 * o cast — a mesma dívida conhecida de `projectRepository.ts:14`.
 */
const db = supabase as any;

/**
 * Traduz o erro de tabela ausente numa frase acionável.
 *
 * Sem isto, um banco sem a migração devolve `PGRST205 Could not find the
 * table 'public.ugc_projects' in the schema cache` — que não diz a ninguém o
 * que fazer. E a chance de acontecer é real: no Fator Criativo a migração
 * ficou dias sem ser aplicada pelo pipeline, e o diagnóstico custou três
 * rodadas.
 */
const MIGRACAO_AUSENTE =
  'As tabelas do UGC Studio não existem neste banco. É preciso aplicar a migração '
  + '20260821090000_ugc_studio.sql no Supabase.';

function ehTabelaAusente(error: { code?: string | null; message?: string | null }): boolean {
  return error?.code === 'PGRST205'
    || error?.code === '42P01'
    || /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

function lancar(error: any): never {
  if (ehTabelaAusente(error)) throw new Error(MIGRACAO_AUSENTE);
  throw error;
}

function mapProject(row: any): UgcProject {
  return {
    id: row.id,
    clientId: row.client_id ?? null,
    title: row.title,
    avatarAssetId: row.avatar_asset_id ?? null,
    tier: (row.tier as UgcTier) ?? 'standard',
    productImageUrl: row.product_image_url ?? null,
    script: (row.script_json as UgcScript | null) ?? null,
    status: row.status ?? 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClip(row: any): UgcClip {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind as UgcClipKind,
    segment: (row.segment as UgcSegment | null) ?? null,
    anglePreset: row.angle_preset ?? null,
    speech: row.speech ?? null,
    durationSeconds: Number(row.duration_seconds ?? 8),
    resolution: (row.resolution as UgcResolution) ?? '1080p',
    audio: row.audio ?? true,
    status: (row.status as UgcClipStatus) ?? 'queued',
    url: row.url ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    errorMessage: row.error_message ?? null,
    prompt: row.prompt ?? null,
    model: row.model ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUgcProjects(clientId?: string | null): Promise<UgcProject[]> {
  let q = db.from('ugc_projects').select('*').order('updated_at', { ascending: false }).limit(60);
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) lancar(error);
  return (data ?? []).map(mapProject);
}

export async function getUgcProject(id: string): Promise<UgcProject> {
  const { data, error } = await db.from('ugc_projects').select('*').eq('id', id).single();
  if (error) lancar(error);
  return mapProject(data);
}

export async function createUgcProject(input: {
  title: string;
  clientId?: string | null;
  tier?: UgcTier;
}): Promise<UgcProject> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db
    .from('ugc_projects')
    .insert({
      title: input.title,
      client_id: input.clientId ?? null,
      tier: input.tier ?? 'standard',
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) lancar(error);
  return mapProject(data);
}

export async function updateUgcProject(
  id: string,
  patch: Partial<Pick<UgcProject, 'title' | 'avatarAssetId' | 'tier' | 'productImageUrl' | 'script' | 'status'>>,
): Promise<UgcProject> {
  const linha: Record<string, unknown> = {};
  if (patch.title !== undefined) linha.title = patch.title;
  if (patch.avatarAssetId !== undefined) linha.avatar_asset_id = patch.avatarAssetId;
  if (patch.tier !== undefined) linha.tier = patch.tier;
  if (patch.productImageUrl !== undefined) linha.product_image_url = patch.productImageUrl;
  if (patch.script !== undefined) linha.script_json = patch.script;
  if (patch.status !== undefined) linha.status = patch.status;

  const { data, error } = await db.from('ugc_projects').update(linha).eq('id', id).select('*').single();
  if (error) lancar(error);
  return mapProject(data);
}

export async function deleteUgcProject(id: string): Promise<void> {
  const { error } = await db.from('ugc_projects').delete().eq('id', id);
  if (error) lancar(error);
}

export async function listUgcClips(projectId: string): Promise<UgcClip[]> {
  const { data, error } = await db
    .from('ugc_clips')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) lancar(error);
  return (data ?? []).map(mapClip);
}

export interface CreateUgcClipInput {
  projectId: string;
  kind: UgcClipKind;
  segment?: UgcSegment | null;
  anglePreset?: string | null;
  speech?: string | null;
  durationSeconds: number;
  resolution: UgcResolution;
  audio?: boolean;
  status?: UgcClipStatus;
  prompt?: string | null;
  model?: string | null;
  metadata?: Record<string, any>;
}

export async function createUgcClip(input: CreateUgcClipInput): Promise<UgcClip> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db
    .from('ugc_clips')
    .insert({
      project_id: input.projectId,
      kind: input.kind,
      // O CHECK da tabela exige segmento em avatar e ângulo em B-roll, e
      // proíbe a mistura. Normalizar aqui evita que um estado meio-preenchido
      // da interface vire erro de constraint na cara do usuário.
      segment: input.kind === 'avatar' ? (input.segment ?? null) : null,
      angle_preset: input.kind === 'broll' ? (input.anglePreset ?? null) : null,
      speech: input.speech ?? null,
      duration_seconds: input.durationSeconds,
      resolution: input.resolution,
      audio: input.audio ?? true,
      status: input.status ?? 'generating',
      prompt: input.prompt ?? null,
      model: input.model ?? null,
      metadata: input.metadata ?? {},
      created_by: userData.user?.id ?? null,
    })
    .select('*')
    .single();
  if (error) lancar(error);
  return mapClip(data);
}

export async function updateUgcClip(
  id: string,
  patch: Partial<Pick<UgcClip, 'status' | 'url' | 'thumbnailUrl' | 'errorMessage' | 'model' | 'metadata'>>,
): Promise<UgcClip> {
  const linha: Record<string, unknown> = {};
  if (patch.status !== undefined) linha.status = patch.status;
  if (patch.url !== undefined) linha.url = patch.url;
  if (patch.thumbnailUrl !== undefined) linha.thumbnail_url = patch.thumbnailUrl;
  if (patch.errorMessage !== undefined) linha.error_message = patch.errorMessage;
  if (patch.model !== undefined) linha.model = patch.model;
  if (patch.metadata !== undefined) linha.metadata = patch.metadata;

  const { data, error } = await db.from('ugc_clips').update(linha).eq('id', id).select('*').single();
  if (error) lancar(error);
  return mapClip(data);
}

export async function deleteUgcClip(id: string): Promise<void> {
  const { error } = await db.from('ugc_clips').delete().eq('id', id);
  if (error) lancar(error);
}
