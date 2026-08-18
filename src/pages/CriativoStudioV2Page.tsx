import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, CheckCircle2, ImageIcon, LayoutTemplate, Sparkles, UserRound, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreativeStudioShell } from '@/features/creative-studio/shell/CreativeStudioShell';
import { StudioPreviewBanner } from '@/features/creative-studio/shell/StudioPreviewBanner';
import { listCreativeAssets } from '@/features/creative-studio/api/creativeAssets';
import { listRecentProjects, type ProjectSummary } from '@/features/creative-studio/api/projectRepository';
import { libraryAssets, visibleCanvasAssets } from '@/features/creative-studio/state/canvasSelectors';
import type { CreativeAsset, CreativeAspectRatio } from '@/features/creative-studio/types/creative';
import type { StudioLibraryEntry, StudioLibraryId } from '@/features/creative-studio/types/studioUi';

/**
 * Criativo Studio V2 — somente leitura.
 *
 * Mostra o acervo REAL no shell novo. É o critério de saída da Fase 3 do
 * plano: o usuário encontra e seleciona todas as artes antigas.
 *
 * O que ainda NÃO faz é gerar, editar ou transformar. Isso é a Fase 4, e
 * ligar meia geração agora produziria o pior dos mundos — um botão que
 * responde e não conclui. Por isso toda ação avisa em vez de tentar.
 */
export default function CriativoStudioV2Page() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // O acervo inteiro, não só o do projeto: a leitura serve para
        // conferir se a tela nova acha TUDO que a antiga guardou.
        const [lista, recentes] = await Promise.all([listCreativeAssets(), listRecentProjects(20)]);
        if (!vivo) return;
        setAssets(lista);
        setProjects(recentes);
        setProjectId(recentes[0]?.id ?? null);
      } catch (e: any) {
        if (vivo) setError(e?.message ?? 'Não foi possível ler o acervo.');
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const projeto = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const doProjeto = useMemo(
    () => (projectId ? assets.filter((a) => a.projectId === projectId) : assets),
    [assets, projectId],
  );

  const visiveis = useMemo(() => {
    const filtro = filtroDaBiblioteca(library);
    // Biblioteca escolhida a dedo mostra o que ela guarda, inclusive insumo.
    // Sem isso, abrir "Referências" mostraria zero.
    return filtro.types
      ? libraryAssets(doProjeto, { ...filtro, query })
      : visibleCanvasAssets(doProjeto, { query });
  }, [doProjeto, query, library]);

  const bibliotecas = useMemo<StudioLibraryEntry[]>(() => {
    const conta = (fn: (a: CreativeAsset) => boolean) => assets.filter(fn).length;
    return [
      { id: 'all', label: 'Todas as criações', icon: ImageIcon, count: conta(() => true) },
      { id: 'generations', label: 'Gerações', icon: Sparkles, count: conta((a) => a.type === 'original') },
      { id: 'references', label: 'Referências', icon: Wand2, count: conta((a) => a.type === 'reference') },
      { id: 'products', label: 'Produtos', icon: Boxes, count: conta((a) => a.type === 'product') },
      { id: 'avatars', label: 'Avatares', icon: UserRound, count: conta((a) => a.type === 'avatar') },
      { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: conta((a) => a.type === 'template') },
      { id: 'approved', label: 'Inteligência', icon: CheckCircle2, count: conta((a) => a.isClientIntelligence) },
    ];
  }, [assets]);

  // Um aviso só, com o motivo. Repetir por ação viraria ruído, e cada uma
  // delas está bloqueada pela mesma razão.
  const aindaNaoLigado = useCallback(() => {
    toast({
      title: 'Ainda não ligado nesta versão',
      description: 'O V2 está em leitura: mostra o acervo, mas gerar e transformar continuam no Studio atual.',
    });
  }, []);

  const voltarAoAtual = useCallback(() => navigate('/criativo-studio'), [navigate]);

  return (
    <div className="studio-page">
      <StudioPreviewBanner onOpenCurrent={voltarAoAtual} />

      <CreativeStudioShell
        projectName={projeto?.title ?? (projectId ? 'Projeto sem título' : 'Todo o acervo')}
        clientName={null}
        assets={visiveis}
        allAssets={assets}
        libraries={bibliotecas}
        activeLibrary={library}
        onSelectLibrary={setLibrary}
        query={query}
        onQueryChange={setQuery}
        // O chip diz o que ele FAZ, não repete o título que já está ao lado:
        // removê-lo abre o acervo inteiro.
        filters={projeto ? [{ id: 'projeto', label: 'Só este projeto' }] : []}
        onRemoveFilter={() => setProjectId(null)}
        onClearFilters={() => { setQuery(''); setLibrary('all'); setProjectId(null); }}
        onOpenFilters={aindaNaoLigado}
        onOpenProjects={aindaNaoLigado}
        onOpenHistory={aindaNaoLigado}
        onNewProject={voltarAoAtual}
        loading={loading}
        error={error}
        command={command}
        onCommandChange={setCommand}
        onSubmitCommand={aindaNaoLigado}
        busy={false}
        hasCopy={false}
        ratio={(projeto?.selected_aspect_ratio as CreativeAspectRatio) ?? '4:5'}
        attachments={[]}
        onRemoveAttachment={() => {}}
        onOpenAttachments={aindaNaoLigado}
        onOpenSettings={aindaNaoLigado}
        onAssetAction={(acao, selecionados) => {
          // Baixar é leitura pura: não escreve nada nem chama modelo, então
          // é a única que funciona de verdade nesta versão.
          if (acao === 'download') {
            for (const a of selecionados) if (a.url) window.open(a.url, '_blank', 'noopener');
            return;
          }
          aindaNaoLigado();
        }}
      />
    </div>
  );
}

/** A biblioteca escolhida vira filtro de tipo — exceto "todas". */
function filtroDaBiblioteca(id: StudioLibraryId): { types?: CreativeAsset['type'][] } {
  switch (id) {
    case 'generations': return { types: ['original', 'factor', 'edited', 'resize', 'imported'] };
    case 'references': return { types: ['reference'] };
    case 'products': return { types: ['product'] };
    case 'avatars': return { types: ['avatar'] };
    case 'templates': return { types: ['template'] };
    default: return {};
  }
}
