import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { applyCreativeFactor, editAsset, resizeAssetToSquare } from '../api/creativeGeneration';
import { updateCreativeAsset } from '../api/creativeAssets';
import { useInvalidateCreativeAssets } from './useCreativeAssets';
import type { CreativeAsset } from '../types/creative';

export type CreativeActionKind = 'edit' | 'resize' | 'factor' | 'intelligence';

export interface UseCreativeActionsResult {
  runningAction: CreativeActionKind | null;
  isRunning: boolean;
  edit: (asset: CreativeAsset, feedback: string) => Promise<boolean>;
  resize: (asset: CreativeAsset) => Promise<boolean>;
  factor: (asset: CreativeAsset) => Promise<boolean>;
  saveToClientIntelligence: (asset: CreativeAsset) => Promise<boolean>;
}

export function useCreativeActions(projectId: string | undefined): UseCreativeActionsResult {
  const { toast } = useToast();
  const invalidate = useInvalidateCreativeAssets();
  const [runningAction, setRunningAction] = useState<CreativeActionKind | null>(null);

  const refresh = useCallback(() => invalidate(projectId), [invalidate, projectId]);

  // Toda ação segue a mesma forma: marca o que está rodando, atualiza o Canvas
  // assim que o card 'generating' existe, e revalida no fim — dando certo ou
  // não, porque um card 'failed' também precisa aparecer.
  const run = useCallback(async (
    kind: CreativeActionKind,
    label: string,
    fn: () => Promise<void>,
  ): Promise<boolean> => {
    setRunningAction(kind);
    try {
      await fn();
      return true;
    } catch (e: any) {
      toast({ title: `Erro ao ${label}`, description: e?.message || 'Erro', variant: 'destructive' });
      return false;
    } finally {
      refresh();
      setRunningAction(null);
    }
  }, [refresh, toast]);

  const edit = useCallback((asset: CreativeAsset, feedback: string) => run('edit', 'editar', async () => {
    await editAsset({ asset, feedback, onPlaceholder: refresh });
    toast({ title: 'Edição aplicada', description: 'A arte original foi mantida — a versão nova entrou como filha dela.' });
  }), [run, refresh, toast]);

  const resize = useCallback((asset: CreativeAsset) => run('resize', 'gerar 1080', async () => {
    await resizeAssetToSquare({ asset, onPlaceholder: refresh });
    toast({ title: 'Versão 1080x1080 gerada' });
  }), [run, refresh, toast]);

  const factor = useCallback((asset: CreativeAsset) => run('factor', 'aplicar o Fator Criativo', async () => {
    const result = await applyCreativeFactor({ asset, onPlaceholder: refresh });
    if (result.failures.length > 0) {
      toast({
        title: `${result.assets.length} de ${result.assets.length + result.failures.length} variações prontas`,
        description: `Falharam: ${result.failures.map((f) => f.eixo).join(', ')}. Elas ficam no quadro marcadas como erro.`,
      });
    } else {
      toast({ title: `${result.assets.length} variações prontas` });
    }
  }), [run, refresh, toast]);

  const saveToClientIntelligence = useCallback((asset: CreativeAsset) => run('intelligence', 'salvar na inteligência', async () => {
    if (!asset.clientId) throw new Error('Esta arte não está associada a um cliente');
    await updateCreativeAsset(asset.id, { isClientIntelligence: true });
    toast({ title: 'Arte salva na inteligência do cliente' });
  }), [run, toast]);

  return {
    runningAction,
    isRunning: runningAction !== null,
    edit,
    resize,
    factor,
    saveToClientIntelligence,
  };
}
