import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mapAssetRow } from '../api/creativeAssets';
import { creativeAssetGroupsQueryKey, creativeAssetsQueryKey } from './useCreativeAssets';
import { isArtworkType, type CreativeAsset } from '../types/creative';

/**
 * Mantém o Canvas em dia sem refetch manual.
 *
 * O evento do Postgres já traz a linha inteira (REPLICA IDENTITY FULL), então
 * dá para aplicar a mudança direto no cache em vez de invalidar e refazer a
 * query — o card sai de "Gerando..." para a imagem sem piscar a lista toda.
 * Invalidar fica reservado para o que o payload não resolve.
 */
export function useCreativeAssetsRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();
  // Evita reinscrever o canal a cada render por causa da identidade do cliente.
  const clientRef = useRef(queryClient);
  clientRef.current = queryClient;

  useEffect(() => {
    if (!projectId) return;

    const assetsKey = creativeAssetsQueryKey(projectId);
    const groupsKey = creativeAssetGroupsQueryKey(projectId);

    const upsertAsset = (asset: CreativeAsset) => {
      // Insumos (referência, logo, produto) não pertencem ao Canvas.
      if (!isArtworkType(asset.type)) return;
      clientRef.current.setQueryData<CreativeAsset[]>(assetsKey, (current) => {
        if (!current) return current;
        const index = current.findIndex((item) => item.id === asset.id);
        if (index === -1) return [...current, asset];
        const next = [...current];
        next[index] = asset;
        return next;
      });
    };

    const channel = supabase
      .channel(`creative-assets:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creative_assets', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (!deletedId) return;
            clientRef.current.setQueryData<CreativeAsset[]>(assetsKey, (current) =>
              current?.filter((item) => item.id !== deletedId));
            return;
          }
          const row = payload.new as any;
          if (!row?.id) return;
          upsertAsset(mapAssetRow(row));
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creative_asset_groups', filter: `project_id=eq.${projectId}` },
        () => {
          // Grupos são poucos e mudam raramente — refazer a query é mais simples
          // e não custa nada perto de manter dois caches em sincronia à mão.
          clientRef.current.invalidateQueries({ queryKey: groupsKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);
}
