import { useEffect, useState, type ReactNode } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Crop,
  Download,
  Loader2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeActionKind } from '../hooks/useCreativeActions';
import { FACTOR_AXIS_LABELS, type CreativeAsset } from '../types/creative';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-[var(--studio-text-tertiary)]">{label}</span>
      <span className="truncate text-right text-[11px] text-[var(--studio-text-secondary)]">{value}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
}: {
  icon: typeof Wand2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] px-3 py-2 text-[11px] text-[var(--studio-text-secondary)] transition-colors',
        'hover:border-[var(--studio-border-hover)] hover:text-[var(--studio-text)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
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
}: AssetInspectorProps) {
  const [feedback, setFeedback] = useState('');
  const busy = runningAction !== null;
  const ready = asset.status === 'ready' && !!asset.url;

  // Trocar de arte com um texto de edição pela metade aplicaria esse texto na
  // arte errada no próximo clique.
  useEffect(() => { setFeedback(''); }, [asset.id]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
          Arte selecionada
        </h3>
        <p className="mt-1 truncate text-sm text-[var(--studio-text)]">{label}</p>
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
          <p className="text-[11px] leading-relaxed text-destructive">
            {asset.errorMessage || 'Falha na geração'}
          </p>
          {/* O prompt fica gravado no asset, então regerar não depende de
              reconstruir nada do estado da tela. */}
          <button
            type="button"
            onClick={onRetry}
            disabled={busy || !asset.prompt}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-1.5 text-[11px] font-medium text-destructive transition',
              'hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {runningAction === 'retry' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Tentar novamente
          </button>
        </div>
      )}

      {asset.status !== 'failed' && (
      <div>
        <p className="mb-1.5 text-[11px] text-[var(--studio-text-tertiary)]">O que deseja alterar?</p>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={3}
          disabled={!ready || busy}
          placeholder="Ex.: deixe o título maior e aumente o contraste do CTA"
          className={cn(
            'w-full resize-none rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-2.5 text-[12px] text-[var(--studio-text)]',
            'placeholder:text-[var(--studio-text-tertiary)] focus:border-[var(--studio-accent)] focus:outline-none disabled:opacity-40',
          )}
        />
        <button
          type="button"
          onClick={() => onEdit(feedback.trim())}
          disabled={!ready || busy || feedback.trim().length === 0}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-[11px] font-semibold text-white transition',
            'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {runningAction === 'edit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Editar com IA
        </button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--studio-text-tertiary)]">
          A arte atual é preservada — a edição entra como uma versão nova ligada a ela.
        </p>
      </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] text-[var(--studio-text-tertiary)]">Ações</p>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={Sparkles}
            label="Fator Criativo"
            busy={runningAction === 'factor'}
            disabled={!ready || busy}
            onClick={onFactor}
          />
          <ActionButton
            icon={Crop}
            label="Gerar 1080"
            busy={runningAction === 'resize'}
            disabled={!ready || busy || !asset.prompt}
            onClick={onResize}
          />
          <ActionButton icon={Download} label="Baixar" disabled={!ready} onClick={onDownload} />
          <ActionButton icon={Maximize2} label="Tela cheia" disabled={!ready} onClick={onOpenFocus} />
        </div>
        <ActionButton
          icon={asset.isClientIntelligence ? BookmarkCheck : BookmarkPlus}
          label={asset.isClientIntelligence ? 'Salva na inteligência' : 'Salvar na inteligência'}
          busy={runningAction === 'intelligence'}
          disabled={!ready || busy || asset.isClientIntelligence || !asset.clientId}
          onClick={onSaveToIntelligence}
        />
        {!asset.clientId && (
          <p className="text-[10px] text-[var(--studio-text-tertiary)]">
            Esta arte não tem cliente associado, então não pode ir para a inteligência.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3">
        <p className="mb-1 text-[11px] text-[var(--studio-text-tertiary)]">Propriedades</p>
        <Row label="Tipo" value={asset.type} />
        {asset.factorAxis && <Row label="Eixo" value={FACTOR_AXIS_LABELS[asset.factorAxis]} />}
        <Row label="Formato" value={asset.aspectRatio || '—'} />
        <Row label="Resolução" value={asset.resolution || '—'} />
        <Row label="Modelo" value={asset.model || '—'} />
        <Row label="Status" value={asset.status} />
        {parent && <Row label="Derivada de" value={parentLabel || 'Arte'} />}
        <Row label="Criada em" value={new Date(asset.createdAt).toLocaleString('pt-BR')} />
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
          />
        ) : (
          createPanel
        )}
      </div>
    </aside>
  );
}
