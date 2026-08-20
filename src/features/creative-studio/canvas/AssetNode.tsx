import { AlertTriangle, Check, Download, Loader2, Maximize2, Pencil, RefreshCw, Repeat, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '../types/creative';
import { FACTOR_AXIS_LABELS } from '../types/creative';
import { angleLabelFrom } from '../types/factorCreative';
import type { SelectionAction } from '../state/canvasSelectors';

const TIPO_LABEL: Record<string, string> = {
  original: 'Original',
  factor: 'Fator',
  edited: 'Edição',
  resize: 'Resize',
  imported: 'Importada',
};

/** Proporção real da miniatura. Sem isto o 9:16 vira quadrado cortado. */
function aspectStyle(asset: CreativeAsset): React.CSSProperties {
  if (asset.width && asset.height) return { aspectRatio: `${asset.width} / ${asset.height}` };
  if (asset.aspectRatio?.includes(':')) return { aspectRatio: asset.aspectRatio.replace(':', ' / ') };
  return { aspectRatio: '1 / 1' };
}

const ACAO_ICONE: Partial<Record<SelectionAction, { icon: typeof Pencil; label: string }>> = {
  edit: { icon: Pencil, label: 'Editar com IA' },
  'use-as-reference': { icon: Repeat, label: 'Usar como referência' },
  factor: { icon: Sparkles, label: 'Fator Criativo' },
  resize: { icon: Maximize2, label: 'Redimensionar' },
  download: { icon: Download, label: 'Baixar' },
  retry: { icon: RefreshCw, label: 'Tentar novamente' },
  delete: { icon: Trash2, label: 'Apagar arte' },
};

interface AssetNodeProps {
  asset: CreativeAsset;
  selected: boolean;
  onToggleSelect: (asset: CreativeAsset, additive: boolean) => void;
  onAction: (action: SelectionAction, asset: CreativeAsset) => void;
  /** Ações que valem para ESTE asset sozinho, vindas de `availableActionsForSelection`. */
  actions: SelectionAction[];
}

/**
 * Card de uma arte no canvas.
 *
 * Os quatro status do domínio viram quatro coisas distintas na tela. O caso
 * que importa é `failed`: o card CONTINUA no lugar, com o erro legível e o
 * botão de retentar. Sumir com a arte que falhou é como o usuário perde a
 * referência do que pediu e repete o pedido do zero.
 */
export function AssetNode({ asset, selected, onToggleSelect, onAction, actions }: AssetNodeProps) {
  const pronto = asset.status === 'ready' && !!asset.url;
  const trabalhando = asset.status === 'queued' || asset.status === 'generating';
  const falhou = asset.status === 'failed';

  return (
    <figure
      data-selected={selected}
      data-status={asset.status}
      className="studio-asset-node group"
    >
      <button
        type="button"
        onClick={(e) => onToggleSelect(asset, e.metaKey || e.ctrlKey || e.shiftKey)}
        aria-pressed={selected}
        aria-label={`${TIPO_LABEL[asset.type] ?? asset.type} ${asset.aspectRatio ?? ''} — ${
          pronto ? 'pronta' : trabalhando ? 'gerando' : 'falhou'
        }`}
        className="studio-asset-surface"
        style={aspectStyle(asset)}
      >
        {pronto && (
          <img
            src={asset.thumbnailUrl ?? asset.url ?? ''}
            alt={asset.prompt?.slice(0, 120) ?? 'Arte gerada'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}

        {trabalhando && (
          <span className="shimmer flex h-full w-full flex-col items-center justify-center gap-2 text-white/55">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[11px]">
              {asset.status === 'queued' ? 'Na fila' : 'Gerando'}
            </span>
          </span>
        )}

        {falhou && (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-[11px] leading-snug text-white/62 line-clamp-3">
              {asset.errorMessage ?? 'A geração falhou.'}
            </span>
          </span>
        )}

        {selected && (
          <span className="studio-asset-check" aria-hidden>
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </button>

      {/* Ações rápidas aparecem no hover E no foco — só no hover elas não
          existem para quem navega por teclado. */}
      {actions.length > 0 && (
        <div className="studio-asset-actions">
          {actions
            .map((a) => [a, ACAO_ICONE[a]] as const)
            .filter((par): par is [SelectionAction, { icon: typeof Pencil; label: string }] => !!par[1])
            .map(([acao, { icon: Icon, label }]) => (
              <button
                key={acao}
                type="button"
                onClick={() => onAction(acao, asset)}
                aria-label={label}
                title={label}
                className={cn('studio-asset-action', acao === 'delete' && 'hover:text-destructive')}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
        </div>
      )}

      <figcaption className="studio-asset-caption">
        <span className="truncate text-[11px] font-medium text-white/78">
          {TIPO_LABEL[asset.type] ?? asset.type}
          {/* Ângulo V2 quando existe; eixo V1 nas artes do motor antigo
              (§20 da spec pede exatamente esse fallback na migração). */}
          {(() => {
            const rotulo = angleLabelFrom(asset.strategicAngle, asset.metadata)
              ?? (asset.factorAxis ? FACTOR_AXIS_LABELS[asset.factorAxis] : null);
            return rotulo ? ` · ${rotulo}` : null;
          })()}
        </span>
        {asset.aspectRatio && (
          <span className="metric-number shrink-0 text-[10px] text-white/45">{asset.aspectRatio}</span>
        )}
      </figcaption>
    </figure>
  );
}
