import { supabase } from '@/integrations/supabase/client';

export interface CreativeProjectSummary {
  id: string;
  title: string;
  status: string;
  clientId: string | null;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  resolution: string | null;
  updatedAt: string;
}

export interface CreativeProjectDetail extends CreativeProjectSummary {
  initialPrompt: string | null;
  language: string | null;
  model: string | null;
}

export async function listCreativeProjects(limit = 40): Promise<CreativeProjectSummary[]> {
  const { data, error } = await supabase
    .from('creative_projects')
    .select('id,title,status,client_id,thumbnail_url,selected_aspect_ratio,selected_resolution,updated_at')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    clientId: row.client_id,
    thumbnailUrl: row.thumbnail_url,
    aspectRatio: row.selected_aspect_ratio,
    resolution: row.selected_resolution,
    updatedAt: row.updated_at,
  }));
}

export async function getCreativeProject(projectId: string): Promise<CreativeProjectDetail | null> {
  const { data, error } = await supabase
    .from('creative_projects')
    .select('id,title,status,client_id,thumbnail_url,selected_aspect_ratio,selected_resolution,updated_at,initial_prompt,language,model')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    clientId: data.client_id,
    thumbnailUrl: data.thumbnail_url,
    aspectRatio: data.selected_aspect_ratio,
    resolution: data.selected_resolution,
    updatedAt: data.updated_at,
    initialPrompt: data.initial_prompt,
    language: data.language,
    model: data.model,
  };
}

export async function createCreativeProject({
  title,
  clientId,
  aspectRatio,
  resolution,
  language = 'pt-BR',
  model,
  initialPrompt,
}: {
  title: string;
  clientId?: string | null;
  aspectRatio: string;
  resolution: string;
  language?: string;
  model?: string | null;
  initialPrompt?: string | null;
}): Promise<CreativeProjectSummary> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from('creative_projects')
    .insert({
      title: title.trim().slice(0, 60) || 'Novo criativo',
      client_id: clientId ?? null,
      selected_aspect_ratio: aspectRatio,
      selected_resolution: resolution,
      language,
      model: model ?? null,
      initial_prompt: initialPrompt ?? null,
      status: 'in_progress',
      user_id: userId,
      created_by: userId,
    })
    .select('id,title,status,client_id,thumbnail_url,selected_aspect_ratio,selected_resolution,updated_at')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    clientId: data.client_id,
    thumbnailUrl: data.thumbnail_url,
    aspectRatio: data.selected_aspect_ratio,
    resolution: data.selected_resolution,
    updatedAt: data.updated_at,
  };
}

/**
 * Marca o projeto como gerado e guarda a capa. Sem isso a lista lateral fica
 * sem thumbnail e o projeto continua eternamente "em andamento".
 */
export async function touchProjectAfterGeneration({
  projectId,
  thumbnailUrl,
}: {
  projectId: string;
  thumbnailUrl?: string | null;
}): Promise<void> {
  const patch: Record<string, any> = { status: 'generated', updated_at: new Date().toISOString() };
  // data: URI é base64 gigante e a lista do histórico lê thumbnail em massa.
  if (thumbnailUrl && !thumbnailUrl.startsWith('data:')) patch.thumbnail_url = thumbnailUrl;
  await supabase.from('creative_projects').update(patch).eq('id', projectId);
}

export interface ClientOption {
  id: string;
  name: string;
}

export async function listClients(): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name ?? 'Cliente' }));
}
