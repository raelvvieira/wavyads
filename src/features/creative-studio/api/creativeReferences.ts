import { supabase } from '@/integrations/supabase/client';
import { recordAiUsage } from '@/lib/aiUsageTracker';
import { createCreativeAsset, mapAssetRow } from './creativeAssets';
import { buildAssetFileName, extractFunctionErrorMessage, uploadDataUrlToAssetStorage } from './storage';
import type { CreativeAsset } from '../types/creative';

/** Formato devolvido por criativo-analyze-refs. */
export interface VisualAnalysis {
  composicao: { formato: string; estrutura: string; hierarquia: string; silencio: string };
  fotografia: { tipo: string; luz: string; tratamento: string; integracao: string };
  paleta: { dominante: string; secundaria: string; acento: string; saturacao: string; hexes: string[] };
  tipografia: { familiaA: string; familiaB: string; contraste: string; alinhamento: string };
  camadas: string[];
  hierarquiaVisual: string;
  espaco: string;
  mood: { adjetivos: string[]; referencias: string[]; evita: string[] };
  designSystemDoc: string;
  antiPadroes?: string[];
}

/**
 * Direção visual efetiva de um projeto. O projeto tem prioridade; sem ele, cai
 * para a identidade do cliente (client_editorials), que já existia no banco e
 * é justamente o lugar certo para algo reutilizável entre campanhas.
 */
export interface EffectiveDesignSystem {
  designSystemDoc: string;
  analysis: VisualAnalysis | null;
  source: 'project' | 'client' | 'none';
}

export async function uploadReferenceImages({
  projectId,
  clientId,
  dataUrls,
}: {
  projectId: string;
  clientId?: string | null;
  dataUrls: string[];
}): Promise<CreativeAsset[]> {
  const created: CreativeAsset[] = [];
  for (const [index, dataUrl] of dataUrls.entries()) {
    const { url } = await uploadDataUrlToAssetStorage({
      dataUrl,
      path: `${projectId}/references/${buildAssetFileName(`referencia-${index + 1}`)}`,
    });
    created.push(await createCreativeAsset({
      projectId,
      clientId: clientId ?? null,
      type: 'reference',
      url,
      metadata: { source: 'workspace-v2' },
    }));
  }
  return created;
}

export async function listProjectReferences(projectId: string): Promise<CreativeAsset[]> {
  const { data, error } = await supabase
    .from('creative_assets')
    .select('*')
    .eq('project_id', projectId)
    .eq('type', 'reference')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAssetRow);
}

/** Referências já salvas para o cliente, de qualquer projeto — base reutilizável. */
export async function listClientReferences(clientId: string, excludeProjectId?: string): Promise<CreativeAsset[]> {
  let query = supabase
    .from('creative_assets')
    .select('*')
    .eq('client_id', clientId)
    .eq('type', 'reference')
    .order('created_at', { ascending: false })
    .limit(40);
  if (excludeProjectId) query = query.neq('project_id', excludeProjectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapAssetRow);
}

export async function deleteReference(assetId: string): Promise<void> {
  const { error } = await supabase.from('creative_assets').delete().eq('id', assetId);
  if (error) throw error;
}

export async function analyzeReferences(imageUrls: string[]): Promise<VisualAnalysis> {
  if (imageUrls.length === 0) throw new Error('Adicione ao menos uma referência');
  const { data, error } = await supabase.functions.invoke('criativo-analyze-refs', {
    body: { images: imageUrls },
    timeout: 90_000,
  });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);
  recordAiUsage('text-flash');
  return data as VisualAnalysis;
}

export async function saveProjectDesignSystem({
  projectId,
  designSystemDoc,
  analysis,
}: {
  projectId: string;
  designSystemDoc: string;
  analysis: VisualAnalysis | null;
}): Promise<void> {
  const { error } = await supabase
    .from('creative_projects')
    .update({
      design_system_doc: designSystemDoc,
      visual_analysis: (analysis ?? null) as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
  if (error) throw error;
}

export async function saveClientEditorial({
  clientId,
  designSystemDoc,
  analysis,
}: {
  clientId: string;
  designSystemDoc: string;
  analysis: VisualAnalysis | null;
}): Promise<void> {
  const { error } = await supabase
    .from('client_editorials')
    .upsert(
      {
        client_id: clientId,
        design_system_doc: designSystemDoc,
        visual_analysis: (analysis ?? {}) as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' },
    );
  if (error) throw error;
}

export async function getEffectiveDesignSystem({
  projectId,
  clientId,
}: {
  projectId: string;
  clientId?: string | null;
}): Promise<EffectiveDesignSystem> {
  const { data: project } = await supabase
    .from('creative_projects')
    .select('design_system_doc,visual_analysis')
    .eq('id', projectId)
    .maybeSingle();

  if (project?.design_system_doc) {
    return {
      designSystemDoc: project.design_system_doc,
      analysis: (project.visual_analysis as unknown as VisualAnalysis) ?? null,
      source: 'project',
    };
  }

  if (clientId) {
    const { data: editorial } = await supabase
      .from('client_editorials')
      .select('design_system_doc,visual_analysis')
      .eq('client_id', clientId)
      .maybeSingle();
    if (editorial?.design_system_doc) {
      return {
        designSystemDoc: editorial.design_system_doc,
        analysis: (editorial.visual_analysis as unknown as VisualAnalysis) ?? null,
        source: 'client',
      };
    }
  }

  return { designSystemDoc: '', analysis: null, source: 'none' };
}
