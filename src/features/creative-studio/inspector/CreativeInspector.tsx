import { useEffect, useState, type ReactNode } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Crop,
  Download,
  Loader2,
  ChevronRight,
  Maximize2,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeActionKind } from '../hooks/useCreativeActions';
import { FACTOR_AXIS_LABELS, type CreativeAsset } from '../types/creative';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[12px] text-[var(--studio-text-tertiary)]">{label}</span>
      <span className="truncate text-right text-[12px] text-[var(--studio-text-secondary)]">{value}</span>
    </div>
  );
}

interface AssetInspectorProps {
  asset: CreativeAsset;
  label: string;
  parent: CreativeAsset | null;
  parentLabel: string | null;
  runningAction: CreativeActionKind | null;
  onEdit: (feedback: string) => void;
  onResize: () => void;
  onFactor: () => void;
  onDownload: () => void;
  onOpenFocus: () => void;
  onSaveToIntelligence: () => void;
  onRetry: () => void;
  onClose: () => void;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
      {children}
    </p>
  );
}

/** Linha de ação: ícone à esquerda, chevron à direita — lê como lista, não
 *  como uma grade de botões competindo entre si. */
function ActionRow({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  tone = 'default',
}: {
  icon: typeof Wand2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'default' | 'accent';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] px-3 py-2.5 text-left text-[13px] transition-colors',
        'hover:border-[var(--studio-border-hover)] disabled:cursor-not-allowed disabled:opacity-35',
        tone === 'accent' ? 'text-[var(--studio-accent)]' : 'text-[var(--studio-text-secondary)] hover:text-[var(--studio-text)]',
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </button>
  );
}

function AssetInspector({
  asset,
  label,
  parent,
  parentLabel,
  runningAction,
  onEdit,
  onResize,
  onFactor,
  onDownload,
  onOpenFocus,
  onSaveToIntelligence,
  onRetry,
  onClose,
}: AssetInspectorProps) {
  const [feedback, setFeedback] = useState('');
  const busy = runningAction !== null;
  const ready = asset.status === 'ready' && !!asset.url;
  const MAX_FEEDBACK = 500;

  // Trocar de arte com um texto de edição pela metade aplicaria esse texto na
  // arte errada no próximo clique.
  useEffect(() => { setFeedback(''); }, [asset.id]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Arte selecionada
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="rounded p-0.5 text-[var(--studio-text-tertiary)] transition-colors hover:text-[var(--studio-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="truncate text-[15px] font-medium text-[var(--studio-text)]">{label}</p>
          {asset.aspectRatio && (
            <span className="shrink-0 text-[12px] text-[var(--studio-text-tertiary)]">{asset.aspectRatio}</span>
          )}
        </div>
      </div>

      {asset.url && (
        <button
          type="button"
          onClick={onOpenFocus}
          className="block w-full overflow-hidden rounded-xl border border-[var(--studio-border)]"
        >
          <img src={asset.url} alt={label} className="w-full object-cover" />
        </button>
      )}

      {asset.status === 'failed' && (
        <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-[13px] leading-relaxed text-destructive">
            {asset.errorMessage || 'Falha na geração'}
          </p>
          {/* O prompt fica gravado no asset, então regerar não depende de
              reconstruir nada do estado da tela. */}
          <button
            type="button"
            onClick={onRetry}
            disabled={busy || !asset.prompt}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-[13px] font-medium text-destructive transition',
              'hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {runningAction === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Tentar novamente
          </button>
        </div>
      )}

      {asset.status !== 'failed' && (
        <div>
          <p className="mb-1.5 text-[13px] text-[var(--studio-text-secondary)]">O que deseja alterar?</p>
          <div className="relative">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value.slice(0, MAX_FEEDBACK))}
              rows={3}
              disabled={!ready || busy}
              placeholder="Ex.: trocar o título, mudar a imagem de fundo, destacar a oferta..."
              className={cn(
                'w-full resize-none rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3 pb-6 text-[13px] leading-relaxed text-[var(--studio-text)]',
                'placeholder:text-[var(--studio-text-tertiary)] focus:border-[var(--studio-accent)] focus:outline-none disabled:opacity-40',
              )}
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-[var(--studio-text-tertiary)]">
              {feedback.length}/{MAX_FEEDBACK}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onEdit(feedback.trim())}
            disabled={!ready || busy || feedback.trim().length === 0}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--studio-accent)] px-3 py-2.5 text-[13px] font-semibold text-white transition',
              'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {runningAction === 'edit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Editar com IA
          </button>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--studio-text-tertiary)]">
            A arte atual é preservada — a edição entra como uma versão nova ligada a ela.
          </p>
        </div>
      )}

      <div>
        <SectionLabel>Ações rápidas</SectionLabel>
        <div className="space-y-1.5">
          <ActionRow
            icon={Sparkles}
            label="Fator Criativo"
            busy={runningAction === 'factor'}
            disabled={!ready || busy}
            onClick={onFactor}
          />
          <ActionRow
            icon={Crop}
            label="Redimensionar para 1080"
            busy={runningAction === 'resize'}
            disabled={!ready || busy || !asset.prompt}
            onClick={onResize}
          />
          <ActionRow icon={Maximize2} label="Ver em tela cheia" disabled={!ready} onClick={onOpenFocus} />
          <ActionRow icon={Download} label="Download" disabled={!ready} onClick={onDownload} />
        </div>
      </div>

      <div>
        <SectionLabel>Configurações</SectionLabel>
        <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] px-3 py-1">
          <Row label="Formato" value={asset.aspectRatio || '—'} />
          <Row label="Resolução" value={asset.resolution || '—'} />
          <Row label="Modelo" value={asset.model ? 'GPT Image 2' : '—'} />
          <Row label="Tipo" value={asset.type} />
          {asset.factorAxis && <Row label="Eixo" value={FACTOR_AXIS_LABELS[asset.factorAxis]} />}
          {parent && <Row label="Derivada de" value={parentLabel || 'Arte'} />}
          <Row label="Criada em" value={new Date(asset.createdAt).toLocaleString('pt-BR')} />
        </div>
      </div>

      <div>
        <SectionLabel>Salvar no cliente</SectionLabel>
        <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--studio-text-secondary)]">
              {asset.isClientIntelligence ? 'Arte salva no perfil' : 'Salvar arte'}
            </span>
            {/* Toggle em vez de botão: é um estado da arte, não uma ação que
                se repete — e o estado atual fica legível de relance. */}
            <button
              type="button"
              role="switch"
              aria-checked={asset.isClientIntelligence}
              onClick={onSaveToIntelligence}
              disabled={!ready || busy || asset.isClientIntelligence || !asset.clientId}
              title={asset.clientId ? undefined : 'Esta arte não tem cliente associado'}
              className={cn(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
                asset.isClientIntelligence ? 'bg-[var(--studio-accent)]' : 'bg-white/15',
                (!asset.clientId || !ready) && !asset.isClientIntelligence && 'opacity-40',
              )}
            >
              <span className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                asset.isClientIntelligence ? 'translate-x-[18px]' : 'translate-x-0.5',
              )} />
            </button>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--studio-text-tertiary)]">
            {!asset.clientId
              ? 'Esta arte não tem cliente associado, então não pode ir para a inteligência.'
              : 'Guarda esta arte no perfil do cliente para reaproveitar depois.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CreativeInspector({
  asset,
  label,
  parent,
  parentLabel,
  runningAction,
  onEdit,
  onResize,
  onFactor,
  onDownload,
  onOpenFocus,
  onSaveToIntelligence,
  onRetry,
  onClose,
  createPanel,
}: Partial<AssetInspectorProps> & { asset: CreativeAsset | null; createPanel: ReactNode }) {
  return (
    <aside className="flex h-full flex-col border-l border-[var(--studio-border)] bg-[var(--studio-surface-1)]">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {asset ? (
          <AssetInspector
            asset={asset}
            label={label ?? 'Arte'}
            parent={parent ?? null}
            parentLabel={parentLabel ?? null}
            runningAction={runningAction ?? null}
            onEdit={onEdit ?? (() => {})}
            onResize={onResize ?? (() => {})}
            onFactor={onFactor ?? (() => {})}
            onDownload={onDownload ?? (() => {})}
            onOpenFocus={onOpenFocus ?? (() => {})}
            onSaveToIntelligence={onSaveToIntelligence ?? (() => {})}
            onRetry={onRetry ?? (() => {})}
            onClose={onClose ?? (() => {})}
          />
        ) : (
          createPanel
        )}
      </div>
    </aside>
  );
}
