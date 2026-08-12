import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  analyzeReferences,
  deleteReference,
  getEffectiveDesignSystem,
  listClientReferences,
  listProjectReferences,
  saveClientEditorial,
  saveProjectDesignSystem,
  uploadReferenceImages,
  type EffectiveDesignSystem,
} from '../api/creativeReferences';
import type { CreativeAsset } from '../types/creative';

export const projectReferencesKey = (projectId: string | undefined) =>
  ['creative-references', projectId] as const;
export const clientReferencesKey = (clientId: string | null | undefined) =>
  ['creative-client-references', clientId] as const;
export const designSystemKey = (projectId: string | undefined) =>
  ['creative-design-system', projectId] as const;

const EMPTY: CreativeAsset[] = [];

export function useCreativeReferences(projectId: string | undefined, clientId: string | null | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'upload' | 'analyze' | null>(null);

  const projectRefs = useQuery({
    queryKey: projectReferencesKey(projectId),
    queryFn: () => listProjectReferences(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });

  const clientRefs = useQuery({
    queryKey: clientReferencesKey(clientId),
    queryFn: () => listClientReferences(clientId!, projectId),
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });

  const designSystem = useQuery<EffectiveDesignSystem>({
    queryKey: designSystemKey(projectId),
    queryFn: () => getEffectiveDesignSystem({ projectId: projectId!, clientId }),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: projectReferencesKey(projectId) });
    queryClient.invalidateQueries({ queryKey: clientReferencesKey(clientId) });
    queryClient.invalidateQueries({ queryKey: designSystemKey(projectId) });
  }, [queryClient, projectId, clientId]);

  const upload = useCallback(async (dataUrls: string[]) => {
    if (!projectId || dataUrls.length === 0) return;
    setBusy('upload');
    try {
      await uploadReferenceImages({ projectId, clientId, dataUrls });
      refresh();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar referências', description: e?.message || 'Erro', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }, [projectId, clientId, refresh, toast]);

  const remove = useCallback(async (assetId: string) => {
    try {
      await deleteReference(assetId);
      refresh();
    } catch (e: any) {
      toast({ title: 'Erro ao remover referência', description: e?.message || 'Erro', variant: 'destructive' });
    }
  }, [refresh, toast]);

  /**
   * Analisa as referências do projeto e guarda a direção visual NO PROJETO.
   * Salvar também como identidade do cliente é opcional e explícito — uma
   * campanha pontual não deveria redefinir a identidade da marca inteira.
   */
  const analyze = useCallback(async ({ alsoSaveToClient }: { alsoSaveToClient?: boolean } = {}) => {
    if (!projectId) return;
    const urls = (projectRefs.data ?? []).map((asset) => asset.url).filter(Boolean) as string[];
    if (urls.length === 0) {
      toast({ title: 'Adicione ao menos uma referência', variant: 'destructive' });
      return;
    }
    setBusy('analyze');
    try {
      const analysis = await analyzeReferences(urls);
      await saveProjectDesignSystem({ projectId, designSystemDoc: analysis.designSystemDoc, analysis });
      if (alsoSaveToClient && clientId) {
        await saveClientEditorial({ clientId, designSystemDoc: analysis.designSystemDoc, analysis });
      }
      refresh();
      toast({
        title: 'Direção visual extraída',
        description: alsoSaveToClient && clientId
          ? 'Guardada no projeto e como identidade do cliente.'
          : 'Guardada no projeto e já aplicada nas próximas artes.',
      });
    } catch (e: any) {
      toast({ title: 'Erro ao analisar referências', description: e?.message || 'Erro', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }, [projectId, clientId, projectRefs.data, refresh, toast]);

  const saveManualDoc = useCallback(async (doc: string) => {
    if (!projectId) return;
    try {
      await saveProjectDesignSystem({ projectId, designSystemDoc: doc, analysis: designSystem.data?.analysis ?? null });
      refresh();
      toast({ title: 'Direção visual salva' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Erro', variant: 'destructive' });
    }
  }, [projectId, designSystem.data, refresh, toast]);

  return {
    projectReferences: projectRefs.data ?? EMPTY,
    clientReferences: clientRefs.data ?? EMPTY,
    designSystem: designSystem.data ?? { designSystemDoc: '', analysis: null, source: 'none' as const },
    isLoading: projectRefs.isLoading,
    busy,
    upload,
    remove,
    analyze,
    saveManualDoc,
    refresh,
  };
}
