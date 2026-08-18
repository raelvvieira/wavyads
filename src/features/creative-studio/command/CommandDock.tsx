import { useEffect, useRef } from 'react';
import { ArrowUp, Loader2, MessageSquare, Paperclip, Settings2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAspectRatio, CreativeAsset, CreativeResolution } from '../types/creative';
import type { DockAttachment } from '../types/studioUi';
import { describeGeneration } from '../generation/capabilities';
import { canGenerate, type SelectionSummary } from '../state/canvasSelectors';
import { AttachMenu } from './AttachMenu';
import { GenerationSettingsPopover } from './GenerationSettingsPopover';

export type { DockAttachment, DockAttachmentKind } from '../types/studioUi';

interface CommandDockProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  hasCopy: boolean;
  ratio: CreativeAspectRatio;
  resolution: CreativeResolution;
  modelId: string;
  quantity?: number;
  selection: SelectionSummary;
  attachments: DockAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttach: (attachment: DockAttachment) => void;
  onRatioChange: (ratio: CreativeAspectRatio) => void;
  onResolutionChange: (resolution: CreativeResolution) => void;
  onModelChange: (modelId: string) => void;
  /** Já filtrada por `type: 'reference'` — alimenta o sub-painel de anexo. */
  referenceLibrary: CreativeAsset[];
  onOpenCopilot: () => void;
}

/**
 * Command Dock.
 *
 * Centro de comando, não um textarea decorado. O placeholder muda com a
 * seleção porque a mesma caixa faz três coisas diferentes — criar, alterar
 * uma arte, agir sobre várias — e sem isso o usuário digita "deixa mais
 * escuro" achando que fala da arte selecionada quando na verdade está
 * pedindo uma geração nova.
 *
 * A cápsula de configuração vem de `describeGeneration`, que só afirma o que
 * o pedido realmente carrega. Ela não repete o modelo do seletor da tela
 * antiga, que hoje não é o modelo que gera.
 *
 * O clipe e a cápsula abrem popovers de verdade, não um callback de disparo
 * único — `Popover`/`PopoverTrigger` precisa envolver o botão real, então
 * `AttachMenu`/`GenerationSettingsPopover` vivem aqui dentro, não num
 * componente irmão que só saberia "abrir".
 */
export function CommandDock({
  value,
  onChange,
  onSubmit,
  busy,
  hasCopy,
  ratio,
  resolution,
  modelId,
  quantity,
  selection,
  attachments,
  onRemoveAttachment,
  onAttach,
  onRatioChange,
  onResolutionChange,
  onModelChange,
  referenceLibrary,
  onOpenCopilot,
}: CommandDockProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const podeEnviar = canGenerate({ prompt: value, hasCopy, busy });

  // Auto-expansão: mede o conteúdo em vez de contar linhas, porque a quebra
  // depende da largura e a contagem erraria em qualquer viewport diferente.
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  return (
    <div className="studio-dock glass-island">
      {attachments.length > 0 && (
        <div className="studio-dock-attachments">
          {attachments.map((a) => (
            <span key={a.id} className="studio-dock-chip">
              {a.thumbnailUrl && (
                <img src={a.thumbnailUrl} alt="" className="h-4 w-4 rounded object-cover" />
              )}
              <span className="max-w-[120px] truncate">{a.label}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.id)}
                aria-label={`Remover ${a.label}`}
                className="rounded-full p-0.5 text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="studio-dock-row">
        <AttachMenu referenceLibrary={referenceLibrary} onAttach={onAttach}>
          <button
            type="button"
            aria-label="Anexar referência, logo, copy ou produto"
            title="Anexar"
            className="studio-dock-icon"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </AttachMenu>

        <textarea
          ref={textarea}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (podeEnviar) onSubmit();
            }
          }}
          placeholder={placeholderFor(selection)}
          aria-label={placeholderFor(selection)}
          className="studio-dock-input"
        />

        <button
          type="button"
          onClick={onOpenCopilot}
          aria-label="Abrir Copiloto no painel lateral"
          title="Abrir Copiloto"
          className="studio-dock-icon"
        >
          <MessageSquare className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!podeEnviar}
          aria-label={busy ? 'Gerando' : 'Gerar'}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity duration-200',
            podeEnviar ? 'btn-accent' : 'cursor-not-allowed bg-white/[0.07] text-white/30',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </div>

      <div className="studio-dock-row studio-dock-footer">
        <GenerationSettingsPopover
          ratio={ratio}
          resolution={resolution}
          modelId={modelId}
          onRatioChange={onRatioChange}
          onResolutionChange={onResolutionChange}
          onModelChange={onModelChange}
        >
          <button
            type="button"
            className="studio-dock-summary"
            aria-label="Abrir configurações de geração"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="metric-number">{describeGeneration({ ratio, quantity })}</span>
          </button>
        </GenerationSettingsPopover>

        {selection.total > 0 && (
          <span className="text-[11px] text-white/50">
            {resumoDaSelecao(selection)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * O rótulo do comando segue a seleção.
 *
 * A seleção viaja como IDs junto do pedido — o texto do placeholder é o que
 * torna isso visível, não o que define o alvo.
 */
export function placeholderFor(selection: SelectionSummary): string {
  if (selection.total === 0) return 'O que você quer criar?';
  if (selection.total === 1) return 'O que você quer alterar nesta arte?';
  return `O que você quer fazer com as ${selection.total} artes selecionadas?`;
}

export function resumoDaSelecao(selection: SelectionSummary): string {
  const partes: string[] = [`${selection.total} selecionada${selection.total > 1 ? 's' : ''}`];
  if (selection.generating > 0) partes.push(`${selection.generating} gerando`);
  if (selection.failed > 0) partes.push(`${selection.failed} com falha`);
  return partes.join(' · ');
}
