import { Download, Maximize2, Pencil, RefreshCw, Sparkles, X } from 'lucide-react';
import type { CreativeAsset } from '../types/creative';
import { FACTOR_AXIS_LABELS } from '../types/creative';
import { availableActionsForSelection, type SelectionAction } from '../state/canvasSelectors';
import { pathToRoot } from '../state/lineage';

const ACAO: Record<SelectionAction, { label: string; icon?: typeof Pencil } | undefined> = {
  edit: { label: 'Editar com IA', icon: Pencil },
  factor: { label: 'Fator Criativo', icon: Sparkles },
  resize: { label: 'Redimensionar para 1:1', icon: Maximize2 },
  download: { label: 'Baixar', icon: Download },
  retry: { label: 'Tentar novamente', icon: RefreshCw },
  preview: undefined,
  'save-as-template': { label: 'Salvar como template' },
  'save-to-client-intelligence': { label: 'Salvar na inteligência do cliente' },
};

interface AssetInspectorProps {
  selected: CreativeAsset[];
  /** Acervo inteiro: é dele que sai o caminho até a raiz. */
  allAssets: CreativeAsset[];
  onAction: (action: SelectionAction, assets: CreativeAsset[]) => void;
  onClose: () => void;
}

/**
 * Inspetor da seleção.
 *
 * O card mostra o mínimo e o inspetor mostra o resto — é o que impede o
 * canvas de virar uma parede de metadados. As ações vêm de
 * `availableActionsForSelection`, a mesma função que decide o hover do card,
 * então as duas superfícies não podem divergir.
 */
export function AssetInspector({ selected, allAssets, onAction, onClose }: AssetInspectorProps) {
  const acoes = availableActionsForSelection(selected);
  const unico = selected.length === 1 ? selected[0] : null;
  const caminho = unico ? pathToRoot(unico.id, allAssets) : [];

  return (
    <aside className="studio-side-panel" aria-label="Inspetor da seleção">
      <header className="studio-side-panel-header">
        <div className="min-w-0">
          <p className="wavy-caps text-[10px] font-semibold uppercase text-white/45">Inspetor</p>
          <p className="truncate text-sm font-semibold text-white/90">
            {unico ? tituloDoAsset(unico) : `${selected.length} artes selecionadas`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar inspetor"
          className="shrink-0 rounded-full p-1.5 text-white/50 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white/90"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="studio-side-panel-body">
        {unico?.url && unico.status === 'ready' && (
          <img
            src={unico.thumbnailUrl ?? unico.url}
            alt={unico.prompt?.slice(0, 120) ?? 'Arte selecionada'}
            className="w-full rounded-[var(--wavy-radius-card)] border border-white/10 object-cover"
          />
        )}

        {unico && (
          <dl className="studio-inspector-facts">
            <Fato termo="Formato" valor={unico.aspectRatio ?? '—'} />
            <Fato termo="Status" valor={STATUS_LABEL[unico.status]} />
            <Fato termo="Origem" valor={ORIGEM_LABEL[unico.type] ?? unico.type} />
            {unico.factorAxis && <Fato termo="Eixo" valor={FACTOR_AXIS_LABELS[unico.factorAxis]} />}
            {unico.model && <Fato termo="Modelo" valor={unico.model} />}
          </dl>
        )}

        {/* Duas artes ou mais: o caminho até a raiz não é único, então em vez
            de escolher um arbitrariamente o inspetor mostra a contagem. */}
        {caminho.length > 1 && (
          <section>
            <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">Veio de</p>
            <ol className="studio-inspector-lineage">
              {caminho.map((a, i) => (
                <li key={a.id} data-current={i === caminho.length - 1}>
                  {ORIGEM_LABEL[a.type] ?? a.type}
                  {a.aspectRatio && <span className="metric-number text-white/40"> · {a.aspectRatio}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {unico?.prompt && (
          <section>
            <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">Prompt</p>
            <p className="rounded-[var(--wavy-radius-card)] border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/68">
              {unico.prompt}
            </p>
          </section>
        )}

        {unico?.status === 'failed' && unico.errorMessage && (
          <p className="rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
            {unico.errorMessage}
          </p>
        )}
      </div>

      {acoes.length > 0 && (
        <footer className="studio-side-panel-footer">
          {acoes.map((a) => {
            const spec = ACAO[a];
            if (!spec) return null;
            const Icon = spec.icon;
            return (
              <button
                key={a}
                type="button"
                onClick={() => onAction(a, selected)}
                className="studio-inspector-action"
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {spec.label}
              </button>
            );
          })}
        </footer>
      )}
    </aside>
  );
}

const STATUS_LABEL: Record<CreativeAsset['status'], string> = {
  queued: 'Na fila',
  generating: 'Gerando',
  ready: 'Pronta',
  failed: 'Falhou',
};

const ORIGEM_LABEL: Record<string, string> = {
  original: 'Geração original',
  factor: 'Fator Criativo',
  edited: 'Edição',
  resize: 'Redimensionamento',
  imported: 'Importada',
};

function tituloDoAsset(asset: CreativeAsset): string {
  return asset.prompt?.slice(0, 60) ?? asset.filename ?? 'Arte';
}

function Fato({ termo, valor }: { termo: string; valor: string }) {
  return (
    <>
      <dt className="text-[11px] text-white/45">{termo}</dt>
      <dd className="text-[11px] font-medium text-white/82">{valor}</dd>
    </>
  );
}
