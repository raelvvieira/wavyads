import { supabase } from '@/integrations/supabase/client';

/**
 * Acesso a banco dos projetos do Criativo Studio.
 *
 * Enquanto isto vivia dentro do componente, cada consulta carregava junto o
 * `toast` de erro e os setters de loading — o que impedia testar a regra sem
 * montar a página inteira. Aqui as funções só falam com o banco e lançam;
 * quem chama decide o que mostrar.
 *
 * As tabelas ainda não estão nos tipos gerados do Supabase, daí o cast. Isso
 * é dívida conhecida, não descuido: gerar os tipos é trabalho de outra etapa.
 */
const db = supabase as any;

export interface ProjectSummary {
  id: string;
  title: string | null;
  status: string | null;
  selected_aspect_ratio: string | null;
  selected_resolution: string | null;
  thumbnail_url: string | null;
  updated_at: string | null;
}

export interface NewProjectInput {
  title: string;
  initialPrompt: string;
  currentStage: string;
  aspectRatio: string;
  resolution: string;
  language: string;
  model: string;
  userId: string | null;
  clientId: string | null;
  /** Só a duplicação usa: a cópia herda a capa do original. */
  thumbnailUrl?: string | null;
}

/** Colunas do projeto. Uma só definição para criar e duplicar. */
function projectRow(input: NewProjectInput) {
  return {
    title: input.title,
    initial_prompt: input.initialPrompt,
    current_stage: input.currentStage,
    selected_aspect_ratio: input.aspectRatio,
    selected_resolution: input.resolution,
    language: input.language,
    model: input.model,
    status: 'in_progress',
    user_id: input.userId,
    created_by: input.userId,
    client_id: input.clientId,
    ...(input.thumbnailUrl ? { thumbnail_url: input.thumbnailUrl } : {}),
  };
}

export async function createProject(input: NewProjectInput): Promise<{ id: string; title: string | null }> {
  const { data, error } = await db
    .from('creative_projects')
    .insert(projectRow(input))
    .select('id,title')
    .single();
  if (error) throw error;
  return { id: data.id as string, title: data.title ?? null };
}

/** Lista para o histórico. Arquivados ficam de fora. */
export async function listRecentProjects(limit = 30): Promise<ProjectSummary[]> {
  const { data, error } = await db
    .from('creative_projects')
    .select('id,title,status,selected_aspect_ratio,selected_resolution,thumbnail_url,updated_at')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ProjectSummary[];
}

export async function loadProject(projectId: string): Promise<{ project: any; snapshot: any }> {
  const { data: project, error } = await db
    .from('creative_projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) throw error;

  const { data: stateRow, error: stateError } = await db
    .from('creative_project_state')
    .select('state_json')
    .eq('project_id', projectId)
    .single();
  // PGRST116 = nenhuma linha. Projeto sem snapshot ainda é um projeto válido:
  // foi criado e nunca chegou a salvar estado.
  if (stateError && stateError.code !== 'PGRST116') throw stateError;

  return { project, snapshot: stateRow?.state_json ?? null };
}

export async function saveProjectSnapshot(projectId: string, snapshot: unknown): Promise<void> {
  const { error } = await db
    .from('creative_project_state')
    .upsert(
      { project_id: projectId, state_json: snapshot, updated_at: new Date().toISOString() },
      { onConflict: 'project_id' },
    );
  if (error) throw error;
}

export interface ProjectMetaUpdate {
  title: string;
  initialPrompt: string;
  currentStage: string;
  aspectRatio: string;
  resolution: string;
  language: string;
  model: string;
  thumbnailUrl: string | null;
  hasArtwork: boolean;
  clientId: string | null;
}

/** Atualiza os metadados que a listagem do histórico lê. */
export async function updateProjectMeta(projectId: string, meta: ProjectMetaUpdate): Promise<void> {
  const { error } = await db
    .from('creative_projects')
    .update({
      title: meta.title,
      initial_prompt: meta.initialPrompt,
      current_stage: meta.currentStage,
      selected_aspect_ratio: meta.aspectRatio,
      selected_resolution: meta.resolution,
      language: meta.language,
      model: meta.model,
      thumbnail_url: meta.thumbnailUrl,
      // O status separa projeto começado de projeto que já rendeu arte — é o
      // que a listagem usa para diferenciar rascunho de entrega.
      status: meta.hasArtwork ? 'generated' : 'in_progress',
      client_id: meta.clientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  if (error) throw error;
}

/**
 * Grava só formato e resolução — não o projeto inteiro.
 *
 * `updateProjectMeta` exige TODOS os campos (título, prompt inicial,
 * cliente...); usá-lo aqui, só para gravar dois campos, arriscaria
 * sobrescrever algo com um valor errado ou desatualizado. Mesmo espírito de
 * `updateCreativeAsset` em `creativeAssets.ts`: um patch cirúrgico, não uma
 * substituição total.
 */
export async function updateProjectFormat(
  projectId: string,
  format: { aspectRatio: string; resolution: string },
): Promise<void> {
  const { error } = await db
    .from('creative_projects')
    .update({
      selected_aspect_ratio: format.aspectRatio,
      selected_resolution: format.resolution,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  if (error) throw error;
}

export async function archiveProject(projectId: string): Promise<void> {
  const { error } = await db.from('creative_projects').update({ status: 'archived' }).eq('id', projectId);
  if (error) throw error;
}

/**
 * Duplica projeto e snapshot.
 *
 * O snapshot é copiado só se existir — duplicar um projeto que nunca salvou
 * estado é legítimo e não deve falhar.
 */
export async function duplicateProject(projectId: string, userId: string | null): Promise<string> {
  const { project, snapshot } = await loadProject(projectId);

  const { id } = await createProject({
    title: `${project.title} cópia`,
    initialPrompt: project.initial_prompt,
    currentStage: project.current_stage,
    aspectRatio: project.selected_aspect_ratio,
    resolution: project.selected_resolution,
    language: project.language,
    model: project.model,
    userId,
    clientId: project.client_id,
    // A capa acompanha a cópia, no mesmo insert — sem isso a duplicata
    // nasceria sem thumbnail no histórico mesmo tendo a mesma arte.
    thumbnailUrl: project.thumbnail_url,
  });

  if (snapshot) {
    const { error } = await db
      .from('creative_project_state')
      .insert({ project_id: id, state_json: snapshot });
    if (error) throw error;
  }

  return id;
}

/**
 * Recupera IDs de asset pela URL.
 *
 * Serve aos projetos salvos antes de o snapshot guardar as âncoras de
 * linhagem: sem isto, restaurar um projeto antigo e editar continuaria
 * produzindo arte órfã.
 */
export async function findAssetIdsByUrl(
  projectId: string,
  urls: string[],
): Promise<Map<string, string>> {
  if (urls.length === 0) return new Map();
  const { data, error } = await db
    .from('creative_assets')
    .select('id,url')
    .eq('project_id', projectId)
    .in('url', urls);
  if (error || !data) return new Map();
  return new Map<string, string>(data.map((r: any) => [r.url, r.id]));
}
