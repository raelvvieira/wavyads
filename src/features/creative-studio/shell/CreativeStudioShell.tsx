import { useMemo, useState } from 'react';
import { Grid3x3, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeAsset, CreativeAspectRatio, CreativeResolution } from '../types/creative';
import type { CanvasViewMode, DockAttachment, SidePanelMode, StudioLibraryEntry, StudioLibraryId } from '../types/studioUi';
import type { SelectionAction } from '../state/canvasSelectors';
import type { StudioAdvancedFilters } from '../state/advancedFilters';
import type { GenerationStage } from '../generation/studioAssetActions';
import type { CopyBankEntry } from '../api/copyBank';
import type { AvatarPersona } from '../types/avatarPersona';
import { summarizeSelection } from '../state/canvasSelectors';
import { StudioTopBar, type StudioFilterChip } from './StudioTopBar';
import type { StudioClientOption } from './StudioClientSelector';
import { StudioLibraryIsland } from './StudioLibraryIsland';
import { CreativeCanvas } from '../canvas/CreativeCanvas';
import { AvatarStudio } from '../avatar/AvatarStudio';
import { CommandDock } from '../command/CommandDock';
import { AssetInspector } from '../inspector/AssetInspector';

export interface CreativeStudioShellProps {
  clientName: string | null;
  clientId: string | null;
  clients: StudioClientOption[];
  onClientChange: (clientId: string | null) => void;
  /** Já filtrado por `visibleCanvasAssets`. */
  assets: CreativeAsset[];
  /** Acervo completo, para o inspetor montar a linhagem. */
  allAssets: CreativeAsset[];
  libraries: StudioLibraryEntry[];
  activeLibrary: StudioLibraryId;
  onSelectLibrary: (id: StudioLibraryId) => void;
  query: string;
  onQueryChange: (value: string) => void;
  filters: StudioFilterChip[];
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
  advancedFilters: StudioAdvancedFilters;
  onAdvancedFiltersChange: (value: StudioAdvancedFilters) => void;
  /** Formatos presentes no acervo em vista — alimenta o menu de filtros. */
  availableRatios: CreativeAspectRatio[];
  loading?: boolean;
  error?: string | null;
  command: string;
  onCommandChange: (value: string) => void;
  onSubmitCommand: (selectedIds: string[]) => void;
  busy: boolean;
  stage?: GenerationStage | null;
  hasCopy: boolean;
  ratio: CreativeAspectRatio;
  resolution: CreativeResolution;
  modelId: string;
  quantity?: number;
  attachments: DockAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttach: (attachment: DockAttachment) => void;
  onRatioChange: (ratio: CreativeAspectRatio) => void;
  onResolutionChange: (resolution: CreativeResolution) => void;
  onModelChange: (modelId: string) => void;
  /** Já filtradas por tipo — alimentam os sub-painéis do menu de anexos. */
  referenceLibrary: CreativeAsset[];
  logoLibrary: CreativeAsset[];
  productLibrary: CreativeAsset[];
  /** Copies já usadas por este cliente — alimenta o sub-painel de copy. */
  copyBank: CopyBankEntry[];
  onNewLibraryUpload: (kind: 'logo' | 'product', url: string) => void;
  /** Apaga um insumo da biblioteca do cliente, de vez. */
  onDeleteAsset?: (asset: CreativeAsset) => Promise<void>;
  /**
   * Uma arte entrou em foco sozinha.
   *
   * A consulta da grade não traz `prompt` nem `metadata`; o inspetor
   * mostra o prompt. Este aviso é o gatilho para buscar a linha inteira
   * dessa arte — uma, não trezentas.
   */
  onAssetFocused?: (assetId: string) => void;
  /** Avatares deste cliente — alimentam o Avatar Studio e o menu de anexos. */
  avatarLibrary: CreativeAsset[];
  onGenerateAvatar: (persona: AvatarPersona, referenceImages: string[]) => void;
  onAssetAction: (action: SelectionAction, assets: CreativeAsset[]) => void;
}

/**
 * Shell V2 do Criativo Studio: as cinco regiões do plano.
 *
 * Barra contextual no topo, ilha de bibliotecas à esquerda, canvas no meio,
 * dock embaixo e painel contextual à direita. A hierarquia é a do plano: o
 * canvas é o objeto principal e a conversa o controla — por isso o dock
 * flutua SOBRE o canvas em vez de dividir a altura com ele.
 *
 * Sem estado de servidor aqui de propósito. Tudo entra por props, o que
 * torna a tela inteira renderizável e fotografável sem sessão — que é
 * exatamente o que faltava para verificar de olho.
 */
export function CreativeStudioShell(props: CreativeStudioShellProps) {
  const [viewMode, setViewMode] = useState<CanvasViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanelMode>('none');

  const selecionados = useMemo(
    () => props.assets.filter((a) => selectedIds.includes(a.id)),
    [props.assets, selectedIds],
  );
  const resumo = useMemo(() => summarizeSelection(selecionados), [selecionados]);

  const toggleSelect = (asset: CreativeAsset, additive: boolean) => {
    setSelectedIds((atual) => {
      const proximo = additive
        ? atual.includes(asset.id)
          ? atual.filter((id) => id !== asset.id)
          : [...atual, asset.id]
        // Sem modificador, clicar na arte já selecionada limpa a seleção —
        // caso contrário não há como voltar ao estado "nada selecionado" sem
        // procurar um vazio no canvas.
        : atual.length === 1 && atual[0] === asset.id
          ? []
          : [asset.id];
      setSidePanel(proximo.length > 0 ? 'inspector' : 'none');
      // Uma arte só em foco é o momento em que o inspetor precisa do peso
      // que a grade não carrega — o prompt, acima de tudo.
      if (proximo.length === 1) props.onAssetFocused?.(proximo[0]);
      return proximo;
    });
  };

  const modoAvatar = props.activeLibrary === 'avatars';
  const painelAberto = !modoAvatar && sidePanel !== 'none' && selecionados.length > 0;

  return (
    <div
      className="studio-shell"
      data-library-expanded={libraryExpanded}
      data-side-panel={painelAberto}
    >
      <StudioTopBar
        clientName={props.clientName}
        clientId={props.clientId}
        clients={props.clients}
        onClientChange={props.onClientChange}
        query={props.query}
        onQueryChange={props.onQueryChange}
        filters={props.filters}
        onRemoveFilter={props.onRemoveFilter}
        advancedFilters={props.advancedFilters}
        onAdvancedFiltersChange={props.onAdvancedFiltersChange}
        availableRatios={props.availableRatios}
      />

      {/* As três regiões do meio dividem a mesma faixa. Ficarem juntas num
          bloco é o que permite ancorá-las nele em vez de descontar a altura
          da barra com um número chutado — que erra assim que o nome do
          cliente quebra em duas linhas. */}
      <div className="studio-body">
      <StudioLibraryIsland
        entries={props.libraries}
        activeId={props.activeLibrary}
        onSelect={props.onSelectLibrary}
        onExpandedChange={setLibraryExpanded}
      />

      <main className="studio-canvas-region">
        {/* "Avatares" é a primeira entrada da ilha que abre uma TELA em vez
            de filtrar o grid — o dock some junto, porque ele cria anúncio,
            não persona. É o padrão que o UGC Studio vai seguir. */}
        {modoAvatar ? (
          <AvatarStudio
            avatars={props.avatarLibrary}
            busy={props.busy}
            onGenerate={props.onGenerateAvatar}
          />
        ) : (
          <>
        <div className="studio-canvas-toolbar glass-island" role="group" aria-label="Modo de organização">
          <ModeButton
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            icon={<Grid3x3 className="h-3.5 w-3.5" />}
            label="Grade"
          />
          <ModeButton
            active={viewMode === 'lineage'}
            onClick={() => setViewMode('lineage')}
            icon={<GitBranch className="h-3.5 w-3.5" />}
            label="Linhagem"
          />
        </div>

        <CreativeCanvas
          assets={props.assets}
          mode={viewMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onAction={(acao, asset) => props.onAssetAction(acao, [asset])}
          loading={props.loading}
          error={props.error}
          filtered={props.filters.length > 0 || props.query.trim().length > 0}
          onClearFilters={props.onClearFilters}
        />

        <div className="studio-dock-anchor">
          <CommandDock
            value={props.command}
            onChange={props.onCommandChange}
            onSubmit={() => props.onSubmitCommand(selectedIds)}
            busy={props.busy}
            stage={props.stage}
            hasCopy={props.hasCopy}
            ratio={props.ratio}
            resolution={props.resolution}
            modelId={props.modelId}
            quantity={props.quantity}
            selection={resumo}
            attachments={props.attachments}
            onRemoveAttachment={props.onRemoveAttachment}
            onAttach={props.onAttach}
            onRatioChange={props.onRatioChange}
            onResolutionChange={props.onResolutionChange}
            onModelChange={props.onModelChange}
            referenceLibrary={props.referenceLibrary}
            logoLibrary={props.logoLibrary}
            productLibrary={props.productLibrary}
            avatarLibrary={props.avatarLibrary}
            copyBank={props.copyBank}
            allAssets={props.allAssets}
            onDeleteAsset={props.onDeleteAsset}
            onNewLibraryUpload={props.onNewLibraryUpload}
            onOpenCopilot={() => setSidePanel('copilot')}
          />
        </div>
          </>
        )}
      </main>

      {painelAberto && (
        <AssetInspector
          selected={selecionados}
          allAssets={props.allAssets}
          onAction={props.onAssetAction}
          onClose={() => setSidePanel('none')}
        />
      )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors duration-200',
        active ? 'bg-white/[0.12] text-white/92' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
