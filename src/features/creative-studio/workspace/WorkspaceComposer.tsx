import { useEffect, useState } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '../types/creative';

interface WorkspaceComposerProps {
  selectedAssets: CreativeAsset[];
  busy: boolean;
  onEdit: (feedback: string) => void;
  onOpenClassic: () => void;
}

/**
 * Composer contextual: o mesmo campo muda de significado conforme a seleção.
 * Nada selecionado = criar; uma arte selecionada = alterar aquela arte.
 * É o que aproxima a tela de um workspace de IA em vez de um formulário.
 */
export function WorkspaceComposer({ selectedAssets, busy, onEdit, onOpenClassic }: WorkspaceComposerProps) {
  const [value, setValue] = useState('');
  const single = selectedAssets.length === 1 ? selectedAssets[0] : null;
  const canEdit = !!single && single.status === 'ready' && !!single.url;

  // Some junto com a seleção: o texto era sobre aquela arte.
  useEffect(() => { setValue(''); }, [selectedAssets.map((a) => a.id).join(',')]);

  const placeholder = selectedAssets.length === 0
    ? 'Selecione uma arte no quadro para alterá-la com IA...'
    : selectedAssets.length > 1
      ? `${selectedAssets.length} artes selecionadas — ações em lote chegam na próxima etapa`
      : canEdit
        ? 'Peça uma alteração nesta arte...'
        : 'Esta arte ainda não está pronta para edição';

  const submit = () => {
    const text = value.trim();
    if (!text || !canEdit || busy) return;
    onEdit(text);
    setValue('');
  };

  return (
    <div className="border-t border-[var(--studio-border)] bg-[var(--studio-surface-1)] px-4 py-3">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-[var(--studio-surface-2)] p-2 transition-colors',
          canEdit ? 'border-[var(--studio-border)] focus-within:border-[var(--studio-accent)]' : 'border-[var(--studio-border)]',
        )}
      >
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          disabled={!canEdit || busy}
          placeholder={placeholder}
          className={cn(
            'max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-[var(--studio-text)]',
            'placeholder:text-[var(--studio-text-tertiary)] focus:outline-none disabled:cursor-not-allowed',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canEdit || busy || value.trim().length === 0}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-accent)] text-white transition',
            'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>

      {selectedAssets.length === 0 && (
        <p className="mt-2 px-1 text-[10px] text-[var(--studio-text-tertiary)]">
          Para criar uma arte do zero, o fluxo clássico ainda monta o prompt a partir da direção
          visual e da copy —{' '}
          <button type="button" onClick={onOpenClassic} className="underline underline-offset-2 hover:text-[var(--studio-text-secondary)]">
            abrir agora
          </button>
          .
        </p>
      )}
    </div>
  );
}
