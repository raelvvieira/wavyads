import { useMemo } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { CreativeCard } from './CreativeCard';
import { buildAssetLabels, labelFor } from '../lib/assetLabels';
import type { GalleryAsset } from '../api/creativeAssets';
import type { CreativeAsset } from '../types/creative';

interface GalleryViewProps {
  assets: GalleryAsset[];
  isLoading: boolean;
  selectedAssetIds: string[];
  onSelect: (asset: CreativeAsset, options?: { toggle?: boolean }) => void;
  onOpenFocus: (asset: CreativeAsset) => void;
  onDownload: (asset: CreativeAsset) => void;
  onOpenProject: (projectId: string) => void;
}

/**
 * Visão de galeria: todas as artes, agrupadas por projeto.
 *
 * Aqui não faz sentido desenhar as seções de linhagem (Originais / Fator /
 * Editadas) — elas descrevem a árvore DENTRO de um projeto, e misturar
 * projetos diferentes numa mesma seção esconderia justamente o contexto que
 * importa nesta tela: de qual campanha cada arte veio.
 */
export function GalleryView({
  assets,
  isLoading,
  selectedAssetIds,
  onSelect,
  onOpenFocus,
  onDownload,
  onOpenProject,
}: GalleryViewProps) {
  const selected = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);
  const labels = useMemo(() => buildAssetLabels(assets), [assets]);

  const groups = useMemo(() => {
    const byProject = new Map<string, { projectId: string | null; title: string; assets: GalleryAsset[] }>();
    for (const asset of assets) {
      const key = asset.projectId ?? '__sem-projeto';
      let group = byProject.get(key);
      if (!group) {
        group = {
          projectId: asset.projectId,
          title: asset.projectTitle || 'Sem projeto',
          assets: [],
        };
        byProject.set(key, group);
      }
      group.assets.push(asset);
    }
    return Array.from(byProject.values());
  }, [assets]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--studio-text-tertiary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando artes...
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--studio-surface-2)]">
          <ImageOff className="h-5 w-5 text-[var(--studio-text-tertiary)]" />
        </div>
        <div>
          <p className="text-sm text-[var(--studio-text)]">Nenhuma arte encontrada</p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--studio-text-tertiary)]">
            Descreva uma arte no campo abaixo para criar a primeira, ou troque o filtro de cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      {groups.map((group) => (
        <section key={group.projectId ?? 'sem-projeto'} className="space-y-3">
          <div className="flex items-baseline gap-2">
            {group.projectId ? (
              <button
                type="button"
                onClick={() => onOpenProject(group.projectId!)}
                className="truncate text-[13px] font-medium text-[var(--studio-text)] transition-colors hover:text-[var(--studio-accent)]"
                title="Abrir este projeto"
              >
                {group.title}
              </button>
            ) : (
              <span className="text-[13px] font-medium text-[var(--studio-text-secondary)]">{group.title}</span>
            )}
            <span className="text-[12px] text-[var(--studio-text-tertiary)]">{group.assets.length}</span>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr))]">
            {group.assets.map((asset) => (
              <CreativeCard
                key={asset.id}
                asset={asset}
                label={labelFor(labels, asset)}
                selected={selected.has(asset.id)}
                onSelect={onSelect}
                onOpenFocus={onOpenFocus}
                onDownload={onDownload}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
