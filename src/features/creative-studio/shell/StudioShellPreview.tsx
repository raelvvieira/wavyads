import { useMemo, useState } from 'react';
import { libraryAssets, visibleCanvasAssets } from '../state/canvasSelectors';
import type { DockAttachment, StudioLibraryId } from '../types/studioUi';
import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';
import type { CopyBankEntry } from '../api/copyBank';
import { IMAGE_GENERATION_MODEL } from '../generation/capabilities';
import { CreativeStudioShell } from './CreativeStudioShell';
import { FatorCriativoDialog } from '../factor/FatorCriativoDialog';
import type { OfferIntelligence } from '../types/factorCreative';
import { StudioVersionBanner } from './StudioVersionBanner';
import {
  SEM_FILTROS_AVANCADOS,
  advancedFilterChips,
  availableAspectRatios,
  toAssetFilters,
  type StudioAdvancedFilters,
} from '../state/advancedFilters';
import { PREVIEW_ASSETS, PREVIEW_LIBRARIES } from './studioPreviewFixtures';

/** Briefing de exemplo — o que a análise devolveria numa arte real. */
const PREVIEW_BRIEFING: OfferIntelligence = {
  productName: 'Películas Arquitetônicas',
  category: 'Serviço residencial',
  offerDescription: 'Instalação de película de controle solar e privacidade em janelas residenciais',
  audience: ['moradores de casa térrea', 'quem mora de frente para outra janela'],
  customerSituations: ['sala que esquenta demais à tarde'],
  pains: ['vizinho enxerga dentro de casa', 'ambiente quente o dia todo'],
  desires: ['privacidade sem perder luz natural'],
  objections: ['será que escurece muito o ambiente?'],
  differentiators: ['instalação em um dia', 'não precisa trocar o vidro'],
  mechanism: null,
  proofs: [],
  offerTerms: null,
  callToAction: 'Agendar avaliação gratuita',
  prohibitedClaims: [],
};

const PREVIEW_COPY_BANK: CopyBankEntry[] = [
  { id: 'cb1', copyText: 'Até 50% OFF em toda a coleção — só até domingo', tema: 'promoção', createdAt: '2026-08-15T10:00:00.000Z' },
  { id: 'cb2', copyText: 'Peças novas toda semana, direto do ateliê pra você', tema: 'lançamento', createdAt: '2026-08-10T10:00:00.000Z' },
];

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
  const [filtros, setFiltros] = useState<StudioAdvancedFilters>(SEM_FILTROS_AVANCADOS);
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');
  const [ratio, setRatio] = useState<CreativeAspectRatio>('4:5');
  const [resolution, setResolution] = useState<CreativeResolution>('2K');
  const [modelId, setModelId] = useState(IMAGE_GENERATION_MODEL.id);
  const [attachments, setAttachments] = useState<DockAttachment[]>([
    { id: 'r1', kind: 'product', label: 'produto-verao.jpg', value: 'https://x/r1.jpg' },
  ]);
  const [clientId, setClientId] = useState<string | null>('c1');
  const [fatorAberto, setFatorAberto] = useState(false);
  const clients = [{ id: 'c1', name: 'Boutique Aurora' }, { id: 'c2', name: 'Loja do João' }];

  const visiveis = useMemo(
    () => visibleCanvasAssets(PREVIEW_ASSETS, { ...toAssetFilters(filtros), ...(query ? { query } : {}) }),
    [query, filtros],
  );
  const referenceLibrary = useMemo(() => libraryAssets(PREVIEW_ASSETS, { types: ['reference'] }), []);
  const logoLibrary = useMemo(() => libraryAssets(PREVIEW_ASSETS, { types: ['logo'] }), []);
  const productLibrary = useMemo(() => libraryAssets(PREVIEW_ASSETS, { types: ['product'] }), []);
  const avatarLibrary = useMemo(() => libraryAssets(PREVIEW_ASSETS, { types: ['avatar'] }), []);

  return (
    <div className="studio-page">
      <StudioVersionBanner onOpenLegacy={() => {}} />
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
      filters={advancedFilterChips(filtros)}
      onRemoveFilter={(id) => setFiltros((f) => ({
        ...f, ...(id === 'formato' ? { aspectRatio: null } : { status: null }),
      }))}
      onClearFilters={() => { setQuery(''); setFiltros(SEM_FILTROS_AVANCADOS); }}
      advancedFilters={filtros}
      onAdvancedFiltersChange={setFiltros}
      availableRatios={availableAspectRatios(PREVIEW_ASSETS)}
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
      logoLibrary={logoLibrary}
      productLibrary={productLibrary}
      copyBank={PREVIEW_COPY_BANK}
      onNewLibraryUpload={() => {}}
      avatarLibrary={avatarLibrary}
      onGenerateAvatar={() => {}}
      onAssetAction={(acao) => { if (acao === 'factor') setFatorAberto(true); }}
      />

      {/* A bancada abre o diálogo de verdade — é o que permite fotografá-lo
          sem sessão, já que ele vive na página e não no shell. */}
      <FatorCriativoDialog
        open={fatorAberto}
        briefing={PREVIEW_BRIEFING}
        analisando={false}
        onClose={() => setFatorAberto(false)}
        onSubmit={() => setFatorAberto(false)}
      />
    </div>
  );
}
