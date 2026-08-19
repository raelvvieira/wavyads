import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, CheckCircle2, ImageIcon, Images, LayoutTemplate, Layers, UserRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { recordAiUsage, type AiUsageType } from '@/lib/aiUsageTracker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreativeStudioShell } from '@/features/creative-studio/shell/CreativeStudioShell';
import { StudioPreviewBanner } from '@/features/creative-studio/shell/StudioPreviewBanner';
import {
  createCreativeAsset,
  deleteCreativeAsset,
  listCreativeAssets,
  updateCreativeAsset,
} from '@/features/creative-studio/api/creativeAssets';
import { listCopyBank, saveCopyToBank, type CopyBankEntry } from '@/features/creative-studio/api/copyBank';
import { uploadDataUrlToCreativeStorage } from '@/features/creative-studio/api/storageUpload';
import {
  createProject,
  listRecentProjects,
  updateProjectFormat,
  type ProjectSummary,
} from '@/features/creative-studio/api/projectRepository';
import { libraryAssets, visibleCanvasAssets, type SelectionAction } from '@/features/creative-studio/state/canvasSelectors';
import { childrenByParentId } from '@/features/creative-studio/state/lineage';
import { createStudioAssetActions, type StudioAssetActionsDeps } from '@/features/creative-studio/generation/studioAssetActions';
import { IMAGE_GENERATION_MODEL } from '@/features/creative-studio/generation/capabilities';
import type { CreativeAsset, CreativeAspectRatio, CreativeResolution } from '@/features/creative-studio/types/creative';
import type { DockAttachment, StudioLibraryEntry, StudioLibraryId } from '@/features/creative-studio/types/studioUi';
import type { AvatarPersona } from '@/features/creative-studio/types/avatarPersona';

/**
 * Criativo Studio V2 — funcional.
 *
 * Mostra o acervo REAL e agora também GERA, EDITA e REDIMENSIONA de
 * verdade, chamando as mesmas edge functions do Studio atual. Fator
 * Criativo continua no Studio atual — ligá-lo é a próxima fatia.
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

  const [ratio, setRatio] = useState<CreativeAspectRatio>('4:5');
  const [resolution, setResolution] = useState<CreativeResolution>('2K');
  const [modelId, setModelId] = useState<string>(IMAGE_GENERATION_MODEL.id);
  const [attachments, setAttachments] = useState<DockAttachment[]>([]);

  // Confirmação de apagar arte: abrir o diálogo não apaga nada — só a
  // confirmação chama `deleteCreativeAsset`.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CreativeAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [copyBank, setCopyBank] = useState<CopyBankEntry[]>([]);
  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, name: c.name })), [clients]);
  const clientName = useMemo(
    () => clients.find((c) => c.id === selectedClientId)?.name ?? null,
    [clients, selectedClientId],
  );

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
      // Sem cliente selecionado o padrão é "Todos Clientes" — auto-selecionar
      // o projeto mais recente aqui prendia o canvas a UM projeto (chip "Só
      // este projeto") antes mesmo do usuário escolher algo, escondendo todo
      // o resto do acervo logo na primeira tela. Projeto só entra em cena
      // quando algo realmente precisa de um (`ensureProjectId`, ao gerar).
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível ler o acervo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Copy é sobre a voz da marca do cliente, não de um projeto — recarrega
  // sempre que o cliente selecionado muda, sem cliente não há o que buscar.
  useEffect(() => {
    if (!selectedClientId) { setCopyBank([]); return; }
    let cancelado = false;
    listCopyBank(selectedClientId)
      .then((entradas) => { if (!cancelado) setCopyBank(entradas); })
      .catch(() => { if (!cancelado) setCopyBank([]); });
    return () => { cancelado = true; };
  }, [selectedClientId]);

  // Formato/resolução seguem o projeto ativo — troca de projeto troca o
  // padrão de geração junto, do mesmo jeito que o Studio atual já faz.
  useEffect(() => {
    if (!projectId) return;
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setRatio((p.selected_aspect_ratio as CreativeAspectRatio) || '4:5');
    setResolution((p.selected_resolution as CreativeResolution) || '2K');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
        clientId: selectedClientId,
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
  }, [selectedClientId]);

  const projeto = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);

  // Camada de cliente: aplicada ANTES do projeto, e alimenta tanto o canvas
  // quanto as contagens da ilha — selecionar um cliente precisa restringir
  // tudo o que a tela mostra, não só as artes visíveis no momento.
  const assetsDoCliente = useMemo(
    () => (selectedClientId ? assets.filter((a) => a.clientId === selectedClientId) : assets),
    [assets, selectedClientId],
  );
  const doProjeto = useMemo(
    () => (projectId ? assetsDoCliente.filter((a) => a.projectId === projectId) : assetsDoCliente),
    [assetsDoCliente, projectId],
  );
  const visiveis = useMemo(() => {
    const filtro = filtroDaBiblioteca(library);
    return filtro.types
      ? libraryAssets(doProjeto, { ...filtro, query })
      : visibleCanvasAssets(doProjeto, { query });
  }, [doProjeto, query, library]);

  const referenceLibrary = useMemo(
    () => libraryAssets(doProjeto, { types: ['reference'] }),
    [doProjeto],
  );
  const logoLibrary = useMemo(
    () => libraryAssets(doProjeto, { types: ['logo'] }),
    [doProjeto],
  );
  const productLibrary = useMemo(
    () => libraryAssets(doProjeto, { types: ['product'] }),
    [doProjeto],
  );
  // Avatar é do CLIENTE, não do projeto: a persona atravessa campanhas, e
  // filtrar por projeto esconderia a persona criada na semana passada.
  const avatarLibrary = useMemo(
    () => libraryAssets(assetsDoCliente, { types: ['avatar'] }),
    [assetsDoCliente],
  );

  const bibliotecas = useMemo<StudioLibraryEntry[]>(() => {
    const conta = (fn: (a: CreativeAsset) => boolean) => assetsDoCliente.filter(fn).length;
    return [
      { id: 'all', label: 'Todas as criações', icon: ImageIcon, count: conta(() => true) },
      // Layers/Images, e não Sparkles/Wand2: a navegação principal do app
      // já usa esses dois para "Google Ads I.A" e "Criativo Studio", e as
      // duas ilhas ficam lado a lado na mesma tela.
      { id: 'generations', label: 'Gerações', icon: Layers, count: conta((a) => a.type === 'original') },
      { id: 'references', label: 'Referências', icon: Images, count: conta((a) => a.type === 'reference') },
      { id: 'products', label: 'Produtos', icon: Boxes, count: conta((a) => a.type === 'product') },
      { id: 'avatars', label: 'Avatares', icon: UserRound, count: conta((a) => a.type === 'avatar') },
      { id: 'templates', label: 'Templates', icon: LayoutTemplate, count: conta((a) => a.type === 'template') },
      { id: 'approved', label: 'Inteligência', icon: CheckCircle2, count: conta((a) => a.isClientIntelligence) },
    ];
  }, [assetsDoCliente]);

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

  // Some do estado local — como a seleção do shell é derivada filtrando
  // `assets`, isto também fecha o inspetor sozinho quando a arte apagada
  // era a selecionada, sem precisar de nenhuma prop de "limpar seleção".
  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const actions = useMemo(() => {
    const deps: StudioAssetActionsDeps = {
      ensureProjectId,
      clientId: selectedClientId,
      invoke: async (name, body, timeoutMs) =>
        supabase.functions.invoke(name, { body: body as any, timeout: timeoutMs }),
      extractErrorMessage: extractFunctionErrorMessage,
      createAsset: createCreativeAsset,
      updateAsset: updateCreativeAsset,
      recordUsage: (usageKey) => { void recordAiUsage(usageKey as AiUsageType); },
    };
    return createStudioAssetActions(deps);
  }, [ensureProjectId, selectedClientId]);

  // Cada gatilho tem a própria frase — um aviso genérico citando "Fator
  // Criativo" estava disparando para trocar de projeto, abrir filtros e
  // abrir histórico, que não têm nada a ver com Fator Criativo. Ele vai
  // ganhar um fluxo de ativação PRÓPRIO mais adiante, então merece uma
  // mensagem só dele.
  const avisarIndisponivel = useCallback((mensagem: string) => {
    toast({ title: 'Ainda não disponível', description: mensagem });
  }, []);

  const avisarFatorCriativo = useCallback(() => {
    toast({
      title: 'Fator Criativo chega em breve',
      description: 'Vai ganhar um fluxo de ativação próprio nesta versão — por enquanto continua no Studio atual.',
    });
  }, []);

  const voltarAoAtual = useCallback(() => navigate('/criativo-studio'), [navigate]);

  // Trocar de cliente zera o projeto ativo. Sem isso, o canvas continuaria
  // preso a um projeto do cliente ANTERIOR, filtrado pelo cliente NOVO —
  // na prática, vazio, sem nada que explique por quê. Pousar em "todo o
  // acervo desse cliente" é o resultado previsível.
  const handleClientChange = useCallback((id: string | null) => {
    setSelectedClientId(id);
    setProjectId(null);
  }, []);

  const handleRemoveFilter = useCallback((id: string) => {
    if (id === 'cliente') { setSelectedClientId(null); setProjectId(null); return; }
    setProjectId(null);
  }, []);

  const handleRatioChange = useCallback((novoRatio: CreativeAspectRatio) => {
    setRatio(novoRatio);
    if (projectIdRef.current) {
      void updateProjectFormat(projectIdRef.current, { aspectRatio: novoRatio, resolution }).catch(() => {});
    }
  }, [resolution]);

  const handleResolutionChange = useCallback((novaResolucao: CreativeResolution) => {
    setResolution(novaResolucao);
    if (projectIdRef.current) {
      void updateProjectFormat(projectIdRef.current, { aspectRatio: ratio, resolution: novaResolucao }).catch(() => {});
    }
  }, [ratio]);

  const handleAttach = useCallback((attachment: DockAttachment) => {
    // Upload (quando há um) já aconteceu dentro do menu — aqui só entra o
    // anexo pronto, com a URL ou o texto final.
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Upload novo de logo/produto pelo menu de anexos: além de virar anexo
  // desta geração (já feito pelo `onAttach` de sempre), grava como asset
  // reutilizável — a grade do menu mostra na próxima vez que abrir.
  const handleNewLibraryUpload = useCallback(async (kind: 'logo' | 'product', url: string) => {
    try {
      const pid = await ensureProjectId();
      const asset = await createCreativeAsset({
        projectId: pid, type: kind, url, thumbnailUrl: url,
        clientId: selectedClientId, status: 'ready',
      });
      upsertAsset(asset);
    } catch {
      // O anexo em si já aconteceu — só a reutilização futura falhou. Não
      // vale travar o fluxo nem avisar o usuário por isso.
    }
  }, [ensureProjectId, selectedClientId, upsertAsset]);

  const handleGenerateAvatar = useCallback(async (persona: AvatarPersona, referenceImages: string[]) => {
    if (busy) return;
    setBusy(true);
    try {
      // As referências chegam como data URL do dropzone; o provedor precisa
      // de URL http(s), então sobem antes de virar parte do pedido.
      const urls: string[] = [];
      for (const dataUrl of referenceImages) {
        urls.push(await uploadDataUrlToCreativeStorage({
          dataUrl, path: `avatars/refs/${crypto.randomUUID()}.png`,
        }));
      }
      toast({ title: 'Gerando avatar…' });
      const resultado = await actions.generateAvatar(persona, urls);
      upsertAsset(resultado);
      if (resultado.status === 'failed') {
        toast({ title: 'Erro ao gerar avatar', description: resultado.errorMessage ?? undefined, variant: 'destructive' });
      } else {
        toast({ title: 'Avatar pronto' });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar avatar', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [busy, actions, upsertAsset]);

  const hasCopy = attachments.some((a) => a.kind === 'copy');

  const handleSubmitCommand = useCallback(async (selectedIds: string[]) => {
    const texto = command.trim();
    if ((!texto && !hasCopy) || busy) return;
    setBusy(true);
    try {
      if (selectedIds.length === 0) {
        // Sem seleção: gerar uma arte nova, no formato escolhido no popover.
        const logo = attachments.find((a) => a.kind === 'logo');
        const copyAnexada = attachments.find((a) => a.kind === 'copy');
        const imagens = attachments.filter((a) => a.kind === 'reference' || a.kind === 'product').map((a) => a.value);
        const avatares = attachments.filter((a) => a.kind === 'avatar').map((a) => a.value);

        toast({ title: 'Gerando arte…' });
        const resultado = await actions.generate(texto, ratio, {
          resolution,
          modelId,
          copy: copyAnexada?.value ?? null,
          logoImageUrl: logo?.value ?? null,
          productImageUrls: imagens,
          avatarImageUrls: avatares,
        });
        upsertAsset(resultado);
        if (resultado.status === 'failed') {
          toast({ title: 'Erro ao gerar', description: resultado.errorMessage ?? undefined, variant: 'destructive' });
        } else {
          toast({ title: 'Arte gerada' });
          // Fecha o loop de "copies já usadas": sem isto, o histórico do
          // painel de anexos só cresceria com um salvamento manual que o V2
          // nunca ofereceu.
          if (copyAnexada?.value) {
            void saveCopyToBank({
              clientId: selectedClientId, projectId: projectIdRef.current, copyText: copyAnexada.value,
            })
              .then((entrada) => { if (entrada) setCopyBank((prev) => [entrada, ...prev]); })
              .catch(() => {});
          }
        }
        // Os anexos eram para ESTE pedido, não uma preferência permanente —
        // consumidos, saem do dock.
        setAttachments([]);
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
        avisarIndisponivel('Ações em lote ainda não estão disponíveis — selecione uma arte por vez.');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Não foi possível concluir.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setCommand('');
    }
  }, [command, hasCopy, busy, attachments, ratio, resolution, modelId, actions, assets, upsertAsset, avisarIndisponivel]);

  const handleAssetAction = useCallback(async (acao: SelectionAction, selecionados: CreativeAsset[]) => {
    if (acao === 'download') {
      for (const a of selecionados) if (a.url) window.open(a.url, '_blank', 'noopener');
      return;
    }
    if (selecionados.length !== 1) {
      avisarIndisponivel('Ações em lote ainda não estão disponíveis — selecione uma arte por vez.');
      return;
    }
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

    if (acao === 'factor') {
      avisarFatorCriativo();
      return;
    }

    if (acao === 'use-as-reference') {
      if (!alvo.url) return;
      handleAttach({
        id: crypto.randomUUID(),
        kind: 'reference',
        label: alvo.filename ?? 'Referência',
        thumbnailUrl: alvo.thumbnailUrl ?? alvo.url,
        value: alvo.url,
      });
      toast({ title: 'Adicionada como referência', description: 'Entra no próximo pedido de geração.' });
      return;
    }

    if (acao === 'delete') {
      // Só abre a confirmação — apagar de verdade só acontece no clique
      // de "Apagar" dentro do diálogo.
      setDeleteTarget(alvo);
      setDeleteDialogOpen(true);
      return;
    }

    avisarIndisponivel('Esta ação ainda não está disponível nesta versão.');
  }, [actions, upsertAsset, avisarIndisponivel, avisarFatorCriativo, handleAttach]);

  const filhosDoAlvo = useMemo(
    () => (deleteTarget ? childrenByParentId(assets).get(deleteTarget.id)?.length ?? 0 : 0),
    [assets, deleteTarget],
  );

  // `preventDefault` freia o fechamento automático do AlertDialogAction:
  // sem isso o diálogo some no clique, antes da resposta do banco chegar —
  // e sem otimismo o card só pode sumir DEPOIS da confirmação de sucesso.
  const handleConfirmDelete = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCreativeAsset(deleteTarget.id);
      removeAsset(deleteTarget.id);
      toast({ title: 'Arte apagada' });
      setDeleteDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro ao apagar', description: e?.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, removeAsset]);

  return (
    <div className="studio-page">
      <StudioPreviewBanner onOpenCurrent={voltarAoAtual} />

      <CreativeStudioShell
        clientName={clientName}
        clientId={selectedClientId}
        clients={clientOptions}
        onClientChange={handleClientChange}
        assets={visiveis}
        allAssets={assets}
        libraries={bibliotecas}
        activeLibrary={library}
        onSelectLibrary={setLibrary}
        query={query}
        onQueryChange={setQuery}
        filters={[
          ...(projeto ? [{ id: 'projeto', label: 'Só este projeto' }] : []),
          ...(clientName ? [{ id: 'cliente', label: clientName }] : []),
        ]}
        onRemoveFilter={handleRemoveFilter}
        onClearFilters={() => { setQuery(''); setLibrary('all'); setProjectId(null); setSelectedClientId(null); }}
        onOpenFilters={() => avisarIndisponivel('Filtros avançados ainda não estão disponíveis nesta versão.')}
        onOpenHistory={() => avisarIndisponivel('Histórico de projetos ainda não está disponível nesta versão.')}
        onNewProject={() => setProjectId(null)}
        loading={loading}
        error={error}
        command={command}
        onCommandChange={setCommand}
        onSubmitCommand={handleSubmitCommand}
        busy={busy}
        hasCopy={hasCopy}
        ratio={ratio}
        resolution={resolution}
        modelId={modelId}
        attachments={attachments}
        onRemoveAttachment={handleRemoveAttachment}
        onAttach={handleAttach}
        onRatioChange={handleRatioChange}
        onResolutionChange={handleResolutionChange}
        onModelChange={setModelId}
        referenceLibrary={referenceLibrary}
        logoLibrary={logoLibrary}
        productLibrary={productLibrary}
        copyBank={copyBank}
        onNewLibraryUpload={handleNewLibraryUpload}
        avatarLibrary={avatarLibrary}
        onGenerateAvatar={handleGenerateAvatar}
        onAssetAction={handleAssetAction}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="glass border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta arte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
              {filhosDoAlvo > 0 &&
                ` Esta arte tem ${filhosDoAlvo} variaç${filhosDoAlvo > 1 ? 'ões' : 'ão'} que ficar${filhosDoAlvo > 1 ? 'ão' : 'á'} sem a arte original.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Apagando...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A biblioteca escolhida vira filtro de tipo — exceto "todas". */
function filtroDaBiblioteca(id: StudioLibraryId): { types?: CreativeAsset['type'][] } {
  switch (id) {
    case 'generations': return { types: ['original', 'factor', 'edited', 'resize', 'imported'] };
    case 'references': return { types: ['reference'] };
    case 'products': return { types: ['product'] };
    case 'templates': return { types: ['template'] };
    default: return {};
  }
}
