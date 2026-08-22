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
import { StudioVersionBanner } from '@/features/creative-studio/shell/StudioVersionBanner';
import {
  createAssetGroup,
  createCreativeAsset,
  deleteCreativeAsset,
  listCreativeAssets,
  updateCreativeAsset,
} from '@/features/creative-studio/api/creativeAssets';
import { listCopyBank, saveCopyToBank, type CopyBankEntry } from '@/features/creative-studio/api/copyBank';
import { uploadDataUrlToCreativeStorage } from '@/features/creative-studio/api/storageUpload';
import { analyzeOffer, generateFactorVariations } from '@/features/creative-studio/api/factorCreative';
import { directArt } from '@/features/creative-studio/api/artDirection';
import { analyzeReferences } from '@/features/creative-studio/api/referenceAnalysis';
import { FatorCriativoDialog, type FatorCriativoSubmit } from '@/features/creative-studio/factor/FatorCriativoDialog';
import type { OfferIntelligence } from '@/features/creative-studio/types/factorCreative';
import {
  createProject,
  listRecentProjects,
  updateProjectFormat,
  type ProjectSummary,
} from '@/features/creative-studio/api/projectRepository';
import { libraryAssets, visibleCanvasAssets, type SelectionAction } from '@/features/creative-studio/state/canvasSelectors';
import {
  SEM_FILTROS_AVANCADOS,
  advancedFilterChips,
  availableAspectRatios,
  toAssetFilters,
  type StudioAdvancedFilters,
} from '@/features/creative-studio/state/advancedFilters';
import { childrenByParentId } from '@/features/creative-studio/state/lineage';
import { buildSafeZoneBlock } from '@/features/creative-studio/lib/promptBuilder';
import {
  createStudioAssetActions,
  type GenerationStage,
  type StudioAssetActionsDeps,
} from '@/features/creative-studio/generation/studioAssetActions';
import { IMAGE_GENERATION_MODEL } from '@/features/creative-studio/generation/capabilities';
import { SOURCE_ASSET_TYPES } from '@/features/creative-studio/types/creative';
import type { CreativeAsset, CreativeAspectRatio, CreativeResolution } from '@/features/creative-studio/types/creative';
import type { DockAttachment, StudioLibraryEntry, StudioLibraryId } from '@/features/creative-studio/types/studioUi';
import type { AvatarPersona } from '@/features/creative-studio/types/avatarPersona';

/**
 * Criativo Studio V2 — funcional.
 *
 * Mostra o acervo REAL e GERA, EDITA, REDIMENSIONA e aplica FATOR CRIATIVO
 * de verdade, chamando as mesmas edge functions do Studio atual.
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
  const [filtrosAvancados, setFiltrosAvancados] = useState<StudioAdvancedFilters>(SEM_FILTROS_AVANCADOS);
  // Ler referência e dirigir a arte somam segundos antes de o gerador sequer
  // começar. Sem dizer em que etapa está, a tela fica parada e o usuário
  // clica de novo.
  const [estagio, setEstagio] = useState<GenerationStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [library, setLibrary] = useState<StudioLibraryId>('all');

  // 9:16 e 4K por padrão, a pedido: é o formato de story/reels, que é onde a
  // maior parte do que sai daqui é veiculada. Sobre o 4K vale a ressalva de
  // que a resolução hoje NÃO é parâmetro da API — ela vira a frase de
  // qualidade dentro do prompt (ver `capabilities.ts`, `resolutions: []`),
  // então o efeito é sobre o capricho pedido ao modelo, não sobre o número
  // de pixels do arquivo.
  const [ratio, setRatio] = useState<CreativeAspectRatio>('9:16');
  const [resolution, setResolution] = useState<CreativeResolution>('4K');
  const [modelId, setModelId] = useState<string>(IMAGE_GENERATION_MODEL.id);
  const [attachments, setAttachments] = useState<DockAttachment[]>([]);

  // Fator Criativo: a arte-base fica guardada enquanto o diálogo decide o
  // briefing; a análise roda assim que o diálogo abre.
  const [fatorBase, setFatorBase] = useState<CreativeAsset | null>(null);
  const [fatorBriefing, setFatorBriefing] = useState<OfferIntelligence | null>(null);
  const [fatorAnalisando, setFatorAnalisando] = useState(false);
  const [fatorErroAnalise, setFatorErroAnalise] = useState<string | null>(null);

  // Confirmação de apagar arte: abrir o diálogo não apaga nada — só a
  // confirmação chama `deleteCreativeAsset`.
  // Nomear o template antes de criá-lo. Sem nome, a biblioteca vira uma
  // lista de "template" que ninguém consegue distinguir.
  const [templateAlvo, setTemplateAlvo] = useState<CreativeAsset | null>(null);
  const [templateNome, setTemplateNome] = useState('');
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
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
      // Duas consultas, não uma. A leitura do acervo corta em 300 linhas
      // mais recentes, e cada geração empurra linhas novas — o Fator sozinho
      // insere cinco. Com uma consulta só, uma tarde de trabalho expulsa da
      // janela o logo que a marca usa há meses, e o menu de anexos volta a
      // parecer vazio mesmo com o escopo por cliente correto.
      //
      // Insumo é pouco e dura; arte é muita e gira. Separados, um não
      // disputa espaço com o outro.
      const [lista, insumos, recentes] = await Promise.all([
        listCreativeAssets(),
        listCreativeAssets({ types: SOURCE_ASSET_TYPES }),
        listRecentProjects(20),
      ]);
      setAssets(mesclarPorId(lista, insumos));
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
      .catch((e: any) => {
        if (cancelado) return;
        setCopyBank([]);
        // Engolir isto fazia "falha ao ler o histórico" e "este cliente
        // ainda não tem copy" produzirem exatamente a mesma tela vazia — e
        // a primeira some sozinha ao recarregar, a segunda não.
        toast({ title: 'Não consegui ler as copies deste cliente', description: e?.message });
      });
    return () => { cancelado = true; };
  }, [selectedClientId]);

  // Formato/resolução seguem o projeto ativo — troca de projeto troca o
  // padrão de geração junto, do mesmo jeito que o Studio atual já faz.
  useEffect(() => {
    if (!projectId) return;
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setRatio((p.selected_aspect_ratio as CreativeAspectRatio) || '9:16');
    setResolution((p.selected_resolution as CreativeResolution) || '4K');
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
        aspectRatio: '9:16',
        resolution: '4K',
        language: 'pt-BR',
        model: 'gemini-3.1-flash-image-preview',
        userId: userData.user?.id ?? null,
        clientId: selectedClientId,
      });
      setProjectId(id);
      setProjects((prev) => [{ id, title: 'Novo projeto', status: 'in_progress', selected_aspect_ratio: '9:16', selected_resolution: '4K', thumbnail_url: null, updated_at: new Date().toISOString() }, ...prev]);
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
    const avancados = toAssetFilters(filtrosAvancados);
    return filtro.types
      ? libraryAssets(doProjeto, { ...filtro, ...avancados, query })
      : visibleCanvasAssets(doProjeto, { ...avancados, query });
  }, [doProjeto, query, library, filtrosAvancados]);

  // Os formatos vêm do acervo em vista ANTES do corte por formato — senão a
  // lista encolheria para a própria escolha e não haveria como trocar.
  const formatosDisponiveis = useMemo(() => availableAspectRatios(doProjeto), [doProjeto]);

  /**
   * Insumo é do CLIENTE, não do projeto.
   *
   * A persona atravessa campanhas, e o mesmo vale para o logo da marca,
   * para a foto do produto e para a pasta de referências: são material de
   * trabalho do cliente, não produto de uma campanha.
   *
   * Só o avatar seguia essa regra, e as outras três derivavam de
   * `doProjeto`. O efeito aparecia exatamente uma vez por sessão e parecia
   * mágica: enquanto nenhuma arte tinha sido gerada, `projectId` era nulo e
   * o filtro não fazia nada; na PRIMEIRA geração `ensureProjectId` criava um
   * projeto novo e vazio, e a partir dali o menu de anexos só mostrava o que
   * tivesse nascido lá dentro — ou seja, nada. O usuário subia o mesmo logo
   * pela terceira vez.
   *
   * O canvas continua filtrado por projeto: o chip "Só este projeto" segue
   * significando o que sempre significou. O que mudou é de onde vêm os
   * insumos.
   */
  const referenceLibrary = useMemo(
    () => libraryAssets(assetsDoCliente, { types: ['reference'] }),
    [assetsDoCliente],
  );
  const logoLibrary = useMemo(
    () => libraryAssets(assetsDoCliente, { types: ['logo'] }),
    [assetsDoCliente],
  );
  const productLibrary = useMemo(
    () => libraryAssets(assetsDoCliente, { types: ['product'] }),
    [assetsDoCliente],
  );
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
      createGroup: createAssetGroup,
      directArt,
      analyzeReferences,
      recordUsage: (usageKey) => { void recordAiUsage(usageKey as AiUsageType); },
    };
    return createStudioAssetActions(deps);
  }, [ensureProjectId, selectedClientId]);

  // Cada gatilho tem a própria frase — um aviso genérico citando "Fator
  // Criativo" já disparou para ações que não têm nada a ver com ele. Os
  // avisos que sobraram são de ações em lote, que o backend de fato ainda
  // não faz.
  const avisarIndisponivel = useCallback((mensagem: string) => {
    toast({ title: 'Ainda não disponível', description: mensagem });
  }, []);

  const abrirVersaoAntiga = useCallback(() => navigate('/criativo-studio/v1'), [navigate]);

  // Trocar de cliente zera o projeto ativo. Sem isso, o canvas continuaria
  // preso a um projeto do cliente ANTERIOR, filtrado pelo cliente NOVO —
  // na prática, vazio, sem nada que explique por quê. Pousar em "todo o
  // acervo desse cliente" é o resultado previsível.
  const handleClientChange = useCallback((id: string | null) => {
    setSelectedClientId(id);
    setProjectId(null);
  }, []);

  /**
   * Apaga um insumo direto do menu de anexos.
   *
   * Mesma exclusão do card do canvas — `deleteCreativeAsset` + `removeAsset`
   * —, sem diálogo próprio: a confirmação acontece dentro do popover, com a
   * imagem à vista. O `AlertDialog` da página é modal e rouba o foco, o que
   * fecharia o menu a cada exclusão; apagar três referências viraria abrir o
   * menu três vezes.
   *
   * Erro sobe para quem chamou: quem mostra a mensagem é a coluna de
   * detalhe, ao lado da imagem que não foi apagada.
   */
  const apagarInsumo = useCallback(async (asset: CreativeAsset) => {
    await deleteCreativeAsset(asset.id);
    removeAsset(asset.id);
    toast({ title: 'Apagado do acervo' });
  }, [removeAsset]);

  const handleRemoveFilter = useCallback((id: string) => {
    if (id === 'cliente') { setSelectedClientId(null); setProjectId(null); return; }
    if (id === 'formato') { setFiltrosAvancados((f) => ({ ...f, aspectRatio: null })); return; }
    if (id === 'status') { setFiltrosAvancados((f) => ({ ...f, status: null })); return; }
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
      // Sem projeto de propósito: insumo é do cliente e atravessa
      // campanhas. Chamar `ensureProjectId` aqui criava um "Novo projeto"
      // vazio só para carimbar a linha — e o projeto novo acendia o chip
      // "Só este projeto", estreitando o canvas por causa de um upload.
      const asset = await createCreativeAsset({
        projectId: null, type: kind, url, thumbnailUrl: url,
        clientId: selectedClientId, status: 'ready',
      });
      upsertAsset(asset);
    } catch {
      // O anexo em si já aconteceu — só a reutilização futura falhou. Não
      // vale travar o fluxo nem avisar o usuário por isso.
    }
  }, [selectedClientId, upsertAsset]);

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

  /**
   * Gera as 5 variações direto, sem formulário.
   *
   * É o caminho padrão. A versão anterior abria um briefing e exigia a
   * descrição da oferta preenchida à mão antes de liberar o botão — pedágio
   * que contraria o que o Fator Criativo é: um gerador rápido de ângulos.
   * Agora a própria função deduz a oferta da arte, e o formulário virou o
   * caminho de exceção (`abrirFatorComBriefing`), para quando há prova real
   * a informar ou ângulo a fixar.
   */
  const rodarFator = useCallback(async (alvo: CreativeAsset, entrada?: FatorCriativoSubmit) => {
    if (busy) return;
    setBusy(true);
    try {
      const ratio = (alvo.aspectRatio as CreativeAspectRatio) || '9:16';
      toast({ title: 'Lendo a oferta e montando 5 teses…', description: 'A escrita estratégica leva alguns instantes.' });
      const saida = await generateFactorVariations({
        originalPrompt: alvo.prompt ?? '',
        copy: (alvo.metadata as any)?.copy ?? null,
        offerIntelligence: entrada?.offerIntelligence ?? null,
        mode: entrada?.mode ?? 'automatic',
        selectedAngles: entrada?.selectedAngles,
        aspect: ratio === '1:1' ? 'square' : 'story',
        aspectRatio: ratio,
        safeZoneBlock: buildSafeZoneBlock(ratio),
      });

      toast({ title: '5 variações planejadas', description: 'Gerando as artes…' });
      const artes = await actions.factorCriativo({
        base: alvo,
        variations: saida.variations,
        diagnosis: saida.originalDiagnosis,
        // Cada slot resolve sozinho no canvas, em vez de tudo aparecer no fim.
        onSlotDone: (asset) => upsertAsset(asset),
      });

      // `runGeneration` nunca rejeita — ela grava `failed` na linha. Sem
      // contar aqui, cinco cards vermelhos vinham acompanhados de um toast
      // verde dizendo que estava pronto.
      const prontas = artes.filter((a) => a.status === 'ready').length;
      if (prontas === 0) {
        toast({
          title: 'Nenhuma das 5 variações foi gerada',
          description: artes[0]?.errorMessage ?? undefined,
          variant: 'destructive',
        });
      } else {
        toast({
          title: prontas === artes.length ? 'Fator Criativo pronto' : `${prontas} de ${artes.length} variações prontas`,
          description: prontas === artes.length ? undefined : 'As que falharam têm "Tentar novamente" no card.',
        });
      }
    } catch (e: any) {
      toast({ title: 'Erro no Fator Criativo', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      void carregar();
    }
  }, [busy, actions, upsertAsset, carregar]);

  // Caminho de exceção: abre o briefing e já dispara a leitura da oferta,
  // para o usuário revisar em vez de encarar um formulário em branco.
  const abrirFatorComBriefing = useCallback(async (alvo: CreativeAsset) => {
    setFatorBase(alvo);
    setFatorBriefing(null);
    setFatorErroAnalise(null);
    setFatorAnalisando(true);
    try {
      const { offerIntelligence } = await analyzeOffer({
        originalPrompt: alvo.prompt ?? '',
        copy: (alvo.metadata as any)?.copy ?? null,
        businessContext: alvo.prompt ?? null,
        clientName,
        language: 'pt-BR',
      });
      // Descarta resposta que não é mais da arte em foco: sem isso, abrir o
      // Fator em A, fechar e abrir em B fazia o briefing de A aparecer sobre
      // a arte B — errado e silencioso.
      setFatorBase((atual) => {
        if (atual?.id === alvo.id) setFatorBriefing(offerIntelligence);
        return atual;
      });
    } catch (e: any) {
      setFatorBase((atual) => {
        if (atual?.id === alvo.id) setFatorErroAnalise(e?.message ?? 'erro desconhecido');
        return atual;
      });
    } finally {
      setFatorAnalisando(false);
    }
  }, [clientName]);

  const handleFatorSubmit = useCallback(async (entrada: FatorCriativoSubmit) => {
    const alvo = fatorBase;
    if (!alvo) return;
    setFatorBase(null); // fecha o diálogo: o progresso vive no canvas
    await rodarFator(alvo, entrada);
  }, [fatorBase, rodarFator]);

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

        const resultado = await actions.generate(texto, ratio, {
          resolution,
          modelId,
          copy: copyAnexada?.value ?? null,
          logoImageUrl: logo?.value ?? null,
          productImageUrls: imagens,
          avatarImageUrls: avatares,
          clientName,
          onStage: setEstagio,
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
      setEstagio(null);
      setCommand('');
    }
  }, [command, hasCopy, busy, attachments, ratio, resolution, modelId, actions, assets, upsertAsset, avisarIndisponivel, clientName, selectedClientId]);

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
      void rodarFator(alvo);
      return;
    }

    if (acao === 'factor-briefing') {
      void abrirFatorComBriefing(alvo);
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

    if (acao === 'save-to-client-intelligence') {
      if (!alvo.clientId) {
        toast({ title: 'Esta arte não está ligada a um cliente', variant: 'destructive' });
        return;
      }
      try {
        upsertAsset(await updateCreativeAsset(alvo.id, { isClientIntelligence: true }));
        toast({ title: 'Salva na inteligência do cliente', description: 'Vira referência aprovada da marca.' });
      } catch (e: any) {
        toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
      }
      return;
    }

    if (acao === 'save-as-template') {
      // Só abre o diálogo de nome. Um template sem nome vira uma lista de
      // "template" indistinguível — e a biblioteca já mostra a miniatura,
      // então o nome é a única coisa que diferencia um do outro.
      setTemplateAlvo(alvo);
      setTemplateNome(alvo.filename ?? '');
      return;
    }

    if (acao === 'delete') {
      // Só abre a confirmação — apagar de verdade só acontece no clique
      // de "Apagar" dentro do diálogo.
      setDeleteTarget(alvo);
      setDeleteDialogOpen(true);
      return;
    }

    // Rede para uma ação futura que chegue sem tratamento. Hoje ela é
    // inalcançável, e um teste afirma isso — ver `handleAssetAction` em
    // CriativoStudioV2Page.test.tsx.
    avisarIndisponivel('Esta ação ainda não está disponível nesta versão.');
  }, [actions, upsertAsset, avisarIndisponivel, rodarFator, abrirFatorComBriefing, handleAttach]);

  /**
   * Guarda a arte como template reutilizável.
   *
   * O template é um asset como outro qualquer, com `type: 'template'` — é o
   * que faz a biblioteca "Templates" da ilha já contá-lo e filtrá-lo sem
   * nenhuma fiação nova. Sem projeto, pela mesma regra do insumo: template
   * é da marca e atravessa campanhas.
   *
   * O `metadata` carrega o que torna um template reutilizável: o prompt que
   * produziu a arte, e o sistema visual e a direção que ela recebeu. É daí
   * que uma geração futura consegue herdar o layout sem herdar a copy.
   */
  const salvarComoTemplate = useCallback(async () => {
    const alvo = templateAlvo;
    const nome = templateNome.trim();
    if (!alvo || !nome || salvandoTemplate) return;
    setSalvandoTemplate(true);
    try {
      const template = await createCreativeAsset({
        projectId: null,
        clientId: alvo.clientId,
        type: 'template',
        status: 'ready',
        url: alvo.url,
        thumbnailUrl: alvo.thumbnailUrl ?? alvo.url,
        parentAssetId: alvo.id,
        aspectRatio: alvo.aspectRatio,
        filename: nome,
        prompt: alvo.prompt,
        metadata: {
          sourcePrompt: alvo.prompt,
          designSystemDoc: (alvo.metadata as any)?.designSystemDoc ?? null,
          artDirection: (alvo.metadata as any)?.artDirection ?? null,
          antiPadroes: (alvo.metadata as any)?.antiPadroes ?? null,
        },
      });
      upsertAsset(template);
      setTemplateAlvo(null);
      toast({ title: 'Template salvo', description: `"${nome}" está na biblioteca de templates.` });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar o template', description: e?.message, variant: 'destructive' });
    } finally {
      setSalvandoTemplate(false);
    }
  }, [templateAlvo, templateNome, salvandoTemplate, upsertAsset]);

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
      <StudioVersionBanner onOpenLegacy={abrirVersaoAntiga} />

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
          ...advancedFilterChips(filtrosAvancados),
        ]}
        onRemoveFilter={handleRemoveFilter}
        onClearFilters={() => {
          setQuery(''); setLibrary('all'); setProjectId(null); setSelectedClientId(null);
          setFiltrosAvancados(SEM_FILTROS_AVANCADOS);
        }}
        advancedFilters={filtrosAvancados}
        onAdvancedFiltersChange={setFiltrosAvancados}
        availableRatios={formatosDisponiveis}
        loading={loading}
        error={error}
        command={command}
        onCommandChange={setCommand}
        onSubmitCommand={handleSubmitCommand}
        busy={busy}
        stage={estagio}
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
        onDeleteAsset={apagarInsumo}
        avatarLibrary={avatarLibrary}
        onGenerateAvatar={handleGenerateAvatar}
        onAssetAction={handleAssetAction}
      />

      <FatorCriativoDialog
        open={!!fatorBase}
        briefing={fatorBriefing}
        analisando={fatorAnalisando}
        erroAnalise={fatorErroAnalise}
        busy={busy}
        onClose={() => setFatorBase(null)}
        onSubmit={handleFatorSubmit}
      />

      <AlertDialog open={!!templateAlvo} onOpenChange={(open) => { if (!open) setTemplateAlvo(null); }}>
        <AlertDialogContent className="glass border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar como template</AlertDialogTitle>
            <AlertDialogDescription>
              O template guarda o layout e o sistema visual desta arte — não a copy dela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            autoFocus
            value={templateNome}
            onChange={(e) => setTemplateNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvarComoTemplate(); }}
            placeholder="Ex.: editorial com faixa inferior"
            aria-label="Nome do template"
            className="glass-input h-9 w-full rounded-[var(--wavy-radius-control)] px-3 text-[13px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              disabled={!templateNome.trim() || salvandoTemplate}
              onClick={(e) => { e.preventDefault(); void salvarComoTemplate(); }}
            >
              {salvandoTemplate ? 'Salvando…' : 'Salvar template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
/**
 * Junta as duas leituras do acervo sem duplicar linha.
 *
 * As consultas se sobrepõem de propósito: um insumo recente aparece nas
 * duas. A primeira lista manda na ordem, porque é ela que define o que o
 * canvas desenha de cima para baixo.
 */
function mesclarPorId(...listas: CreativeAsset[][]): CreativeAsset[] {
  const vistos = new Set<string>();
  const saida: CreativeAsset[] = [];
  for (const lista of listas) {
    for (const asset of lista) {
      if (vistos.has(asset.id)) continue;
      vistos.add(asset.id);
      saida.push(asset);
    }
  }
  return saida;
}

function filtroDaBiblioteca(id: StudioLibraryId): { types?: CreativeAsset['type'][] } {
  switch (id) {
    case 'generations': return { types: ['original', 'factor', 'edited', 'resize', 'imported'] };
    case 'references': return { types: ['reference'] };
    case 'products': return { types: ['product'] };
    case 'templates': return { types: ['template'] };
    default: return {};
  }
}
