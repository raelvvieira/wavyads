import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listProjectAssetGroups, listProjectArtworks, recoverStaleAssets } from '../api/creativeAssets';
import { useCreativeAssetsRealtime } from './useCreativeAssetsRealtime';
import { buildArtworkSections } from '../lib/artworkSections';
import type { CreativeArtworkSections, CreativeAsset, CreativeAssetGroup } from '../types/creative';

export const creativeAssetsQueryKey = (projectId: string | undefined) =>
  ['creative-assets', projectId] as const;

export const creativeAssetGroupsQueryKey = (projectId: string | undefined) =>
  ['creative-asset-groups', projectId] as const;

const EMPTY_ASSETS: CreativeAsset[] = [];
const EMPTY_GROUPS: CreativeAssetGroup[] = [];

export interface UseCreativeAssetsResult {
  assets: CreativeAsset[];
  groups: CreativeAssetGroup[];
  /** Seções já montadas a partir da linhagem — o que o Canvas desenha. */
  sections: CreativeArtworkSections;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Fonte única das artes de um projeto. O Canvas da Etapa 6 consome isto em vez
 * das listas paralelas que hoje vivem no state da página.
 */
export function useCreativeAssets(projectId: string | undefined): UseCreativeAssetsResult {
  // Assina as mudanças do projeto: gerações que terminam (aqui ou em outra
  // aba) chegam sozinhas ao Canvas.
  useCreativeAssetsRealtime(projectId);
  useRecoverStaleAssets(projectId);

  const assetsQuery = useQuery({
    queryKey: creativeAssetsQueryKey(projectId),
    queryFn: () => listProjectArtworks(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  const groupsQuery = useQuery({
    queryKey: creativeAssetGroupsQueryKey(projectId),
    queryFn: () => listProjectAssetGroups(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  const assets = assetsQuery.data ?? EMPTY_ASSETS;
  const groups = groupsQuery.data ?? EMPTY_GROUPS;

  const sections = useMemo(() => buildArtworkSections(assets, groups), [assets, groups]);

  return {
    assets,
    groups,
    sections,
    isLoading: assetsQuery.isLoading || groupsQuery.isLoading,
    error: assetsQuery.error ?? groupsQuery.error,
    refetch: () => {
      assetsQuery.refetch();
      groupsQuery.refetch();
    },
  };
}

/**
 * Ao abrir um projeto, fecha as gerações que ficaram órfãs — a aba anterior
 * pode ter sido fechada no meio, deixando cards "Gerando..." que nunca
 * virariam nada. Uma vez por projeto por montagem: é higiene de abertura,
 * não algo para repetir a cada refetch.
 */
function useRecoverStaleAssets(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const recoveredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || recoveredFor.current === projectId) return;
    recoveredFor.current = projectId;
    recoverStaleAssets(projectId)
      .then((count) => {
        if (count > 0) {
          queryClient.invalidateQueries({ queryKey: creativeAssetsQueryKey(projectId) });
        }
      })
      // Falhar aqui não pode impedir o projeto de abrir: no pior caso os cards
      // órfãos continuam visíveis até a próxima tentativa.
      .catch(() => undefined);
  }, [projectId, queryClient]);
}

/** Invalida as artes de um projeto depois de gerar/editar/aplicar Fator. */
export function useInvalidateCreativeAssets() {
  const queryClient = useQueryClient();
  return (projectId: string | undefined) => {
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: creativeAssetsQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: creativeAssetGroupsQueryKey(projectId) });
  };
}
