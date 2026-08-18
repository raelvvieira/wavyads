import { useMemo, useState } from 'react';
import { visibleCanvasAssets } from '../state/canvasSelectors';
import type { StudioLibraryId } from '../types/studioUi';
import { CreativeStudioShell } from './CreativeStudioShell';
import { StudioPreviewBanner } from './StudioPreviewBanner';
import { PREVIEW_ASSETS, PREVIEW_LIBRARIES } from './studioPreviewFixtures';

/**
 * Monta o shell V2 com dados de exemplo.
 *
 * Renderiza os componentes REAIS — nada aqui é uma versão de mentira da
 * tela. O que muda é a origem dos dados, e é justamente por isso que ele
 * roda sem sessão: o shell não fala com o servidor, recebe tudo por props.
 */
export function StudioShellPreview() {
  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');

  const visiveis = useMemo(
    () => visibleCanvasAssets(PREVIEW_ASSETS, query ? { query } : {}),
    [query],
  );

  return (
    <div className="studio-page">
      <StudioPreviewBanner onOpenCurrent={() => {}} />
      <CreativeStudioShell
      projectName="Campanha de Verão 2026"
      clientName="Boutique Aurora"
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
      onOpenProjects={() => {}}
      onOpenHistory={() => {}}
      onNewProject={() => {}}
      command={command}
      onCommandChange={setCommand}
      onSubmitCommand={() => {}}
      busy={false}
      hasCopy={false}
      ratio="4:5"
      attachments={[{ id: 'r1', label: 'referencia-verao.jpg' }]}
      onRemoveAttachment={() => {}}
      onOpenAttachments={() => {}}
      onOpenSettings={() => {}}
      onAssetAction={() => {}}
      />
    </div>
  );
}
