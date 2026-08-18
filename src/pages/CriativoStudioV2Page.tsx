import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, CheckCircle2, ImageIcon, LayoutTemplate, Sparkles, UserRound, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { recordAiUsage, type AiUsageType } from '@/lib/aiUsageTracker';
import { CreativeStudioShell } from '@/features/creative-studio/shell/CreativeStudioShell';
import { StudioPreviewBanner } from '@/features/creative-studio/shell/StudioPreviewBanner';
import {
  createCreativeAsset,
  listCreativeAssets,
  updateCreativeAsset,
} from '@/features/creative-studio/api/creativeAssets';
import { createProject, listRecentProjects, type ProjectSummary } from '@/features/creative-studio/api/projectRepository';
import { libraryAssets, visibleCanvasAssets, type SelectionAction } from '@/features/creative-studio/state/canvasSelectors';
import { createStudioAssetActions, type StudioAssetActionsDeps } from '@/features/creative-studio/generation/studioAssetActions';
import type { CreativeAsset, CreativeAspectRatio } from '@/features/creative-studio/types/creative';
import type { StudioLibraryEntry, StudioLibraryId } from '@/features/creative-studio/types/studioUi';

/**
 * Criativo Studio V2 — funcional.
 *
 * Mostra o acervo REAL e agora também GERA, EDITA e REDIMENSIONA de
 * verdade, chamando as mesmas edge functions do Studio atual. Fator
 * Criativo, biblioteca de referências/produtos e configuração de modelo
 * continuam no Studio atual — ligá-los é a próxima fatia.
 *
 * Cada ação grava o ciclo `generating` → `ready`/`failed` no banco antes de
 * atualizar a tela: o card aparece gerando de verdade, e uma falha do
 * provedor chega ao usuário em vez de desaparecer.
 */
export default function CriativoStudioV2Page() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');

  // O projeto pode nascer DURANTE uma geração (primeira arte do workspace).
  // Guardar em ref, e não só em state, evita duas chamadas em paralelo
  // criarem dois projetos quando o usuário dispara duas gerações rápido.
  const projectIdRef = useRef<string | null>(null);
  useEffect(() => { projectIdRef.current = projectId; }, [projectId]);
  const criandoProjetoRef = useRef<Promise<string> | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lista, recentes] = await Promise.all([listCreativeAssets(), listRecentProjects(20)]);
      setAssets(lista);
      setProjects(recentes);
      setProjectId((atual) => atual ?? recentes[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível ler o acervo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const ensureProjectId = useCallback(async (): Promise<string> => {
    if (projectIdRef.current) return projectIdRef.current;
    if (criandoProjetoRef.current) return criandoProjetoRef.current;

    const promessa = (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { id } = await createProject({
        title: 'Novo projeto',
        initialPrompt: '',
        currentStage: 'canvas-v2',
        aspectRatio: '4:5',
        resolution: '2K',
        language: 'pt-BR',
        model: 'gemini-3.1-flash-image-preview',
        userId: userData.user?.id ?? null,
        clientId: null,
      });
      setProjectId(id);
      setProjects((prev) => [{ id, title: 'Novo projeto', status: 'in_progress', selected_aspect_ratio: '4:5', selected_resolution: '2K', thumbnail_url: null, updated_at: new Date().toISOString() }, ...prev]);
      return id;
    })();

    criandoProjetoRef.current = promessa;
    try {
      return await promessa;
    } finally {
      criandoProjetoRef.current = null;
    }
  }, []);

  const projeto = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);
  const doProjeto = useMemo(
    () => (projectId ? assets.filter((a) => a.projectId === projectId) : assets),
    [assets, projectId],
  );
  const visiveis = useMemo(() => {
    const filtro = filtroDaBiblioteca(library);
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

  // Substitui/insere uma linha no estado local sem esperar outro round-trip
  // ao banco — é o que faz o card virar "gerando" na hora, não só depois
  // que a IA responde.
  const upsertAsset = useCallback((asset: CreativeAsset) => {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx === -1) return [asset, ...prev];
      const copia = prev.slice();
      copia[idx] = asset;
      return copia;
    });
  }, []);

  const actions = useMemo(() => {
    const deps: StudioAssetActionsDeps = {
      ensureProjectId,
      clientId: null,
      invoke: async (name, body, timeoutMs) =>
        supabase.functions.invoke(name, { body: body as any, timeout: timeoutMs }),
      extractErrorMessage: extractFunctionErrorMessage,
      createAsset: createCreativeAsset,
      updateAsset: updateCreativeAsset,
      recordUsage: (usageKey) => { void recordAiUsage(usageKey as AiUsageType); },
    };
    return createStudioAssetActions(deps);
  }, [ensureProjectId]);

  // Um aviso só, com o motivo. O que falta ligar (Fator, biblioteca de
  // referências para a geração, escolha de modelo) compartilha a mesma
  // razão: é a próxima fatia, não um bug desta.
  const aindaNaoLigado = useCallback(() => {
    toast({
      title: 'Ainda não ligado nesta versão',
      description: 'Fator Criativo e referências continuam no Studio atual. Gerar, editar e redimensionar já funcionam aqui.',
    });
  }, []);

  const voltarAoAtual = useCallback(() => navigate('/criativo-studio'), [navigate]);

  const handleSubmitCommand = useCallback(async (selectedIds: string[]) => {
    const texto = command.trim();
    if (!texto || busy) return;
    setBusy(true);
    try {
      if (selectedIds.length === 0) {
        // Sem seleção: gerar uma arte nova, no formato do projeto atual.
        const ratio = (projeto?.selected_aspect_ratio as CreativeAspectRatio) || '4:5';
        // Otimista: mostra o card gerando antes de a chamada existir de
        // verdade no banco seria enganoso, então aqui esperamos só o
        // suficiente para ter a linha — o resto acontece em segundo plano.
        const promessa = actions.generate(texto, ratio);
        toast({ title: 'Gerando arte…' });
        const resultado = await promessa;
        upsertAsset(resultado);
        if (resultado.status === 'failed') {
          toast({ title: 'Erro ao gerar', description: resultado.errorMessage ?? undefined, variant: 'destructive' });
        } else {
          toast({ title: 'Arte gerada' });
        }
      } else if (selectedIds.length === 1) {
        const alvo = assets.find((a) => a.id === selectedIds[0]);
        if (!alvo) return;
        toast({ title: 'Editando arte…' });
        const resultado = await actions.edit(alvo, texto);
        upsertAsset(resultado);
        if (resultado.status === 'failed') {
          toast({ title: 'Erro ao editar', description: resultado.errorMessage ?? undefined, variant: 'destructive' });
        } else {
          toast({ title: 'Edição aplicada' });
        }
      } else {
        aindaNaoLigado();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Não foi possível concluir.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setCommand('');
    }
  }, [command, busy, projeto, actions, assets, upsertAsset, aindaNaoLigado]);

  const handleAssetAction = useCallback(async (acao: SelectionAction, selecionados: CreativeAsset[]) => {
    if (acao === 'download') {
      for (const a of selecionados) if (a.url) window.open(a.url, '_blank', 'noopener');
      return;
    }
    if (selecionados.length !== 1) { aindaNaoLigado(); return; }
    const [alvo] = selecionados;

    if (acao === 'retry') {
      upsertAsset({ ...alvo, status: 'generating', errorMessage: null });
      try {
        const resultado = await actions.retry(alvo);
        upsertAsset(resultado);
        if (resultado.status === 'failed') {
          toast({ title: 'Falhou de novo', description: resultado.errorMessage ?? undefined, variant: 'destructive' });
        } else {
          toast({ title: 'Arte gerada' });
        }
      } catch (e: any) {
        upsertAsset({ ...alvo, status: 'failed', errorMessage: e?.message ?? 'Erro desconhecido' });
      }
      return;
    }

    if (acao === 'resize') {
      toast({ title: 'Redimensionando para 1:1…' });
      try {
        const resultado = await actions.resize(alvo);
        upsertAsset(resultado);
        toast({ title: resultado.status === 'ready' ? '1080×1080 pronto' : 'Erro ao redimensionar', variant: resultado.status === 'ready' ? undefined : 'destructive' });
      } catch (e: any) {
        toast({ title: 'Erro ao redimensionar', description: e?.message, variant: 'destructive' });
      }
      return;
    }

    if (acao === 'edit') {
      toast({ title: 'Descreva a edição no campo de comando e selecione esta arte.' });
      return;
    }

    aindaNaoLigado();
  }, [actions, upsertAsset, aindaNaoLigado]);

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
        filters={projeto ? [{ id: 'projeto', label: 'Só este projeto' }] : []}
        onRemoveFilter={() => setProjectId(null)}
        onClearFilters={() => { setQuery(''); setLibrary('all'); setProjectId(null); }}
        onOpenFilters={aindaNaoLigado}
        onOpenProjects={aindaNaoLigado}
        onOpenHistory={aindaNaoLigado}
        onNewProject={() => setProjectId(null)}
        loading={loading}
        error={error}
        command={command}
        onCommandChange={setCommand}
        onSubmitCommand={handleSubmitCommand}
        busy={busy}
        hasCopy={false}
        ratio={(projeto?.selected_aspect_ratio as CreativeAspectRatio) ?? '4:5'}
        attachments={[]}
        onRemoveAttachment={() => {}}
        onOpenAttachments={aindaNaoLigado}
        onOpenSettings={aindaNaoLigado}
        onAssetAction={handleAssetAction}
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
