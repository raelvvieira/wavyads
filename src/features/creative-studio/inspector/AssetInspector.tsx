import { useState } from 'react';
import { ChevronDown, Download, Expand, Maximize2, Pencil, RefreshCw, Repeat, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '../types/creative';
import { ASSET_ORIGIN_LABELS, ASSET_STATUS_LABELS, FACTOR_AXIS_LABELS } from '../types/creative';
import { availableActionsForSelection, type SelectionAction } from '../state/canvasSelectors';
import { pathToRoot } from '../state/lineage';
import { angleLabel } from '../types/factorCreative';
import { AssetPreviewDialog } from './AssetPreviewDialog';

const ACAO: Record<SelectionAction, { label: string; icon?: typeof Pencil } | undefined> = {
  edit: { label: 'Editar com IA', icon: Pencil },
  'use-as-reference': { label: 'Usar como referência', icon: Repeat },
  factor: { label: 'Fator Criativo', icon: Sparkles },
  resize: { label: 'Redimensionar para 1:1', icon: Maximize2 },
  download: { label: 'Baixar', icon: Download },
  retry: { label: 'Tentar novamente', icon: RefreshCw },
  preview: undefined,
  'save-as-template': { label: 'Salvar como template' },
  'save-to-client-intelligence': { label: 'Salvar na inteligência do cliente' },
  delete: { label: 'Apagar arte', icon: Trash2 },
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
  const [previewOpen, setPreviewOpen] = useState(false);

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

      {/* `key` muda a cada seleção — força o React a desmontar e remontar
          o corpo inteiro em vez de reaproveitar o mesmo nó. Duas coisas
          dependem disso: o SCROLL, que sem isso mantinha a posição da arte
          anterior e escondia a imagem da nova acima do que estava visível
          (foi assim que a imagem "sumiu" — a arte trocava, o scroll não);
          e o prompt aberto/fechado, que sem isso vazava de uma arte para a
          próxima. */}
      <Corpo key={unico?.id ?? `multi-${selected.length}`} unico={unico} caminho={caminho} onPreview={() => setPreviewOpen(true)} />

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
                className={cn('studio-inspector-action', a === 'delete' && 'hover:text-destructive')}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {spec.label}
              </button>
            );
          })}
        </footer>
      )}

      <AssetPreviewDialog asset={previewOpen ? unico : null} onClose={() => setPreviewOpen(false)} />
    </aside>
  );
}

/**
 * Corpo do inspetor.
 *
 * Componente próprio para que a `key` no chamador funcione: React só reseta
 * scroll e estado local ao trocar de `key` se o que muda de identidade for
 * a raiz de uma árvore de componentes, não um `<div>` solto no meio de um
 * componente que continua o mesmo.
 */
function Corpo({
  unico,
  caminho,
  onPreview,
}: {
  unico: CreativeAsset | null;
  caminho: CreativeAsset[];
  onPreview: () => void;
}) {
  const [promptAberto, setPromptAberto] = useState(false);

  return (
    <div className="studio-side-panel-body">
      {/* A arte inteira, na proporção dela.

          `shrink-0` não é enfeite: o corpo do painel é um flex column, e a
          imagem é o único item alto e encolhível da coluna. Sem isso, assim
          que fatos, linhagem e prompt passam da altura disponível, o flex
          espreme justamente ela — e com `object-cover` no `<img>` o que
          sobrava da altura virava recorte, a arte aparecendo como uma faixa
          fina. Com o shrink fixo e a altura da imagem livre, o painel rola,
          que é o que o `overflow-y: auto` dele sempre esperou fazer. */}
      {unico?.url && unico.status === 'ready' && (
        <button
          type="button"
          onClick={onPreview}
          aria-label="Ver arte em tamanho completo"
          className="group relative block w-full shrink-0 overflow-hidden rounded-[var(--wavy-radius-card)] border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]"
        >
          <img
            src={unico.thumbnailUrl ?? unico.url}
            alt={unico.prompt?.slice(0, 120) ?? 'Arte selecionada'}
            className="block h-auto w-full"
          />
          {/* Só um afago de affordance — o clique já funciona sem isso,
              mas sem sinal nenhum a imagem parece decorativa. */}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/30 group-hover:opacity-100">
            <Expand className="h-5 w-5 text-white drop-shadow" />
          </span>
        </button>
      )}

      {unico && (
        <dl className="studio-inspector-facts">
          <Fato termo="Formato" valor={unico.aspectRatio ?? '—'} />
          <Fato termo="Status" valor={ASSET_STATUS_LABELS[unico.status]} />
          <Fato termo="Origem" valor={ASSET_ORIGIN_LABELS[unico.type] ?? unico.type} />
          {angleLabel(unico.strategicAngle)
            ? <Fato termo="Ângulo" valor={angleLabel(unico.strategicAngle)!} />
            : unico.factorAxis && <Fato termo="Eixo" valor={FACTOR_AXIS_LABELS[unico.factorAxis]} />}
          {typeof unico.qualityScore === 'number' && (
            <Fato termo="Qualidade" valor={unico.qualityScore.toFixed(1)} />
          )}
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
                {ASSET_ORIGIN_LABELS[a.type] ?? a.type}
                {a.aspectRatio && <span className="metric-number text-white/40"> · {a.aspectRatio}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {unico?.prompt && (
        <section>
          {/* Fechado por padrão: o prompt de geração passa de 500
              caracteres com os blocos de safe zone, e por completo pesa
              mais do que ajuda — quem quer conferir clica para abrir. */}
          <button
            type="button"
            onClick={() => setPromptAberto((v) => !v)}
            aria-expanded={promptAberto}
            className="flex w-full items-center justify-between gap-2 rounded-[var(--wavy-radius-control)] py-1 text-left transition-colors duration-150 hover:text-white/70"
          >
            <span className="wavy-caps text-[10px] font-semibold uppercase text-white/45">Prompt</span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-white/40 transition-transform duration-200', promptAberto && 'rotate-180')} />
          </button>
          {promptAberto && (
            <p className="mt-1.5 rounded-[var(--wavy-radius-card)] border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/68">
              {unico.prompt}
            </p>
          )}
        </section>
      )}

      {unico?.status === 'failed' && unico.errorMessage && (
        <p className="rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
          {unico.errorMessage}
        </p>
      )}
    </div>
  );
}

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
