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
