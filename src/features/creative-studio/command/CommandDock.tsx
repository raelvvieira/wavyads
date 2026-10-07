import { useEffect, useRef } from 'react';
import { ArrowUp, Loader2, MessageSquare, Paperclip, Settings2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationStage } from '../generation/studioAssetActions';
import type { CreativeAspectRatio, CreativeAsset, CreativeResolution } from '../types/creative';
import type { DockAttachment } from '../types/studioUi';
import type { CopyBankEntry } from '../api/copyBank';
import { describeGeneration } from '../generation/capabilities';
import { descreverEnter, rotearPedido } from '@/lib/creativeStudio/intencao';
import { canGenerate, type SelectionSummary } from '../state/canvasSelectors';
import { AttachMenu } from './AttachMenu';
import { GenerationSettingsPopover } from './GenerationSettingsPopover';

export type { DockAttachment, DockAttachmentKind } from '../types/studioUi';

/**
 * O que o botão diz enquanto a arte não existe.
 *
 * Antes de chegar ao gerador, a arte passa por ler as referências e por
 * escrever a direção — segundos em que a tela ficaria parada dizendo
 * "gerando", e um usuário que não vê progresso clica de novo.
 */
const ROTULO_DO_ESTAGIO: Record<GenerationStage, string> = {
  'reading-references': 'Lendo as referências…',
  directing: 'Dirigindo a arte…',
  generating: 'Gerando…',
};

interface CommandDockProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  /** Em que etapa a geração está — ver `GenerationStage`. */
  stage?: GenerationStage | null;
  /**
   * O detalhe da etapa — "ideia 2 de 2".
   *
   * Num pedido de várias peças, as leituras acontecem em sequência, e um
   * spinner idêntico por vários segundos parece uma tela travada. O detalhe
   * é o que distingue "está demorando" de "está trabalhando".
   */
  stageDetail?: string | null;
  hasCopy: boolean;
  ratio: CreativeAspectRatio;
  resolution: CreativeResolution;
  modelId: string;
  quantity?: number;
  /**
   * Sinal para trazer o cursor ao campo.
   *
   * É um contador, não um booleano: pedir foco duas vezes seguidas precisa
   * funcionar as duas, e um booleano que já está `true` não dispara efeito
   * nenhum na segunda.
   */
  focusToken?: number;
  selection: SelectionSummary;
  attachments: DockAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttach: (attachment: DockAttachment) => void;
  onRatioChange: (ratio: CreativeAspectRatio) => void;
  onResolutionChange: (resolution: CreativeResolution) => void;
  onModelChange: (modelId: string) => void;
  /** Já filtrada por `type: 'reference'`/`'logo'`/`'product'` — alimenta os sub-painéis de anexo. */
  referenceLibrary: CreativeAsset[];
  logoLibrary: CreativeAsset[];
  productLibrary: CreativeAsset[];
  avatarLibrary: CreativeAsset[];
  /** Copies já usadas por este cliente — alimenta o sub-painel de copy. */
  copyBank: CopyBankEntry[];
  /** Acervo carregado — o menu de anexos usa para contar uso de um insumo. */
  allAssets: CreativeAsset[];
  onDeleteAsset?: (asset: CreativeAsset) => Promise<void>;
  onNewLibraryUpload: (kind: 'reference' | 'logo' | 'product', url: string) => void;
  onOpenCopilot: () => void;
  /**
   * Existe proposta para reabrir?
   *
   * Sem isto o botão era um no-op: clicava, nada acontecia, e nada dizia
   * por quê. A proposta nasce do Enter — antes dele não há o que abrir, e um
   * botão desligado com título explicando é mais informativo que um botão
   * aceso que ignora o clique.
   */
  hasProposal?: boolean;
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
  stage = null,
  stageDetail = null,
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
  logoLibrary,
  productLibrary,
  avatarLibrary,
  copyBank,
  allAssets,
  onDeleteAsset,
  onNewLibraryUpload,
  onOpenCopilot,
  hasProposal = false,
  focusToken,
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

  useEffect(() => {
    if (focusToken) textarea.current?.focus();
  }, [focusToken]);

  /*
   * A rota do Enter, do mesmo módulo puro que a página usa para decidir.
   * Duas leituras do mesmo texto não podem divergir: o dock prometeria uma
   * coisa e o Enter faria outra — que é exatamente o defeito que esta leva
   * conserta.
   */
  const { rota } = rotearPedido(value, selection.total === 1);
  const vaiEditar = rota === 'editar';

  return (
    <div className="studio-dock glass-island">
      {attachments.length > 0 && (
        <div className="studio-dock-attachments">
          {/* A edição não usa anexo nenhum: ela manda a arte, o feedback e o
              prompt original, e mais nada. Os chips ficavam acesos, não
              eram usados e não eram limpos — as três coisas juntas, que é a
              pior combinação: parece que foram. */}
          {vaiEditar && (
            <span className="text-[11px] text-white/45">
              Os anexos não valem numa alteração — eles entram quando você cria uma arte.
            </span>
          )}
          {attachments.map((a) => (
            <span
              key={a.id}
              className={cn('studio-dock-chip', vaiEditar && 'opacity-40')}
              title={vaiEditar ? 'A alteração não usa este anexo' : undefined}
            >
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
        <AttachMenu
          referenceLibrary={referenceLibrary}
          logoLibrary={logoLibrary}
          productLibrary={productLibrary}
          avatarLibrary={avatarLibrary}
          copyBank={copyBank}
          allAssets={allAssets}
          onAttach={onAttach}
          onNewLibraryUpload={onNewLibraryUpload}
          onDeleteAsset={onDeleteAsset}
        >
          <button
            type="button"
            aria-label="Anexar referência, logo, copy, produto ou avatar"
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
          disabled={!hasProposal}
          aria-label="Reabrir a proposta no painel lateral"
          title={hasProposal ? 'Reabrir a proposta' : 'A proposta aparece depois de você enviar o pedido'}
          className={cn('studio-dock-icon', !hasProposal && 'cursor-not-allowed opacity-40')}
        >
          <MessageSquare className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!podeEnviar}
          aria-label={busy ? ROTULO_DO_ESTAGIO[stage ?? 'generating'] : 'Gerar'}
          title={busy ? ROTULO_DO_ESTAGIO[stage ?? 'generating'] : undefined}
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

        {/* A etapa, por escrito. Ela já existia em três nomes e vivia só no
            `aria-label` — ou seja, só quem usava leitor de tela sabia que o
            sistema estava lendo referência em vez de estar travado. */}
        {busy && (
          <span className="text-[11px] text-white/55" role="status">
            {ROTULO_DO_ESTAGIO[stage ?? 'generating']}
            {stageDetail ? ` ${stageDetail}` : ''}
          </span>
        )}

        {/* O que o Enter vai fazer, por extenso, COM o campo cheio. O
            `placeholder` dizia isso e sumia no primeiro caractere — bem na
            hora em que a consequência passa a importar. */}
        {!busy && value.trim().length > 0 && (
          <span className={cn('text-[11px]', vaiEditar ? 'text-white/70' : 'text-white/50')}>
            {descreverEnter(value, selection.total === 1)}
          </span>
        )}

        {!busy && !value.trim() && selection.total > 0 && (
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
