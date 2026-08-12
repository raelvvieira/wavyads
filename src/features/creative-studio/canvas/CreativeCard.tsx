import { AlertTriangle, Check, Download, Loader2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '../types/creative';

function aspectClass(aspectRatio: string | null): string {
  switch (aspectRatio) {
    case '1:1': return 'aspect-square';
    case '9:16': return 'aspect-[9/16]';
    case '16:9': return 'aspect-video';
    case '4:3': return 'aspect-[4/3]';
    case '3:4': return 'aspect-[3/4]';
    case '2:3': return 'aspect-[2/3]';
    case '3:2': return 'aspect-[3/2]';
    case '21:9': return 'aspect-[21/9]';
    default: return 'aspect-[4/5]';
  }
}

interface CreativeCardProps {
  asset: CreativeAsset;
  label: string;
  selected: boolean;
  onSelect: (asset: CreativeAsset, options?: { toggle?: boolean }) => void;
  onOpenFocus?: (asset: CreativeAsset) => void;
  onDownload?: (asset: CreativeAsset) => void;
}

export function CreativeCard({ asset, label, selected, onSelect, onOpenFocus, onDownload }: CreativeCardProps) {
  const pending = asset.status === 'queued' || asset.status === 'generating';
  const failed = asset.status === 'failed';

  return (
    <div className="group/card flex flex-col gap-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => onSelect(asset, { toggle: event.metaKey || event.ctrlKey })}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(asset);
          }
        }}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border bg-[var(--studio-surface-2)] transition-all duration-150 cursor-pointer',
          aspectClass(asset.aspectRatio),
          selected
            ? 'border-[var(--studio-accent)] ring-2 ring-[var(--studio-accent)]/35'
            : 'border-[var(--studio-border)] hover:border-[var(--studio-border-hover)]',
        )}
      >
        {asset.url && !pending && (
          <img src={asset.url} alt={label} loading="lazy" className="h-full w-full object-cover" />
        )}

        {pending && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--studio-surface-3)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--studio-accent)]" />
            <span className="text-[11px] text-[var(--studio-text-tertiary)]">Gerando...</span>
          </div>
        )}

        {failed && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-[11px] leading-snug text-destructive line-clamp-4">
              {asset.errorMessage || 'Falha na geração'}
            </span>
          </div>
        )}

        {selected && (
          <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--studio-accent)] shadow">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        {asset.isClientIntelligence && (
          <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur">
            Salva
          </span>
        )}

        {/* Ações rápidas: só o essencial no hover. O resto vive no Inspector,
            para o card não virar outra barra de ferramentas. */}
        {asset.url && !pending && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover/card:opacity-100">
            {onOpenFocus && (
              <button
                type="button"
                title="Ver em tela cheia"
                onClick={(event) => { event.stopPropagation(); onOpenFocus(asset); }}
                className="pointer-events-auto rounded-full bg-black/60 p-1.5 backdrop-blur transition-colors hover:bg-black/85"
              >
                <Maximize2 className="h-3.5 w-3.5 text-white" />
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                title="Baixar"
                onClick={(event) => { event.stopPropagation(); onDownload(asset); }}
                className="pointer-events-auto rounded-full bg-black/60 p-1.5 backdrop-blur transition-colors hover:bg-black/85"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="truncate text-[11px] text-[var(--studio-text-secondary)]">{label}</p>
        {asset.aspectRatio && (
          <span className="shrink-0 text-[10px] text-[var(--studio-text-tertiary)]">{asset.aspectRatio}</span>
        )}
      </div>
    </div>
  );
}
