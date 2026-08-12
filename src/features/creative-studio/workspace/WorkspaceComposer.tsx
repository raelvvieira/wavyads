import { useEffect, useState } from 'react';
import { ArrowUp, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset } from '../types/creative';

interface WorkspaceComposerProps {
  selectedAssets: CreativeAsset[];
  busy: boolean;
  onCreate: (description: string) => void;
  onEdit: (feedback: string) => void;
}

/**
 * Composer contextual: o mesmo campo muda de significado conforme a seleção.
 * Nada selecionado = criar uma arte nova; uma arte selecionada = alterar
 * aquela arte. É o que aproxima a tela de um workspace de IA em vez de um
 * formulário com um botão por operação.
 */
export function WorkspaceComposer({ selectedAssets, busy, onCreate, onEdit }: WorkspaceComposerProps) {
  const [value, setValue] = useState('');

  const single = selectedAssets.length === 1 ? selectedAssets[0] : null;
  const mode: 'create' | 'edit' | 'batch' = selectedAssets.length === 0
    ? 'create'
    : selectedAssets.length > 1
      ? 'batch'
      : 'edit';

  const editable = !!single && single.status === 'ready' && !!single.url;
  const enabled = mode === 'create' || (mode === 'edit' && editable);

  // Some junto com a seleção: o texto era sobre aquela arte.
  useEffect(() => { setValue(''); }, [selectedAssets.map((asset) => asset.id).join(',')]);

  const placeholder = mode === 'create'
    ? 'Descreva a arte que você quer criar...'
    : mode === 'batch'
      ? `${selectedAssets.length} artes selecionadas — ações em lote chegam numa próxima etapa`
      : editable
        ? 'Peça uma alteração nesta arte...'
        : 'Esta arte ainda não está pronta para edição';

  const submit = () => {
    const text = value.trim();
    if (!text || !enabled || busy) return;
    if (mode === 'create') onCreate(text);
    else onEdit(text);
    setValue('');
  };

  const Icon = mode === 'create' ? Sparkles : Wand2;

  return (
    <div className="border-t border-[var(--studio-border)] bg-[var(--studio-surface-1)] px-4 py-3">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-2 transition-colors',
          enabled && 'focus-within:border-[var(--studio-accent)]',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--studio-text-tertiary)]">
          <Icon className="h-4 w-4" />
        </span>
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
          disabled={!enabled || busy}
          placeholder={placeholder}
          className={cn(
            'max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[14px] text-[var(--studio-text)]',
            'placeholder:text-[var(--studio-text-tertiary)] focus:outline-none disabled:cursor-not-allowed',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!enabled || busy || value.trim().length === 0}
          title={mode === 'create' ? 'Gerar arte' : 'Aplicar alteração'}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-accent)] text-white transition',
            'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-2 px-1 text-[11px] text-[var(--studio-text-tertiary)]">
        {mode === 'create'
          ? 'Enter gera direto. Para copy exata, formato, logo ou foto de produto, use o painel Criar à direita.'
          : mode === 'edit'
            ? 'A arte atual é preservada — a alteração entra como uma versão nova ligada a ela.'
            : 'Clique numa única arte para editá-la.'}
      </p>
    </div>
  );
}
