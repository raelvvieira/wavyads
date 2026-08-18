import { useMemo, useState } from 'react';
import { libraryAssets, visibleCanvasAssets } from '../state/canvasSelectors';
import type { DockAttachment, StudioLibraryId } from '../types/studioUi';
import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';
import { IMAGE_GENERATION_MODEL } from '../generation/capabilities';
import { CreativeStudioShell } from './CreativeStudioShell';
import { StudioPreviewBanner } from './StudioPreviewBanner';
import { PREVIEW_ASSETS, PREVIEW_LIBRARIES } from './studioPreviewFixtures';

/**
 * Monta o shell V2 com dados de exemplo.
 *
 * Renderiza os componentes REAIS — nada aqui é uma versão de mentira da
 * tela. O que muda é a origem dos dados, e é justamente por isso que ele
 * roda sem sessão: o shell não fala com o servidor, recebe tudo por props.
 *
 * Os popovers de anexo e de geração ficam de verdade interativos aqui —
 * é a bancada que permite fotografá-los sem precisar de uma sessão real.
 */
export function StudioShellPreview() {
  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');
  const [ratio, setRatio] = useState<CreativeAspectRatio>('4:5');
  const [resolution, setResolution] = useState<CreativeResolution>('2K');
  const [modelId, setModelId] = useState(IMAGE_GENERATION_MODEL.id);
  const [attachments, setAttachments] = useState<DockAttachment[]>([
    { id: 'r1', kind: 'product', label: 'produto-verao.jpg', value: 'https://x/r1.jpg' },
  ]);
  const [clientId, setClientId] = useState<string | null>('c1');
  const clients = [{ id: 'c1', name: 'Boutique Aurora' }, { id: 'c2', name: 'Loja do João' }];

  const visiveis = useMemo(
    () => visibleCanvasAssets(PREVIEW_ASSETS, query ? { query } : {}),
    [query],
  );
  const referenceLibrary = useMemo(() => libraryAssets(PREVIEW_ASSETS, { types: ['reference'] }), []);

  return (
    <div className="studio-page">
      <StudioPreviewBanner onOpenCurrent={() => {}} />
      <CreativeStudioShell
      clientName={clients.find((c) => c.id === clientId)?.name ?? null}
      clientId={clientId}
      clients={clients}
      onClientChange={setClientId}
      assets={visiveis}
      allAssets={PREVIEW_ASSETS}
      libraries={PREVIEW_LIBRARIES}
      activeLibrary={library}
      onSelectLibrary={setLibrary}
      query={query}
      onQueryChange={setQuery}
      filters={[{ id: 'ratio', label: '4:5' }]}
      onRemoveFilter={() => {}}
      onClearFilters={() => setQuery('')}
      onOpenFilters={() => {}}
      onOpenHistory={() => {}}
      onNewProject={() => {}}
      command={command}
      onCommandChange={setCommand}
      onSubmitCommand={() => {}}
      busy={false}
      hasCopy={false}
      ratio={ratio}
      resolution={resolution}
      modelId={modelId}
      attachments={attachments}
      onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
      onAttach={(a) => setAttachments((prev) => [...prev, a])}
      onRatioChange={setRatio}
      onResolutionChange={setResolution}
      onModelChange={setModelId}
      referenceLibrary={referenceLibrary}
      onAssetAction={() => {}}
      />
    </div>
  );
}
