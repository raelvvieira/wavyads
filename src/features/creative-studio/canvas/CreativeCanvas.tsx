import { useMemo } from 'react';
import { AlertCircle, ImageOff, Loader2, SearchX } from 'lucide-react';
import type { CreativeAsset } from '../types/creative';
import type { CanvasViewMode } from '../types/studioUi';
import { availableActionsForSelection, type SelectionAction } from '../state/canvasSelectors';
import { canvasSections } from '../state/canvasSections';
import { AssetNode } from './AssetNode';

interface CreativeCanvasProps {
  /** Já filtrado por `visibleCanvasAssets` — o canvas não decide o que é arte. */
  assets: CreativeAsset[];
  mode: CanvasViewMode;
  selectedIds: string[];
  onToggleSelect: (asset: CreativeAsset, additive: boolean) => void;
  onAction: (action: SelectionAction, asset: CreativeAsset) => void;
  loading?: boolean;
  error?: string | null;
  /** Verdadeiro quando o vazio veio de filtro, não de projeto novo. */
  filtered?: boolean;
  onClearFilters?: () => void;
}

/**
 * Creative Canvas.
 *
 * Grid agrupa por LOTE de geração, não por data solta: as cinco do Fator
 * nasceram juntas e lidas separadas não contam a mesma história. Linhagem
 * agrupa por origem, com a raiz primeiro e o recuo mostrando a distância até
 * ela.
 *
 * Os dois modos consomem os mesmos seletores puros já testados — o canvas
 * desenha, não deriva.
 */
export function CreativeCanvas({
  assets,
  mode,
  selectedIds,
  onToggleSelect,
  onAction,
  loading,
  error,
  filtered,
  onClearFilters,
}: CreativeCanvasProps) {
  const selecionados = useMemo(() => new Set(selectedIds), [selectedIds]);

  const secoes = useMemo(() => canvasSections(assets, mode), [assets, mode]);

  if (loading) return <CanvasState icon={Loader2} spin title="Carregando o projeto" />;

  if (error) {
    return (
      <CanvasState
        icon={AlertCircle}
        title="Não deu para carregar as artes"
        description={error}
      />
    );
  }

  if (assets.length === 0) {
    return filtered ? (
      <CanvasState
        icon={SearchX}
        title="Nenhuma arte com esses filtros"
        description="O acervo do projeto continua aqui — só a seleção atual não encontrou nada."
        action={onClearFilters ? { label: 'Limpar filtros', onClick: onClearFilters } : undefined}
      />
    ) : (
      <CanvasState
        icon={ImageOff}
        title="O canvas está vazio"
        description="Descreva o criativo no comando abaixo para gerar a primeira arte deste projeto."
      />
    );
  }

  return (
    <div className="studio-canvas-scroll" role="region" aria-label="Artes do projeto">
      {secoes.map((secao) => (
        <section key={secao.key} className="studio-canvas-group">
          <header className="studio-canvas-group-header">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="wavy-caps shrink-0 text-[10px] font-semibold uppercase text-white/50">
                {secao.title}
              </h2>
              {/* Caixa normal e truncado: o prompt identifica a seção, mas
                  gritado em maiúsculas vira um bloco cinza ilegível. */}
              {secao.hint && (
                <p className="truncate text-[11px] text-white/38">{secao.hint}</p>
              )}
            </div>
            <span className="metric-number shrink-0 text-[10px] text-white/35">{secao.meta}</span>
          </header>
          <div className="studio-canvas-grid">
            {secao.items.map(({ asset, depth }) => (
              <div
                key={asset.id}
                // O recuo é a única pista de profundidade no modo linhagem;
                // no grid ele é sempre 0 e some.
                style={depth > 0 ? { marginLeft: `${Math.min(depth, 3) * 20}px` } : undefined}
              >
                <AssetNode
                  asset={asset}
                  selected={selecionados.has(asset.id)}
                  onToggleSelect={onToggleSelect}
                  onAction={onAction}
                  actions={availableActionsForSelection([asset])}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CanvasState({
  icon: Icon,
  spin,
  title,
  description,
  action,
}: {
  icon: typeof ImageOff;
  spin?: boolean;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="studio-canvas-state">
      <Icon className={`h-6 w-6 text-white/32 ${spin ? 'animate-spin' : ''}`} />
      <p className="mt-3 text-sm font-medium text-white/82">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-white/48">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-glass mt-4 h-8 rounded-full px-3.5 text-[12px] font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
