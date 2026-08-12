import { useMemo } from 'react';
import { ImageOff, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreativeCard } from './CreativeCard';
import { labelFor } from '../lib/assetLabels';
import type { CreativeArtworkSections, CreativeAsset } from '../types/creative';

function CreativeSection({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint?: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
          {title}
        </h3>
        <span className="text-[12px] text-[var(--studio-text-tertiary)]">{count}</span>
        {hint && <span className="truncate text-[12px] text-[var(--studio-text-tertiary)]">· {hint}</span>}
      </div>
      {children}
    </section>
  );
}

// Grid adaptativo: a arte nunca fica gigante numa tela larga nem espremida
// num notebook — entre ~190px e ~250px por card.
function CreativeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr))]">
      {children}
    </div>
  );
}

interface WorkspaceCanvasProps {
  sections: CreativeArtworkSections;
  assetsById: Map<string, CreativeAsset>;
  labels: Map<string, string>;
  isLoading: boolean;
  selectedAssetIds: string[];
  onSelect: (asset: CreativeAsset, options?: { toggle?: boolean }) => void;
  onOpenFocus: (asset: CreativeAsset) => void;
  onDownload: (asset: CreativeAsset) => void;
}

export function WorkspaceCanvas({
  sections,
  assetsById,
  labels,
  isLoading,
  selectedAssetIds,
  onSelect,
  onOpenFocus,
  onDownload,
}: WorkspaceCanvasProps) {
  const selected = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);

  const renderCard = (asset: CreativeAsset) => (
    <CreativeCard
      key={asset.id}
      asset={asset}
      label={labelFor(labels, asset)}
      selected={selected.has(asset.id)}
      onSelect={onSelect}
      onOpenFocus={onOpenFocus}
      onDownload={onDownload}
    />
  );

  const total =
    sections.originals.length +
    sections.edited.length +
    sections.resizes.length +
    sections.factorGroups.reduce((sum, group) => sum + group.assets.length, 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--studio-text-tertiary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando artes...
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--studio-surface-2)]">
          <ImageOff className="h-5 w-5 text-[var(--studio-text-tertiary)]" />
        </div>
        <div>
          <p className="text-sm text-[var(--studio-text)]">Nenhuma arte neste projeto ainda</p>
          <p className="mt-1 max-w-sm text-xs text-[var(--studio-text-tertiary)]">
            As artes geradas aparecem aqui agrupadas por origem: originais, variações do Fator
            Criativo, versões editadas e redimensionadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-9">
      <CreativeSection title="Originais" count={sections.originals.length}>
        <CreativeGrid>{sections.originals.map(renderCard)}</CreativeGrid>
      </CreativeSection>

      {/* Cada lote de Fator Criativo vira sua própria seção, nomeando a arte de
          origem — é isso que a linhagem no banco tornou possível. */}
      {sections.factorGroups.map((group, index) => {
        const parent = group.parentAssetId ? assetsById.get(group.parentAssetId) : undefined;
        return (
          <CreativeSection
            key={group.group?.id ?? group.parentAssetId ?? `factor-${index}`}
            title={group.group?.title || 'Fator Criativo'}
            hint={parent ? `baseado em ${labelFor(labels, parent)}` : undefined}
            count={group.assets.length}
          >
            <CreativeGrid>{group.assets.map(renderCard)}</CreativeGrid>
          </CreativeSection>
        );
      })}

      <CreativeSection title="Versões editadas" count={sections.edited.length}>
        <CreativeGrid>{sections.edited.map(renderCard)}</CreativeGrid>
      </CreativeSection>

      <CreativeSection title="Redimensionadas" count={sections.resizes.length}>
        <CreativeGrid>{sections.resizes.map(renderCard)}</CreativeGrid>
      </CreativeSection>
    </div>
  );
}

export function FocusView({
  asset,
  label,
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  asset: CreativeAsset;
  label: string;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {asset.url ? (
          <img src={asset.url} alt={label} className="max-h-full max-w-full rounded-xl object-contain" />
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--studio-text-tertiary)]">
            <Layers className="h-4 w-4" /> Esta arte ainda não tem imagem
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--studio-text-secondary)]">
        <button type="button" onClick={onPrev} disabled={total < 2} className={cn('rounded-full px-3 py-1.5 hover:bg-white/5', total < 2 && 'opacity-30')}>
          ← Anterior
        </button>
        <span className="tabular-nums text-[var(--studio-text-tertiary)]">{index + 1} / {total}</span>
        <button type="button" onClick={onNext} disabled={total < 2} className={cn('rounded-full px-3 py-1.5 hover:bg-white/5', total < 2 && 'opacity-30')}>
          Próxima →
        </button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 hover:bg-white/5">
          Voltar ao quadro
        </button>
      </div>
    </div>
  );
}
