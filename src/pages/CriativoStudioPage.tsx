import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { StepIndicator } from '@/components/criativo/StepIndicator';
import { StyleGalleryDialog } from '@/components/criativo/StyleGalleryDialog';
import { cn } from '@/lib/utils';
import { recordAiUsage } from '@/lib/aiUsageTracker';
import {
  Sparkles,
  Wand2,
  Loader2,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Palette,
  Check,
  ChevronDown,
  ZoomIn,
  X,
  Globe,
  Pencil,
  Trash2,
  Send,
  User,
  Bot,
  MessageSquare,
  Box,
  Layers,
  Settings,
  History,
  Users,
  MoreHorizontal,
  PanelRightClose,
  Search,
} from 'lucide-react';

interface VisualAnalysis {
  composicao: { formato: string; estrutura: string; hierarquia: string; silencio: string };
  fotografia: { tipo: string; luz: string; tratamento: string; integracao: string };
  paleta: { dominante: string; secundaria: string; acento: string; saturacao: string; hexes: string[] };
  tipografia: { familiaA: string; familiaB: string; contraste: string; alinhamento: string };
  camadas: string[];
  hierarquiaVisual: string;
  espaco: string;
  mood: { adjetivos: string[]; referencias: string[]; evita: string[] };
  designSystemDoc: string;
  antiPadroes?: string[];
}

interface CopyResult {
  angulo?: string;
  label: string;
  titulo: string;
  subtitulo: string;
  dados: string;
  cta: string;
  avaliacao: { clareza: string; hierarquia: string; brevidade: string; gatilho: string; tom: string };
  justificativa: string;
}

type CurrentStage =
  | 'initial'
  | 'references'
  | 'reference-review'
  | 'copy'
  | 'assets'
  | 'generation-summary'
  | 'result'
  | 'factor'
  | 'editing';

type RightPanelMode =
  | 'none'
  | 'upload-references'
  | 'reference-library'
  | 'design-system'
  | 'paste-copy'
  | 'copy-suggestions'
  | 'read-url'
  | 'assets'
  | 'avatar-library'
  | 'generation-summary'
  | 'generated-result'
  | 'creative-factor'
  | 'edit-image'
  | 'project-history'
  | 'template-library'
  | 'template-detail'
  | 'save-template'
  | 'template-applied';

type ConversationAction = {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
};

type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  actions?: ConversationAction[];
};

type CreativeProjectSummary = {
  id: string;
  title: string;
  status: string;
  selected_aspect_ratio: string | null;
  selected_resolution: string | null;
  thumbnail_url: string | null;
  updated_at: string;
};

type CreativeAssetSummary = {
  id: string;
  url: string;
  thumbnail_url: string | null;
  type: string;
  filename: string | null;
  created_at: string;
};

export type CreativeTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  niche: string | null;
  status: string;
  visibility: string;
  aspect_ratio: string | null;
  preferred_resolution: string | null;
  preview_url: string | null;
  design_system_doc: string | null;
  base_prompt: string | null;
  negative_prompt: string | null;
  copy_structure: any;
  layout_structure: any;
  style_metadata: any;
  tags: string[] | null;
  usage_count: number;
  source_project_id?: string | null;
  source_output_id?: string | null;
  is_builtin: boolean;
};

type TemplateSource = {
  sourceProjectId?: string | null;
  sourceOutputId?: string | null;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  copy?: any;
  designSystemDoc?: string;
  negativePrompt?: string;
  businessContext?: string;
  factorVariation?: any;
  editFeedback?: string;
};

type CreativeAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '4:3' | '3:4' | '2:3' | '3:2' | '21:9';
type CreativeResolution = '1K' | '2K' | '4K';
type BackendAspect = 'story' | 'square';

const ASPECT_CONFIG: Record<CreativeAspectRatio, {
  label: string;
  title: string;
  promptDims: string;
  safeZone: string;
  backendAspect: BackendAspect;
  recommendedUse: string;
}> = {
  '1:1': {
    label: '1:1',
    title: 'Quadrado',
    promptDims: '1:1 perfect square Instagram post, 1080x1080px',
    safeZone: 'Top safe zone: keep 120px from the top edge clear of important text. Bottom safe zone: keep 120px from the bottom edge clear.',
    backendAspect: 'square',
    recommendedUse: 'Feed, carrossel e posts quadrados',
  },
  '4:5': {
    label: '4:5',
    title: 'Feed vertical',
    promptDims: '4:5 vertical Instagram feed advertisement, optimized for Meta Ads feed placement',
    safeZone: 'Keep generous margins on all edges. Avoid placing important text too close to the top or bottom edges.',
    backendAspect: 'story',
    recommendedUse: 'Feed vertical com maior ocupação de tela',
  },
  '9:16': {
    label: '9:16',
    title: 'Story/Reels',
    promptDims: '9:16 vertical Instagram Story, 1080x1920px',
    safeZone: 'Top safe zone: keep 280px from the very top edge completely free of any text, graphic or important element. Bottom safe zone: keep 280px from the very bottom edge completely free. This protects against Instagram UI overlays.',
    backendAspect: 'story',
    recommendedUse: 'Stories, Reels e tela cheia',
  },
  '16:9': {
    label: '16:9',
    title: 'Horizontal',
    promptDims: '16:9 horizontal advertising image',
    safeZone: 'Keep important text and subjects away from extreme left and right edges. Maintain a centered safe composition area.',
    backendAspect: 'story',
    recommendedUse: 'YouTube, banners e apresentações',
  },
  '4:3': {
    label: '4:3',
    title: 'Horizontal clássico',
    promptDims: '4:3 horizontal advertising image',
    safeZone: 'Keep important text within a centered safe composition area. Avoid text too close to all edges.',
    backendAspect: 'story',
    recommendedUse: 'Criativos horizontais compactos',
  },
  '3:4': {
    label: '3:4',
    title: 'Vertical clássico',
    promptDims: '3:4 vertical advertising image',
    safeZone: 'Keep important text within a centered safe composition area. Maintain generous top and bottom margins.',
    backendAspect: 'story',
    recommendedUse: 'Criativos verticais',
  },
  '2:3': {
    label: '2:3',
    title: 'Poster vertical',
    promptDims: '2:3 vertical poster-style advertising image',
    safeZone: 'Keep generous margins on top and bottom. Avoid placing CTA too close to the lower edge.',
    backendAspect: 'story',
    recommendedUse: 'Poster e anúncio vertical',
  },
  '3:2': {
    label: '3:2',
    title: 'Foto horizontal',
    promptDims: '3:2 horizontal advertising image',
    safeZone: 'Keep important text away from the extreme edges. Maintain visual weight near the center.',
    backendAspect: 'story',
    recommendedUse: 'Imagem horizontal editorial',
  },
  '21:9': {
    label: '21:9',
    title: 'Cinemático',
    promptDims: '21:9 ultra-wide cinematic advertising image',
    safeZone: 'Keep main subjects and text in the central safe area. Avoid edge-critical content.',
    backendAspect: 'story',
    recommendedUse: 'Banner cinematográfico',
  },
};

const RESOLUTION_CONFIG: Record<CreativeResolution, {
  label: string;
  promptQuality: string;
}> = {
  '1K': {
    label: '1K',
    promptQuality: 'standard high-quality digital advertising image',
  },
  '2K': {
    label: '2K',
    promptQuality: 'high-resolution polished advertising image with crisp typography and clean details',
  },
  '4K': {
    label: '4K',
    promptQuality: 'ultra high-resolution 4K advertising image, crisp details, sharp typography, premium finish',
  },
};

function getBackendAspectFromSelectedRatio(ratio: CreativeAspectRatio): BackendAspect {
  return ASPECT_CONFIG[ratio]?.backendAspect || 'story';
}

function getLegacyStepFromStage(stage: CurrentStage) {
  if (['references', 'reference-review'].includes(stage)) return 0;
  if (stage === 'copy') return 1;
  if (stage === 'assets') return 2;
  return 3;
}

type GeminiModel = 'gemini-2.5-flash-image' | 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview';
const MODEL_OPTIONS: { id: GeminiModel; name: string; desc: string; usage: 'image-gemini-flash' | 'image-gemini-flash-2' | 'image-gemini-pro' }[] = [
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana', desc: 'Rápido e barato', usage: 'image-gemini-flash' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2', desc: 'Rápido com qualidade Pro (recomendado)', usage: 'image-gemini-flash-2' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', desc: 'Máxima qualidade, mais lento', usage: 'image-gemini-pro' },
];

const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (BR)' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
] as const;

export default function CriativoStudioPage() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(0);
  const [currentStage, setCurrentStage] = useState<CurrentStage>('initial');
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('none');
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] = useState<CreativeResolution>('4K');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<CreativeAspectRatio>('4:5');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [projectHistory, setProjectHistory] = useState<CreativeProjectSummary[]>([]);
  const [projectHistoryLoading, setProjectHistoryLoading] = useState(false);
  const [referenceAssets, setReferenceAssets] = useState<CreativeAssetSummary[]>([]);
  const [selectedReferenceAssetIds, setSelectedReferenceAssetIds] = useState<string[]>([]);
  const [referenceLibraryLoading, setReferenceLibraryLoading] = useState(false);
  const [referenceClientFilter, setReferenceClientFilter] = useState('all');
  const [referenceClients, setReferenceClients] = useState<{id: string; name: string}[]>([]);
  const [uploadClientId, setUploadClientId] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingClientLogo, setLoadingClientLogo] = useState(false);
  // Invalida respostas de applyClientLogo que chegam depois de uma troca de
  // cliente mais recente (evita que uma busca lenta do cliente A sobrescreva
  // o logo do cliente B já selecionado).
  const clientLogoRequestIdRef = useRef(0);
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [templateAspectFilter, setTemplateAspectFilter] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CreativeTemplate | null>(null);
  // Template sendo apenas VISUALIZADO no painel de detalhes (não necessariamente aplicado).
  // Mantido separado de selectedTemplate para nunca afetar buildFinalPrompt/o pill do composer
  // sem uma ação explícita de "Usar este template/estilo".
  const [previewTemplate, setPreviewTemplate] = useState<CreativeTemplate | null>(null);
  const [builtinTemplates, setBuiltinTemplates] = useState<CreativeTemplate[]>([]);
  const [styleGalleryOpen, setStyleGalleryOpen] = useState(false);
  const [templateSource, setTemplateSource] = useState<TemplateSource | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'Oferta',
    niche: '',
    tags: '',
    visibility: 'private',
    aspectRatio: '4:5',
    preferredResolution: '4K',
    designSystemDoc: '',
    basePrompt: '',
    negativePrompt: '',
  });

  // Step 1
  const [refImages, setRefImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [editedDoc, setEditedDoc] = useState('');

  // Step 2
  const [rawCopy, setRawCopy] = useState('');
  const [improving, setImproving] = useState(false);
  const [copyVariations, setCopyVariations] = useState<CopyResult[]>([]);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<number | null>(null);
  const [copyApproved, setCopyApproved] = useState(false);
  const [copySource, setCopySource] = useState<'original' | 'ai'>('ai');
  const [suggestedRawCopy, setSuggestedRawCopy] = useState('');
  const [suggestingCopy, setSuggestingCopy] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [urlReading, setUrlReading] = useState(false);
  const [urlContext, setUrlContext] = useState<{ title: string; description: string; text: string } | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Step 3
  const [logoImage, setLogoImage] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [preserveFaces, setPreserveFaces] = useState(true);

  // Step 4
  const [model, setModel] = useState<GeminiModel>('gemini-3.1-flash-image-preview');
  const [language, setLanguage] = useState<string>('pt-BR');
  const [businessContext, setBusinessContext] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [squareImage, setSquareImage] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Fator Criativo
  type FactorVariation = {
    eixo: string;
    nome: string;
    estrategia: { mudanca: string; paraQuem: string };
    copy: { label: string; titulo: string; subtitulo: string; dados: string; cta: string };
    descricaoVisual: { hook: string; composicao: string; tom: string; diferenca: string };
    promptCompleto: string;
  };
  const [factorVariations, setFactorVariations] = useState<FactorVariation[] | null>(null);
  const [factorImages, setFactorImages] = useState<(string | null)[]>([]);
  const [factorErrors, setFactorErrors] = useState<(string | null)[]>([]);
  const [factorLoading, setFactorLoading] = useState(false);
  const [factorProgress, setFactorProgress] = useState(0);
  const [factorSquareImages, setFactorSquareImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [factorSquareLoading, setFactorSquareLoading] = useState<boolean[]>([false, false, false, false, false]);
  const [mainSquareLoading, setMainSquareLoading] = useState(false);
  const [selectedEditKey, setSelectedEditKey] = useState<string>('main:story');
  const [selectedEditTarget, setSelectedEditTarget] = useState<{
    key: string;
    image: string;
    aspect: 'story' | 'square';
    prompt: string;
    label: string;
  } | null>(null);

  // Edições por imagem
  type EditedVersion = { url: string; feedback: string };
  const [editedVersions, setEditedVersions] = useState<Record<string, EditedVersion[]>>({});
  const [editPanelKey, setEditPanelKey] = useState<string | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const [editLoadingKey, setEditLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate('/dashboard');
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (styleGalleryOpen && isAdmin && builtinTemplates.length === 0) fetchBuiltinTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleGalleryOpen, isAdmin]);

  useEffect(() => {
    // Lista de clientes precisa estar pronta já na tela inicial (seletor de cliente).
    if (isAdmin) fetchClientsForFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    setStep(getLegacyStepFromStage(currentStage));
  }, [currentStage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversationMessages.length, analyzing, improving, urlReading, contextLoading, generating, factorLoading, editLoadingKey]);

  const completed = [!!analysis, copyApproved, true, !!storyImage];
  const selectedCopy: CopyResult | null =
    selectedVariationIdx !== null ? copyVariations[selectedVariationIdx] || null : null;
  const getSelectedAspectConfig = () => ASPECT_CONFIG[selectedAspectRatio] || ASPECT_CONFIG['4:5'];
  const getSelectedResolutionConfig = () => RESOLUTION_CONFIG[selectedResolution] || RESOLUTION_CONFIG['4K'];
  const storageClient = (supabase as any).storage;
  const db = supabase as any;

  const getCurrentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  };

  const buildProjectTitle = () => {
    const base = projectTitle.trim() || initialPrompt.trim() || 'Novo criativo';
    return base.slice(0, 60);
  };

  const dataUrlToBlob = async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const uploadDataUrlToStorage = async ({
    dataUrl,
    path,
    bucket = 'creative-assets',
  }: {
    dataUrl: string;
    path: string;
    bucket?: string;
  }) => {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    const blob = await dataUrlToBlob(dataUrl);
    const { error } = await storageClient.from(bucket).upload(path, blob, {
      cacheControl: '3600',
      contentType: blob.type || 'image/png',
      upsert: true,
    });
    if (error) throw error;
    const { data } = storageClient.from(bucket).getPublicUrl(path);
    return data.publicUrl as string;
  };

  const uploadImageFileToStorage = async ({
    file,
    path,
    bucket = 'creative-assets',
  }: {
    file: File;
    path: string;
    bucket?: string;
  }) => {
    const { error } = await storageClient.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });
    if (error) throw error;
    const { data } = storageClient.from(bucket).getPublicUrl(path);
    return data.publicUrl as string;
  };

  const createCreativeProject = async () => {
    if (currentProjectId) return currentProjectId;
    const userId = await getCurrentUserId();
    const title = buildProjectTitle();
    const { data, error } = await db
      .from('creative_projects')
      .insert({
        title,
        initial_prompt: initialPrompt,
        current_stage: currentStage,
        selected_aspect_ratio: selectedAspectRatio,
        selected_resolution: selectedResolution,
        language,
        model,
        status: 'in_progress',
        user_id: userId,
        created_by: userId,
        client_id: selectedClientId,
      })
      .select('id,title')
      .single();
    if (error) throw error;
    setCurrentProjectId(data.id);
    setProjectTitle(data.title || title);
    return data.id as string;
  };

  const buildProjectStateSnapshot = () => ({
    currentStage,
    rightPanelMode,
    conversationMessages,
    initialPrompt,
    selectedAspectRatio,
    selectedResolution,
    step,
    refImages,
    analysis,
    editedDoc,
    rawCopy,
    copyVariations,
    selectedVariationIdx,
    copyApproved,
    copySource,
    suggestedRawCopy,
    productUrl,
    urlContext,
    logoImage,
    productImages,
    preserveFaces,
    model,
    language,
    businessContext,
    negativePrompt,
    storyImage,
    squareImage,
    factorVariations,
    factorImages,
    factorErrors,
    factorSquareImages,
    editedVersions,
    projectTitle: buildProjectTitle(),
    selectedTemplateId,
    selectedTemplate,
    selectedClientId,
  });

  const saveProjectState = async (options?: { silent?: boolean }) => {
    if (!initialPrompt.trim() && currentStage === 'initial') return;
    try {
      setSavingProject(true);
      const projectId = currentProjectId || await createCreativeProject();
      const snapshot = buildProjectStateSnapshot();
      await db
        .from('creative_project_state')
        .upsert({ project_id: projectId, state_json: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'project_id' });
      // Se o upload pro Storage falhou, storyImage/squareImage podem estar como
      // data: URI (base64 gigante) — nunca usar isso como thumbnail_url, que é
      // lido em massa na lista do histórico. Cada candidato é checado
      // independente (não para no primeiro truthy).
      const thumb = [storyImage, squareImage].find((u) => u && !u.startsWith('data:')) || null;
      await db
        .from('creative_projects')
        .update({
          title: buildProjectTitle(),
          initial_prompt: initialPrompt,
          current_stage: currentStage,
          selected_aspect_ratio: selectedAspectRatio,
          selected_resolution: selectedResolution,
          language,
          model,
          thumbnail_url: thumb,
          status: storyImage || squareImage ? 'generated' : 'in_progress',
          client_id: selectedClientId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      const savedAt = new Date().toISOString();
      setLastSavedAt(savedAt);
      if (!options?.silent) toast({ title: 'Projeto salvo' });
    } catch (e: any) {
      if (!options?.silent) {
        toast({
          title: 'Erro ao salvar projeto',
          description: e?.message || 'Não foi possível salvar.',
          variant: 'destructive',
        });
      }
    } finally {
      setSavingProject(false);
    }
  };

  const restoreProjectState = (state: any) => {
    setCurrentStage(state.currentStage || 'initial');
    setRightPanelMode(state.rightPanelMode || 'none');
    setConversationMessages(state.conversationMessages || []);
    setInitialPrompt(state.initialPrompt || '');
    setSelectedAspectRatio((state.selectedAspectRatio || '4:5') as CreativeAspectRatio);
    setSelectedResolution((state.selectedResolution || '4K') as CreativeResolution);
    setRefImages(state.refImages || []);
    setAnalysis(state.analysis || null);
    setEditedDoc(state.editedDoc || '');
    setRawCopy(state.rawCopy || '');
    setCopyVariations(state.copyVariations || []);
    setSelectedVariationIdx(state.selectedVariationIdx ?? null);
    setCopyApproved(!!state.copyApproved);
    setCopySource(state.copySource || 'ai');
    setSuggestedRawCopy(state.suggestedRawCopy || '');
    setProductUrl(state.productUrl || '');
    setUrlContext(state.urlContext || null);
    setLogoImage(state.logoImage || []);
    setProductImages(state.productImages || []);
    setPreserveFaces(state.preserveFaces ?? true);
    setBusinessContext(state.businessContext || '');
    setNegativePrompt(state.negativePrompt || '');
    setStoryImage(state.storyImage || null);
    setSquareImage(state.squareImage || null);
    setFactorVariations(state.factorVariations || null);
    setFactorImages(state.factorImages || []);
    setFactorErrors(state.factorErrors || []);
    setFactorSquareImages(state.factorSquareImages || [null, null, null, null, null]);
    setEditedVersions(state.editedVersions || {});
    setProjectTitle(state.projectTitle || state.initialPrompt?.slice(0, 60) || 'Novo criativo');
    setSelectedTemplateId(state.selectedTemplateId || null);
    setSelectedTemplate(state.selectedTemplate || null);
    setSelectedClientId(state.selectedClientId || null);
  };

  const loadCreativeProject = async (projectId: string) => {
    setLoadingProject(true);
    try {
      const { data: project, error: projectError } = await db.from('creative_projects').select('*').eq('id', projectId).single();
      if (projectError) throw projectError;
      const { data: stateRow, error: stateError } = await db.from('creative_project_state').select('state_json').eq('project_id', projectId).single();
      if (stateError && stateError.code !== 'PGRST116') throw stateError;
      setCurrentProjectId(projectId);
      setProjectTitle(project?.title || 'Novo criativo');
      restoreProjectState(stateRow?.state_json || {});
      // client_id da coluna própria é a fonte de verdade (projetos antigos podem
      // não ter selectedClientId no state_json).
      setSelectedClientId(project?.client_id || null);
      setLastSavedAt(project?.updated_at || null);
      toast({ title: 'Projeto carregado' });
    } catch (e: any) {
      toast({ title: 'Erro ao carregar projeto', description: e?.message || 'Não foi possível abrir.', variant: 'destructive' });
    } finally {
      setLoadingProject(false);
    }
  };

  const fetchProjectHistory = async () => {
    setProjectHistoryLoading(true);
    try {
      const { data, error } = await db
        .from('creative_projects')
        .select('id,title,status,selected_aspect_ratio,selected_resolution,thumbnail_url,updated_at')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setProjectHistory(data || []);
    } catch (e: any) {
      toast({ title: 'Erro ao buscar histórico', description: e?.message || 'Não foi possível listar projetos.', variant: 'destructive' });
    } finally {
      setProjectHistoryLoading(false);
    }
  };

  const archiveCreativeProject = async (projectId: string) => {
    try {
      const { error } = await db.from('creative_projects').update({ status: 'archived' }).eq('id', projectId);
      if (error) throw error;
      await fetchProjectHistory();
      toast({ title: 'Projeto arquivado' });
    } catch (e: any) {
      toast({ title: 'Erro ao arquivar', description: e?.message || 'Não foi possível arquivar.', variant: 'destructive' });
    }
  };

  const duplicateCreativeProject = async (projectId: string) => {
    try {
      const { data: project, error: projectError } = await db.from('creative_projects').select('*').eq('id', projectId).single();
      if (projectError) throw projectError;
      const { data: stateRow } = await db.from('creative_project_state').select('state_json').eq('project_id', projectId).single();
      const userId = await getCurrentUserId();
      const { data: duplicated, error: duplicateError } = await db
        .from('creative_projects')
        .insert({
          title: `${project.title} cópia`,
          initial_prompt: project.initial_prompt,
          current_stage: project.current_stage,
          selected_aspect_ratio: project.selected_aspect_ratio,
          selected_resolution: project.selected_resolution,
          language: project.language,
          model: project.model,
          thumbnail_url: project.thumbnail_url,
          status: 'in_progress',
          user_id: userId,
          created_by: userId,
          client_id: project.client_id,
        })
        .select('id')
        .single();
      if (duplicateError) throw duplicateError;
      if (stateRow?.state_json) {
        await db.from('creative_project_state').insert({ project_id: duplicated.id, state_json: stateRow.state_json });
      }
      await fetchProjectHistory();
      toast({ title: 'Projeto duplicado' });
    } catch (e: any) {
      toast({ title: 'Erro ao duplicar', description: e?.message || 'Não foi possível duplicar.', variant: 'destructive' });
    }
  };

  const fetchReferenceLibrary = async (clientId?: string) => {
    setReferenceLibraryLoading(true);
    try {
      let query = db
        .from('creative_assets')
        .select('id,url,thumbnail_url,type,filename,created_at,client_id')
        .eq('type', 'reference')
        .order('created_at', { ascending: false })
        .limit(60);
      if (clientId && clientId !== 'all') query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      setReferenceAssets(data || []);
    } catch (e: any) {
      toast({ title: 'Erro ao buscar referências', description: e?.message || 'Não foi possível listar a base.', variant: 'destructive' });
    } finally {
      setReferenceLibraryLoading(false);
    }
  };

  const fetchClientsForFilter = async () => {
    try {
      const { data, error } = await db.from('clients').select('id,name').order('name', { ascending: true });
      if (error) throw error;
      setReferenceClients(data || []);
    } catch { /* silently ignore — filter just won't have client options */ }
  };

  // Reaproveita creative_assets (type='logo', client_id=X) como "logo salvo do
  // cliente" — sem precisar de coluna nova em clients. Sempre pega o mais
  // recente enviado para aquele cliente.
  const applyClientLogo = async (clientId: string) => {
    const requestId = ++clientLogoRequestIdRef.current;
    setLoadingClientLogo(true);
    try {
      const { data, error } = await db
        .from('creative_assets')
        .select('url')
        .eq('type', 'logo')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (requestId !== clientLogoRequestIdRef.current) return; // usuário já trocou de cliente de novo
      if (error) throw error;
      if (data?.url) {
        setLogoImage([data.url]);
        toast({ title: 'Logo do cliente carregado', description: 'Não precisa enviar de novo.' });
      }
      // Sem logo salvo para esse cliente: não mexe no que já está no dropzone
      // (pode ser um upload manual feito nesta mesma sessão).
    } catch (e: any) {
      if (requestId === clientLogoRequestIdRef.current) {
        toast({ title: 'Erro ao buscar logo do cliente', description: e?.message, variant: 'destructive' });
      }
    } finally {
      if (requestId === clientLogoRequestIdRef.current) setLoadingClientLogo(false);
    }
  };

  const deleteReferenceAsset = async (assetId: string) => {
    setReferenceAssets((prev) => prev.filter((a) => a.id !== assetId));
    try {
      const { error } = await db.from('creative_assets').delete().eq('id', assetId);
      if (error) throw error;
    } catch (e: any) {
      toast({ title: 'Erro ao excluir referência', description: e?.message, variant: 'destructive' });
      fetchReferenceLibrary(referenceClientFilter);
    }
  };

  const saveAssetRecord = async ({
    type,
    url,
    metadata = {},
    filename,
    clientId,
  }: {
    type: string;
    url: string;
    metadata?: Record<string, any>;
    filename?: string;
    clientId?: string;
  }) => {
    const projectId = currentProjectId || await createCreativeProject();
    const userId = await getCurrentUserId();
    const { data, error } = await db
      .from('creative_assets')
      .insert({
        project_id: projectId,
        type,
        url,
        thumbnail_url: url,
        filename,
        metadata,
        created_by: userId,
        client_id: clientId || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  };

  const persistImageAsset = async ({
    imageUrl,
    folder,
    type,
    metadata = {},
    filename,
    clientId,
  }: {
    imageUrl: string;
    folder: string;
    type: string;
    metadata?: Record<string, any>;
    filename: string;
    clientId?: string;
  }) => {
    try {
      const projectId = currentProjectId || await createCreativeProject();
      const userId = await getCurrentUserId();
      const path = `${userId || 'admin'}/${projectId}/${folder}/${filename}`;
      const url = await uploadDataUrlToStorage({ dataUrl: imageUrl, path });
      const assetId = await saveAssetRecord({ type, url, metadata, filename, clientId });
      return { url, assetId };
    } catch (e: any) {
      toast({ title: 'Aviso: imagem não foi salva no Storage', description: e?.message || 'O fluxo continua normalmente.' });
      return { url: imageUrl, assetId: null };
    }
  };

  const saveCreativeOutput = async ({
    type,
    imageUrl,
    prompt,
    metadata = {},
    assetId,
    aspectRatio,
  }: {
    type: 'main' | 'square' | 'factor' | 'edited';
    imageUrl: string;
    prompt?: string;
    metadata?: Record<string, any>;
    assetId?: string | null;
    aspectRatio?: string;
  }) => {
    try {
      const projectId = currentProjectId || await createCreativeProject();
      await db.from('creative_outputs').insert({
        project_id: projectId,
        asset_id: assetId || null,
        type,
        aspect_ratio: aspectRatio || selectedAspectRatio,
        resolution: selectedResolution,
        image_url: imageUrl,
        prompt,
        metadata,
      });
    } catch (e: any) {
      toast({ title: 'Aviso: output não foi registrado', description: e?.message || 'A imagem foi mantida na tela.' });
    }
  };

  const saveCopyVariationRecord = async (variation: Partial<CopyResult> & { rawCopy?: string }, source: 'original' | 'ai' | 'factor', selected = false) => {
    try {
      const projectId = currentProjectId || await createCreativeProject();
      if (selected) {
        await db.from('creative_copy_variations').update({ selected: false }).eq('project_id', projectId);
      }
      await db.from('creative_copy_variations').insert({
        project_id: projectId,
        source,
        angle: variation.angulo || null,
        label: variation.label || null,
        titulo: variation.titulo || variation.rawCopy || null,
        subtitulo: variation.subtitulo || null,
        dados: variation.dados || null,
        cta: variation.cta || null,
        avaliacao: variation.avaliacao || {},
        justificativa: variation.justificativa || null,
        selected,
        metadata: variation.rawCopy ? { rawCopy: variation.rawCopy } : {},
      });
    } catch (e: any) {
      toast({ title: 'Aviso: copy não foi salva no histórico', description: e?.message || 'O fluxo continua normalmente.' });
    }
  };

  const persistUploadedImages = async (images: string[], folder: string, type: 'reference' | 'logo' | 'product', clientId?: string) => {
    await Promise.all(
      images.map(async (image, index) => {
        if (!image.startsWith('data:')) return;
        const persisted = await persistImageAsset({
          imageUrl: image,
          folder,
          type,
          filename: imageFileName(`${type}-${index + 1}`),
          metadata: { source: 'upload', index },
          clientId,
        });
        const replaceUrl = persisted.url;
        if (type === 'reference') setRefImages((prev) => prev.map((item) => (item === image ? replaceUrl : item)));
        if (type === 'logo') setLogoImage((prev) => prev.map((item) => (item === image ? replaceUrl : item)));
        if (type === 'product') setProductImages((prev) => prev.map((item) => (item === image ? replaceUrl : item)));
      }),
    );
  };

  const templateCategories = ['Oferta', 'Prova social', 'Antes e depois', 'Autoridade', 'Conteúdo educativo', 'Lançamento', 'Lead magnet', 'Evento', 'Produto', 'Institucional'];

  const buildLayoutStructureFromCurrentCreative = () => ({
    aspectRatio: selectedAspectRatio,
    resolution: selectedResolution,
    hasLogo: logoImage.length > 0,
    hasProductImages: productImages.length > 0,
    preserveFaces,
    visualAnalysis: analysis ? {
      composicao: analysis.composicao,
      fotografia: analysis.fotografia,
      paleta: analysis.paleta,
      tipografia: analysis.tipografia,
      camadas: analysis.camadas,
      hierarquiaVisual: analysis.hierarquiaVisual,
      espaco: analysis.espaco,
      mood: analysis.mood,
    } : null,
    textHierarchy: copySource === 'ai' && selectedCopy ? {
      label: Boolean(selectedCopy.label),
      titulo: Boolean(selectedCopy.titulo),
      subtitulo: Boolean(selectedCopy.subtitulo),
      dados: Boolean(selectedCopy.dados),
      cta: Boolean(selectedCopy.cta),
    } : { rawCopy: Boolean(rawCopy) },
    safeZoneProfile: selectedAspectRatio,
  });

  const buildCopyStructureFromCurrentCreative = () => {
    if (copySource === 'ai' && selectedCopy) {
      return {
        source: 'ai',
        angle: selectedCopy.angulo,
        fields: {
          label: selectedCopy.label,
          titulo: selectedCopy.titulo,
          subtitulo: selectedCopy.subtitulo,
          dados: selectedCopy.dados,
          cta: selectedCopy.cta,
        },
        avaliacao: selectedCopy.avaliacao,
        justificativa: selectedCopy.justificativa,
      };
    }
    return { source: 'original', rawCopy };
  };

  const buildStyleMetadataFromCurrentCreative = () => ({
    mood: analysis?.mood || null,
    palette: analysis?.paleta || null,
    typography: analysis?.tipografia || null,
    composition: analysis?.composicao || null,
    photography: analysis?.fotografia || null,
    businessContext,
    selectedAspectRatio,
    selectedResolution,
    language,
    model: 'GPT Image 2',
  });

  const suggestTemplateCategory = (source?: TemplateSource | null) => {
    const axis = String(source?.factorVariation?.eixo || '').toLowerCase();
    if (axis.includes('oferta')) return 'Oferta';
    if (axis.includes('persona')) return 'Prova social';
    if (axis.includes('hook')) return 'Conteúdo educativo';
    if (axis.includes('estrutura')) return 'Institucional';
    if (axis.includes('emoc')) return 'Prova social';
    return 'Oferta';
  };

  const openSaveTemplate = (source: TemplateSource) => {
    const category = suggestTemplateCategory(source);
    const suggestedName = source.factorVariation?.nome || projectTitle || initialPrompt.slice(0, 48) || 'Novo template';
    const tags = [
      category,
      source.aspectRatio,
      ...(analysis?.mood?.adjetivos || []).slice(0, 3),
      source.factorVariation?.eixo,
    ].filter(Boolean).join(', ');
    setTemplateSource(source);
    setTemplateForm({
      name: suggestedName,
      description: source.factorVariation?.estrategia?.mudanca || '',
      category,
      niche: '',
      tags,
      visibility: 'private',
      aspectRatio: source.aspectRatio || selectedAspectRatio,
      preferredResolution: selectedResolution,
      designSystemDoc: source.designSystemDoc || editedDoc || '',
      basePrompt: source.prompt || buildFinalPromptForSelectedAspect(),
      negativePrompt: source.negativePrompt || negativePrompt,
    });
    setRightPanelMode('save-template');
  };

  const fetchBuiltinTemplates = async () => {
    try {
      const { data, error } = await db
        .from('creative_templates')
        .select('*')
        .eq('status', 'active')
        .eq('is_builtin', true)
        .order('name', { ascending: true });
      if (error) throw error;
      setBuiltinTemplates(data || []);
    } catch (e: any) {
      toast({ title: 'Erro ao buscar estilos', description: e?.message || 'Não foi possível listar os estilos Wavy.', variant: 'destructive' });
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      let query = db
        .from('creative_templates')
        .select('*')
        .eq('status', 'active')
        .eq('is_builtin', false)
        .order('updated_at', { ascending: false })
        .limit(60);
      if (templateCategoryFilter !== 'all') query = query.eq('category', templateCategoryFilter);
      if (templateAspectFilter !== 'all') query = query.eq('aspect_ratio', templateAspectFilter);
      const { data, error } = await query;
      if (error) throw error;
      const term = templateSearch.trim().toLowerCase();
      const filtered = term
        ? (data || []).filter((template: CreativeTemplate) =>
            [template.name, template.description, template.niche, template.category, ...(template.tags || [])]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(term),
          )
        : data || [];
      setTemplates(filtered);
    } catch (e: any) {
      toast({ title: 'Erro ao buscar templates', description: e?.message || 'Não foi possível listar templates.', variant: 'destructive' });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const applyTemplate = async (template: CreativeTemplate) => {
    try {
      const projectId = currentProjectId || await createCreativeProject();
      setSelectedTemplate(template);
      setSelectedTemplateId(template.id);
      setPreviewTemplate(null);
      setSelectedAspectRatio((template.aspect_ratio || '4:5') as CreativeAspectRatio);
      setSelectedResolution((template.preferred_resolution || '4K') as CreativeResolution);
      setEditedDoc(template.design_system_doc || editedDoc);
      setNegativePrompt(template.negative_prompt || '');
      const antiPadroesFromTemplate = template.negative_prompt
        ? template.negative_prompt.split('\n').map((l) => l.trim().replace(/^-+\s*/, '')).filter(Boolean)
        : undefined;
      if (template.design_system_doc && !analysis) {
        setAnalysis({
          composicao: template.layout_structure?.visualAnalysis?.composicao || { formato: template.aspect_ratio || '4:5', estrutura: 'Template aplicado', hierarquia: 'Hierarquia preservada do template', silencio: 'Margens e respiro preservados' },
          fotografia: template.layout_structure?.visualAnalysis?.fotografia || { tipo: 'Direção do template', luz: 'Preservar estilo', tratamento: 'Preservar acabamento', integracao: 'Adaptar produto atual' },
          paleta: template.style_metadata?.palette || { dominante: 'Template', secundaria: '', acento: '#EC4899', saturacao: 'Preservar', hexes: [] },
          tipografia: template.style_metadata?.typography || { familiaA: 'Template', familiaB: '', contraste: 'Preservar', alinhamento: 'Preservar' },
          camadas: template.layout_structure?.visualAnalysis?.camadas || ['Estrutura visual do template'],
          hierarquiaVisual: template.layout_structure?.visualAnalysis?.hierarquiaVisual || 'Preservar hierarquia do template',
          espaco: template.layout_structure?.visualAnalysis?.espaco || 'Preservar espaçamento do template',
          mood: template.style_metadata?.mood || { adjetivos: template.tags || [], referencias: [template.name], evita: [] },
          designSystemDoc: template.design_system_doc,
          antiPadroes: antiPadroesFromTemplate,
        });
      }
      const { error: usageError } = await db.from('creative_templates').update({ usage_count: (template.usage_count || 0) + 1 }).eq('id', template.id);
      if (usageError) console.error('Falha ao incrementar usage_count do template', usageError);
      const { error: stateError } = await db.from('creative_project_state').upsert({
        project_id: projectId,
        state_json: { ...buildProjectStateSnapshot(), selectedTemplateId: template.id, selectedTemplate: template },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' });
      if (stateError) throw stateError;
      setCurrentStage('copy');
      setRightPanelMode('template-applied');
      addAssistantMessage(`Template aplicado: ${template.name}. Agora podemos adaptar copy, produto, avatar e referências para criar uma nova versão.`, [
        { label: 'Inserir copy', action: 'open-paste-copy', variant: 'primary' },
        { label: 'Adicionar produto/pessoa', action: 'open-assets-product', variant: 'secondary' },
        { label: 'Revisar estrutura', action: 'open-template-detail', variant: 'secondary' },
        { label: 'Gerar arte', action: 'open-generation-summary', variant: 'ghost' },
      ]);
    } catch (e: any) {
      toast({ title: 'Erro ao aplicar template', description: e?.message || 'Não foi possível aplicar o template.', variant: 'destructive' });
      throw e;
    }
  };

  const saveTemplate = async () => {
    if (!templateSource || !templateForm.name.trim()) {
      toast({ title: 'Nome do template é obrigatório', variant: 'destructive' });
      return;
    }
    setSavingTemplate(true);
    try {
      const userId = await getCurrentUserId();
      const tags = templateForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const { data, error } = await db
        .from('creative_templates')
        .insert({
          created_by: userId,
          source_project_id: templateSource.sourceProjectId || currentProjectId,
          source_output_id: templateSource.sourceOutputId || null,
          name: templateForm.name.trim(),
          description: templateForm.description || null,
          category: templateForm.category || null,
          niche: templateForm.niche || null,
          visibility: templateForm.visibility,
          aspect_ratio: templateForm.aspectRatio,
          preferred_resolution: templateForm.preferredResolution,
          preview_url: templateSource.imageUrl,
          design_system_doc: templateForm.designSystemDoc,
          base_prompt: templateForm.basePrompt,
          negative_prompt: templateForm.negativePrompt,
          copy_structure: templateSource.factorVariation ? { source: 'factor', variation: templateSource.factorVariation } : buildCopyStructureFromCurrentCreative(),
          layout_structure: buildLayoutStructureFromCurrentCreative(),
          style_metadata: { ...buildStyleMetadataFromCurrentCreative(), editFeedback: templateSource.editFeedback || null },
          tags,
          status: 'active',
        })
        .select('*')
        .single();
      if (error) throw error;
      setSelectedTemplate(data);
      setSelectedTemplateId(data.id);
      toast({ title: 'Template salvo' });
      setRightPanelMode('template-library');
      await fetchTemplates();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar template', description: e?.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const duplicateTemplate = async (template: CreativeTemplate) => {
    try {
      const userId = await getCurrentUserId();
      const { id, usage_count, is_builtin, visibility, ...payload } = template as any;
      const { error } = await db.from('creative_templates').insert({
        ...payload,
        name: `Cópia de ${template.name}`,
        usage_count: 0,
        created_by: userId,
        is_builtin: false,
        // Estilos Wavy (globais) sempre viram cópia privada; templates do usuário
        // preservam a visibilidade original (private/team/global).
        visibility: is_builtin ? 'private' : (visibility || 'private'),
      });
      if (error) throw error;
      toast({ title: 'Template duplicado', description: 'Uma cópia editável foi salva em Meus Templates.' });
      await fetchTemplates();
    } catch (e: any) {
      toast({ title: 'Erro ao duplicar template', description: e?.message || 'Não foi possível duplicar.', variant: 'destructive' });
    }
  };

  const archiveTemplate = async (templateId: string) => {
    try {
      const { error } = await db.from('creative_templates').update({ status: 'archived' }).eq('id', templateId);
      if (error) throw error;
      if (selectedTemplateId === templateId) {
        setSelectedTemplate(null);
        setSelectedTemplateId(null);
      }
      toast({ title: 'Template arquivado' });
      setRightPanelMode('template-library');
      await fetchTemplates();
    } catch (e: any) {
      toast({ title: 'Erro ao arquivar template', description: e?.message || 'Não foi possível arquivar.', variant: 'destructive' });
    }
  };

  const generateBusinessContext = async () => {
    if (!analysis && !selectedCopy && !rawCopy.trim()) return;
    setContextLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-business-context', {
        body: {
          mood: analysis?.mood.adjetivos || [],
          referencias: analysis?.mood.referencias || [],
          evita: analysis?.mood.evita || [],
          copy: selectedCopy || {},
          rawCopy,
          language,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const ctx = (data as any).context;
      if (ctx) setBusinessContext(ctx);
    } catch (e: any) {
      toast({ title: 'Não consegui gerar o contexto', description: e.message, variant: 'destructive' });
    } finally {
      setContextLoading(false);
    }
  };

  // Auto-generate business context when reaching step 4 the first time
  useEffect(() => {
    if (step === 3 && !businessContext && !contextLoading && (analysis || selectedCopy || rawCopy.trim())) {
      generateBusinessContext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (rightPanelMode === 'project-history') fetchProjectHistory();
    if (rightPanelMode === 'reference-library') { fetchClientsForFilter(); fetchReferenceLibrary(referenceClientFilter); }
    if (rightPanelMode === 'template-library') fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightPanelMode]);

  useEffect(() => {
    if (!autoSaveEnabled || loadingProject || savingProject || currentStage === 'initial' || !initialPrompt.trim()) return;
    const timer = window.setTimeout(() => {
      saveProjectState({ silent: true });
    }, 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSaveEnabled,
    currentStage,
    conversationMessages,
    analysis,
    editedDoc,
    rawCopy,
    copyVariations,
    copyApproved,
    logoImage,
    productImages,
    businessContext,
    negativePrompt,
    storyImage,
    squareImage,
    factorVariations,
    factorImages,
    editedVersions,
    selectedAspectRatio,
    selectedResolution,
    projectTitle,
  ]);

  const generateSuggestedCopy = async (ctx: typeof urlContext, autoFill = false) => {
    setSuggestingCopy(true);
    setSuggestedRawCopy('');
    try {
      const { data, error } = await supabase.functions.invoke('criativo-suggest-copy', {
        body: { analysis: analysis || null, initialPrompt, language, urlContext: ctx || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const s = ((data as any)?.suggestion || '').trim();
      if (s) {
        setSuggestedRawCopy(s);
        if (autoFill && !rawCopy.trim()) setRawCopy(s);
      }
    } catch (e) {
      console.warn('suggest-copy', e);
    } finally {
      setSuggestingCopy(false);
    }
  };

  // Auto-suggest a draft copy when entering Step 2 with refs analyzed
  useEffect(() => {
    if (step !== 1 || suggestedRawCopy || suggestingCopy) return;
    generateSuggestedCopy(urlContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, analysis]);

  const fetchProductUrl = async () => {
    const url = productUrl.trim();
    if (!url) return;
    setUrlReading(true);
    setUrlError(null);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-fetch-url', { body: { url } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const ctx = data as { title: string; description: string; text: string };
      setUrlContext(ctx);
      toast({ title: 'Site lido', description: ctx.title || ctx.description?.slice(0, 80) || 'Conteúdo capturado' });
      await generateSuggestedCopy(ctx);
    } catch (e: any) {
      const msg = e?.message || 'Não consegui ler o site';
      setUrlError(msg);
      toast({ title: 'Erro ao ler site', description: msg, variant: 'destructive' });
    } finally {
      setUrlReading(false);
    }
  };

  const editArt = async (key: string, originalImage: string, aspect: 'story' | 'square', originalPrompt: string) => {
    const feedback = editFeedback.trim();
    if (!feedback) {
      toast({ title: 'Descreva a edição', variant: 'destructive' });
      return;
    }
    setEditLoadingKey(key);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-edit-image', {
        body: { originalImage, userFeedback: feedback, originalPrompt, aspect, language },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      recordAiUsage('image-gemini-flash-2');
      const rawUrl = (data as any).editedImageUrl as string;
      const persisted = await persistImageAsset({
        imageUrl: rawUrl,
        folder: 'edited',
        type: 'edited',
        filename: imageFileName(`criativo-edit-${key}`),
        metadata: { feedback, source_key: key, original_prompt: originalPrompt },
      });
      await saveCreativeOutput({
        type: 'edited',
        imageUrl: persisted.url,
        prompt: originalPrompt,
        assetId: persisted.assetId,
        aspectRatio: aspect === 'square' ? '1:1' : selectedAspectRatio,
        metadata: { feedback, source_key: key },
      });
      const url = persisted.url;
      setEditedVersions((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { url, feedback }],
      }));
      setEditPanelKey(null);
      setEditFeedback('');
      addAssistantMessage('Edição aplicada. Você pode baixar a nova versão ou continuar refinando.', [
        { label: 'Ver edição', action: 'open-edit-image', variant: 'primary' },
        { label: 'Baixar resultado', action: 'download-generated', variant: 'secondary' },
        { label: 'Editar novamente', action: 'open-edit-image', variant: 'ghost' },
      ]);
      toast({ title: 'Edição aplicada' });
    } catch (e: any) {
      toast({ title: 'Erro ao editar', description: e?.message || 'Erro', variant: 'destructive' });
    } finally {
      setEditLoadingKey(null);
    }
  };

  const discardEdit = (key: string, idx: number) => {
    setEditedVersions((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== idx),
    }));
  };

  const analyzeRefs = async () => {
    if (refImages.length === 0) {
      toast({ title: 'Adicione ao menos uma imagem', variant: 'destructive' });
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-analyze-refs', {
        body: { images: refImages },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const a = data as VisualAnalysis;
      setAnalysis(a);
      setEditedDoc(a.designSystemDoc);
      await persistUploadedImages(refImages, 'references', 'reference', uploadClientId !== 'all' ? uploadClientId : undefined);
      setCurrentStage('reference-review');
      setRightPanelMode('design-system');
      addAssistantMessage('Referências analisadas. Extraí um sistema visual com composição, fotografia, paleta, tipografia, camadas, hierarquia, espaço e mood.', [
        { label: 'Revisar direção visual', action: 'open-design-system', variant: 'primary' },
        { label: 'Continuar para copy', action: 'continue-copy', variant: 'secondary' },
      ]);
      toast({ title: 'Análise concluída' });
    } catch (e: any) {
      toast({ title: 'Erro ao analisar', description: e.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const improveCopy = async () => {
    if (!rawCopy.trim()) {
      toast({ title: 'Escreva sua copy primeiro', variant: 'destructive' });
      return;
    }
    setImproving(true);
    setCopyApproved(false);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-improve-copy', {
        body: {
          rawCopy,
          context: businessContext,
          moodAdjetivos: analysis?.mood.adjetivos.join(', ') || '',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const variations = ((data as any)?.variations || []) as CopyResult[];
      if (!variations.length) throw new Error('IA não retornou variações');
      setCopyVariations(variations);
      await Promise.all(variations.map((variation) => saveCopyVariationRecord(variation, 'ai', false)));
      setSelectedVariationIdx(null);
      setRightPanelMode('copy-suggestions');
    } catch (e: any) {
      toast({ title: 'Erro ao melhorar copy', description: e.message, variant: 'destructive' });
    } finally {
      setImproving(false);
    }
  };

  const buildFinalPrompt = (
    aspect: 'story' | 'square',
    options?: { selectedAspectRatio?: CreativeAspectRatio; selectedResolution?: CreativeResolution },
  ) => {
    const aspectConfig = options?.selectedAspectRatio
      ? ASPECT_CONFIG[options.selectedAspectRatio]
      : aspect === 'story'
      ? ASPECT_CONFIG['9:16']
      : ASPECT_CONFIG['1:1'];
    const resolutionConfig = options?.selectedResolution
      ? RESOLUTION_CONFIG[options.selectedResolution]
      : RESOLUTION_CONFIG['4K'];
    const dims = aspectConfig.promptDims;
    const safeZone = aspectConfig.safeZone;

    const intro = `[INTRODUCTION]
Create a ${dims} advertisement image for ${businessContext.trim() || 'a professional brand'}.
Quality target: ${resolutionConfig.promptQuality}.`;

    const photoBlock = productImages.length > 0
      ? `[ATTACHED PHOTOS]
${productImages.length} reference image(s) provided showing the product/person/scene that must appear in the composition.
${preserveFaces ? 'Preserve their exact likeness. Do NOT alter faces, skin tone, body shape or appearance in any way. Treat the subject as a fixed reference.' : ''}
Integrate the subject naturally into the composition described below.`
      : '';

    const designSystem = editedDoc || analysis?.designSystemDoc || '';
    const templateBlock = selectedTemplate
      ? `[TEMPLATE STRUCTURE]
Use the following reusable template structure as the creative foundation.
Template name: ${selectedTemplate.name}
Template category: ${selectedTemplate.category || 'not specified'}
Template visual structure: ${JSON.stringify(selectedTemplate.layout_structure || {})}
Template copy structure: ${JSON.stringify(selectedTemplate.copy_structure || {})}
Template base prompt: ${selectedTemplate.base_prompt || ''}

The final artwork must follow the template's layout logic, visual hierarchy, typography rhythm, spacing, and composition, while adapting the text, product, references and business context from the current project.`
      : '';

    const safe = `[SAFE ZONE]
${safeZone}
${aspect === 'square' ? 'Centered composition optimized for square 1:1 framing.' : ''}`;

    // Text blocks from selected copy
    let textBlocks = '';
    if (copySource === 'ai' && selectedCopy) {
      const parts: string[] = [];
      if (selectedCopy.label) parts.push(`LABEL (top, small uppercase, wide tracking, secondary color): "${selectedCopy.label}"`);
      if (selectedCopy.titulo) parts.push(`MAIN TITLE (dominant, large, primary typeface, high contrast): "${selectedCopy.titulo}"`);
      if (selectedCopy.subtitulo) parts.push(`SUBTITLE (medium, secondary typeface, supports the title): "${selectedCopy.subtitulo}"`);
      if (selectedCopy.dados) parts.push(`DATA LINE (small, factual: date/place/price/spots): "${selectedCopy.dados}"`);
      if (selectedCopy.cta) parts.push(`CTA (pill or button, accent color, bold): "${selectedCopy.cta}"`);
      textBlocks = `[TEXT BLOCKS]
All text must be rendered exactly as written, in ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}, with professional typography and perfect legibility.
${parts.join('\n')}`;
    } else if (copySource === 'original' && rawCopy.trim()) {
      textBlocks = `[TEXT BLOCKS]
Render the following exact text as overlay on the creative, in ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}, professional typography, perfect legibility, do not paraphrase:
"${rawCopy.trim()}"
Distribute the text across the composition following the typography system and hierarchy from the design system above.`;
    }

    const logoBlock = logoImage.length > 0
      ? `[BRAND LOGO]
A brand logo is provided as a separate reference. Place it discreetly in a corner (top-left or bottom-right preferred), small, clean. Do NOT distort, recolor, recreate or redesign it — treat as a fixed brand asset.`
      : '';

    const moodBlock = analysis?.mood
      ? `[MOOD]
Feels like: ${analysis.mood.referencias.join(', ') || 'professional advertising'}.
Tone: ${analysis.mood.adjetivos.join(', ')}.
Not: ${analysis.mood.evita.join(', ')}.`
      : '';

    const userNegatives = negativePrompt.trim()
      ? negativePrompt.split('\n').map((l) => `- ${l.trim().replace(/^-+\s*/, '')}`).filter((l) => l.length > 2)
      : [];
    const evitaList = analysis?.mood.evita.map((e) => `- ${e}`) || [];
    const antiPadroesList = analysis?.antiPadroes?.map((e) => `- ${e}`) || [];

    const doNot = `[DO NOT INCLUDE]
${[...evitaList, ...antiPadroesList, ...userNegatives].join('\n')}
- Any element within the top or bottom safe zones
- Any text in a language other than ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}
- Misspelled, garbled or fake-looking text
- Watermarks, signatures, low-resolution artifacts
- Generic stock-photo aesthetic`;

    const closing = `All text in the artwork MUST be written in ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}. Final result: ${resolutionConfig.promptQuality}, polished, professional advertising design, sharp typography, brand-grade composition.`;

    const consistency = aspect === 'square' && storyImage
      ? `[VISUAL CONSISTENCY — CRITICAL]
A reference Story version of this same creative is attached as the FIRST image. The square version MUST replicate its EXACT color palette, lighting, color grading, photographic treatment, typography choices and overall mood. Only the framing/composition changes to fit a 1:1 square. Treat that Story as the visual ground truth — do NOT shift hues, saturation, contrast or styling.`
      : '';

    return [intro, photoBlock, '[DESIGN SYSTEM]\n' + designSystem, templateBlock, safe, consistency, logoBlock, textBlocks, moodBlock, doNot, closing]
      .filter(Boolean)
      .join('\n\n');
  };

  const buildFinalPromptForSelectedAspect = () => {
    const backendAspect = getBackendAspectFromSelectedRatio(selectedAspectRatio);
    return buildFinalPrompt(backendAspect, { selectedAspectRatio, selectedResolution });
  };

  const openEditTarget = (target: {
    key: string;
    image: string | null;
    aspect: 'story' | 'square';
    prompt: string;
    label: string;
  }) => {
    if (!target.image) {
      toast({ title: 'Imagem indisponível para edição', variant: 'destructive' });
      return;
    }
    setSelectedEditKey(target.key);
    setSelectedEditTarget({ ...target, image: target.image });
    setEditPanelKey(target.key);
    setEditFeedback('');
    setCurrentStage('editing');
    setRightPanelMode('edit-image');
  };

  const getEditTargetFromKey = (key: string) => {
    const factorIndex = Number(key.match(/\d+/)?.[0] || 0);
    if (key === 'main:square') {
      return {
        key,
        image: squareImage,
        aspect: 'square' as const,
        prompt: buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution }),
        label: 'Principal 1:1',
      };
    }
    if (key.startsWith('f') && key.includes('square')) {
      return {
        key,
        image: factorSquareImages[factorIndex],
        aspect: 'square' as const,
        prompt: factorVariations?.[factorIndex]?.promptCompleto || '',
        label: `Fator #${factorIndex + 1} 1:1`,
      };
    }
    if (key.startsWith('f')) {
      return {
        key,
        image: factorImages[factorIndex],
        aspect: 'story' as const,
        prompt: factorVariations?.[factorIndex]?.promptCompleto || '',
        label: `Fator #${factorIndex + 1}`,
      };
    }
    return {
      key: 'main:story',
      image: storyImage,
      aspect: 'story' as const,
      prompt: buildFinalPromptForSelectedAspect(),
      label: 'Principal Story',
    };
  };

  const applyFatorCriativo = async () => {
    if (!storyImage && !squareImage) return;
    const aspect: 'story' | 'square' = storyImage ? 'story' : 'square';
    setFactorLoading(true);
    setFactorVariations(null);
    setFactorImages([null, null, null, null, null]);
    setFactorErrors([null, null, null, null, null]);
    setFactorSquareImages([null, null, null, null, null]);
    setFactorSquareLoading([false, false, false, false, false]);
    setFactorProgress(0);
    try {
      const originalPrompt = buildFinalPrompt(aspect, {
        selectedAspectRatio: aspect === 'square' ? '1:1' : selectedAspectRatio,
        selectedResolution,
      });
      const { data, error } = await supabase.functions.invoke('criativo-fator', {
        body: {
          originalPrompt,
          copy: copySource === 'ai' ? selectedCopy : { rawCopy },
          businessContext,
          language,
          aspect,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const variations = (data as any).variations as FactorVariation[];
      setFactorVariations(variations);

      await Promise.all(
        variations.map(async (v, i) => {
          try {
            const { data: gd, error: ge } = await supabase.functions.invoke('criativo-generate', {
              body: {
                prompt: v.promptCompleto,
                aspectRatio: aspect,
                model,
                isVariation: true,
                productImages,
                logoImage: logoImage[0] || null,
                storyReference: aspect === 'square' ? storyImage : null,
              },
            });
            if (ge) throw ge;
      if ((gd as any)?.error) throw new Error((gd as any).error);
      recordAiUsage(MODEL_OPTIONS.find((m) => m.id === model)?.usage || 'image-gemini-flash-2');
            const rawUrl = (gd as any).imageUrl as string;
            const persisted = await persistImageAsset({
              imageUrl: rawUrl,
              folder: 'factor',
              type: 'factor',
              filename: imageFileName(`criativo-fator-${i + 1}-${v.eixo || 'story'}`),
              metadata: { eixo: v.eixo, nome: v.nome, variation_index: i, copy: v.copy, descricaoVisual: v.descricaoVisual, promptCompleto: v.promptCompleto },
            });
            await saveCreativeOutput({
              type: 'factor',
              imageUrl: persisted.url,
              prompt: v.promptCompleto,
              assetId: persisted.assetId,
              metadata: { eixo: v.eixo, nome: v.nome, variation_index: i, copy: v.copy, descricaoVisual: v.descricaoVisual },
            });
            setFactorImages((prev) => {
              const next = [...prev];
              next[i] = persisted.url;
              return next;
            });
          } catch (err: any) {
            setFactorErrors((prev) => {
              const next = [...prev];
              next[i] = err?.message || 'Erro';
              return next;
            });
          } finally {
            setFactorProgress((p) => p + 1);
          }
        }),
      );
      toast({ title: '5 variações prontas' });
    } catch (e: any) {
      toast({ title: 'Erro no Fator Criativo', description: e.message, variant: 'destructive' });
    } finally {
      setFactorLoading(false);
    }
  };

  const generate = async (aspect: 'story' | 'square') => {
    if (aspect === 'square') {
      await recreateSquare('main');
      return;
    }
    setGenerating(true);
    try {
      const prompt = buildFinalPrompt(aspect, { selectedAspectRatio, selectedResolution });
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          prompt,
          aspectRatio: aspect,
          model,
          productImages,
          logoImage: logoImage[0] || null,
          storyReference: null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const usageType = MODEL_OPTIONS.find((m) => m.id === model)?.usage || 'image-gemini-flash-2';
      recordAiUsage(usageType);
      const rawUrl = (data as any).imageUrl as string;
      const persisted = await persistImageAsset({
        imageUrl: rawUrl,
        folder: 'generated',
        type: 'generated',
        filename: imageFileName(`criativo-principal-${selectedAspectRatio}`),
        metadata: { aspectRatio: selectedAspectRatio, resolution: selectedResolution },
      });
      await saveCreativeOutput({
        type: 'main',
        imageUrl: persisted.url,
        prompt,
        assetId: persisted.assetId,
        aspectRatio: selectedAspectRatio,
      });
      setStoryImage(persisted.url);
      setCurrentStage('result');
      setRightPanelMode('generated-result');
      addAssistantMessage('Arte criada. Quer ajustar, baixar ou gerar variaÃ§Ãµes estratÃ©gicas?', [
        { label: 'Editar com IA', action: 'open-edit-image', variant: 'secondary' },
        { label: 'Aplicar Fator Criativo', action: 'open-creative-factor', variant: 'primary' },
        { label: 'Ver resultado', action: 'open-generated-result', variant: 'secondary' },
      ]);
      toast({ title: 'Imagem Story gerada' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const recreateSquare = async (target: 'main' | number) => {
    if (target === 'main') {
      setMainSquareLoading(true);
      setSquareImage(null);
    } else {
      setFactorSquareLoading((prev) => prev.map((v, i) => (i === target ? true : v)));
      setFactorSquareImages((prev) => prev.map((v, i) => (i === target ? null : v)));
    }
    try {
      const prompt = target === 'main'
        ? buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution })
        : factorVariations?.[target]?.promptCompleto;
      if (!prompt) throw new Error('Prompt não disponível');
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          prompt,
          aspectRatio: 'square',
          model,
          isVariation: typeof target === 'number',
          productImages,
          logoImage: logoImage[0] || null,
          storyReference: storyImage,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const usageType = MODEL_OPTIONS.find((m) => m.id === model)?.usage || 'image-gemini-flash-2';
      recordAiUsage(usageType);
      const rawUrl = (data as any).imageUrl as string;
      const persisted = await persistImageAsset({
        imageUrl: rawUrl,
        folder: typeof target === 'number' ? 'factor' : 'generated',
        type: typeof target === 'number' ? 'factor' : 'generated',
        filename: imageFileName(typeof target === 'number' ? `criativo-fator-${target + 1}-square` : 'criativo-square'),
        metadata: { target, aspectRatio: '1:1', resolution: selectedResolution },
      });
      await saveCreativeOutput({
        type: target === 'main' ? 'square' : 'factor',
        imageUrl: persisted.url,
        prompt,
        assetId: persisted.assetId,
        aspectRatio: '1:1',
        metadata: typeof target === 'number' ? { variation_index: target, square: true } : { square: true },
      });
      const url = persisted.url;
      if (target === 'main') {
        setSquareImage(url);
      } else {
        setFactorSquareImages((prev) => prev.map((v, i) => (i === target ? url : v)));
      }
      toast({ title: 'Quadrado 1080 gerado' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar quadrado', description: e.message, variant: 'destructive' });
    } finally {
      if (target === 'main') setMainSquareLoading(false);
      else setFactorSquareLoading((prev) => prev.map((v, i) => (i === target ? false : v)));
    }
  };

  const download = async (url: string, name: string) => {
    try {
      const blob = await (await fetch(url)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name.endsWith('.png') ? name : `${name}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const sanitizeFileName = (name: string) => (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  );

  const imageFileName = (base: string) => `${sanitizeFileName(base)}-${Date.now()}.png`;

  const createId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  };

  const getTimeLabel = () => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const addMessage = (message: Omit<ConversationMessage, 'id' | 'timestamp'>) => {
    setConversationMessages((prev) => [
      ...prev,
      {
        id: createId(),
        timestamp: getTimeLabel(),
        ...message,
      },
    ]);
  };

  const addAssistantMessage = (content: string, actions?: ConversationMessage['actions']) => {
    addMessage({ role: 'assistant', content, actions });
  };

  const addUserMessage = (content: string) => {
    addMessage({ role: 'user', content });
  };

  const startConversation = async () => {
    const prompt = initialPrompt.trim();
    if (!prompt) {
      toast({ title: 'Descreva o que vamos criar', variant: 'destructive' });
      return;
    }
    if (!projectTitle.trim()) setProjectTitle(prompt.slice(0, 60));
    try { await createCreativeProject(); } catch (e) { console.warn('createCreativeProject failed:', e); }
    addUserMessage(prompt);
    setCurrentStage('references');
    setRightPanelMode('none');
    addAssistantMessage('Perfeito. Vamos montar isso juntos. Você já tem referências visuais?', [
      { label: 'Enviar referência', action: 'open-upload-references', variant: 'primary' },
      { label: 'Escolher da base', action: 'open-reference-library', variant: 'secondary' },
      { label: 'Pular por enquanto', action: 'skip-references', variant: 'ghost' },
    ]);
  };

  const getNextStepSuggestions = (): ConversationAction[] => {
    if (!analysis) return [
      { label: 'Adicionar referências', action: 'open-upload-references', variant: 'secondary' },
      { label: 'Gerar copy com IA', action: 'generate-copy-now', variant: 'ghost' },
    ];
    if (!copyApproved) return [
      { label: 'Gerar copy com IA', action: 'generate-copy-now', variant: 'primary' },
      { label: 'Escrever copy', action: 'open-paste-copy', variant: 'secondary' },
    ];
    if (!logoImage.length && !productImages.length) return [
      { label: 'Adicionar assets', action: 'open-assets', variant: 'secondary' },
      { label: 'Ir para geração', action: 'open-generation-summary', variant: 'ghost' },
    ];
    return [{ label: 'Revisar e gerar', action: 'open-generation-summary', variant: 'primary' }];
  };

  const askCopyStep = () => {
    setCurrentStage('copy');
    setRightPanelMode('none');
    addAssistantMessage('Sobre o texto da arte: você já tem uma copy pronta?', [
      { label: 'Já tenho copy', action: 'open-paste-copy', variant: 'primary' },
      { label: 'Gerar com IA', action: 'generate-copy-now', variant: 'secondary' },
      { label: 'Ver sugestões', action: 'open-copy-suggestions', variant: 'secondary' },
      { label: 'Ler site/produto', action: 'open-read-url', variant: 'ghost' },
    ]);
  };

  const askAssetsStep = () => {
    setCurrentStage('assets');
    setRightPanelMode('none');
    addAssistantMessage('Copy aprovada. Deseja adicionar algum asset real ao criativo?', [
      { label: 'Adicionar logo', action: 'open-assets-logo', variant: 'primary' },
      { label: 'Adicionar produto/pessoa', action: 'open-assets-product', variant: 'secondary' },
      { label: 'Escolher avatar', action: 'open-avatar-library', variant: 'secondary' },
      { label: 'Não usar assets', action: 'skip-assets', variant: 'ghost' },
    ]);
  };

  const prepareGenerationSummary = async () => {
    setCurrentStage('generation-summary');
    setRightPanelMode('generation-summary');
    await persistUploadedImages(logoImage, 'logos', 'logo', selectedClientId || undefined);
    await persistUploadedImages(productImages, 'products', 'product');
    if (!businessContext && (analysis || selectedCopy || rawCopy.trim())) {
      await generateBusinessContext();
    }
    addAssistantMessage('Perfeito. Reuni os principais insumos. Revise o resumo final antes de gerar a arte.', [
      { label: 'Revisar e gerar', action: 'open-generation-summary', variant: 'primary' },
    ]);
  };

  const approveOriginalCopy = async () => {
    if (!rawCopy.trim()) {
      toast({ title: 'Escreva sua copy primeiro', variant: 'destructive' });
      return;
    }
    setCopySource('original');
    setSelectedVariationIdx(null);
    setCopyApproved(true);
    await saveCopyVariationRecord({ rawCopy }, 'original', true);
    askAssetsStep();
  };


  const approveAiCopy = (idx: number) => {
    setCopySource('ai');
    setSelectedVariationIdx(idx);
    setCopyApproved(true);
    saveCopyVariationRecord(copyVariations[idx] || {}, 'ai', true);
    askAssetsStep();
  };

  const generateSelectedArt = async () => {
    if (!copyApproved && !rawCopy.trim()) {
      toast({
        title: 'Copy pendente',
        description: 'Aprove uma copy antes de gerar.',
        variant: 'destructive',
      });
      return;
    }
    if (!analysis) {
      toast({
        title: 'Gerando sem referências',
        description: 'A direção visual ficará menos precisa.',
      });
    }
    if (!businessContext && !contextLoading && (analysis || selectedCopy || rawCopy.trim())) {
      await generateBusinessContext();
    }
    const backendAspect = getBackendAspectFromSelectedRatio(selectedAspectRatio);
    if (backendAspect === 'square' && storyImage) await recreateSquare('main');
    else await generate(backendAspect);
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'open-upload-references':
        setCurrentStage('references');
        setRightPanelMode('upload-references');
        break;
      case 'open-reference-library':
        setCurrentStage('references');
        setRightPanelMode('reference-library');
        break;
      case 'skip-references':
        addAssistantMessage('Tudo bem. Podemos seguir sem referências, mas a direção visual ficará menos precisa.');
        askCopyStep();
        break;
      case 'continue-copy':
        askCopyStep();
        break;
      case 'open-design-system':
        setCurrentStage('reference-review');
        setRightPanelMode('design-system');
        break;
      case 'open-paste-copy':
        setCurrentStage('copy');
        setRightPanelMode('paste-copy');
        break;
      case 'open-read-url':
        setCurrentStage('copy');
        setRightPanelMode('read-url');
        break;
      case 'generate-copy-now':
        setCurrentStage('copy');
        setRightPanelMode('paste-copy');
        generateSuggestedCopy(urlContext, true);
        break;
      case 'open-copy-suggestions':
        setCurrentStage('copy');
        setRightPanelMode('copy-suggestions');
        break;
      case 'open-assets-logo':
      case 'open-assets-product':
        setCurrentStage('assets');
        setRightPanelMode('assets');
        break;
      case 'open-avatar-library':
        setCurrentStage('assets');
        setRightPanelMode('avatar-library');
        break;
      case 'skip-assets':
        addAssistantMessage('Sem problema. Vou seguir sem assets reais e preparar o resumo antes da geração.');
        await prepareGenerationSummary();
        break;
      case 'open-generation-summary':
        setCurrentStage('generation-summary');
        setRightPanelMode('generation-summary');
        break;
      case 'open-generated-result':
        setCurrentStage('result');
        setRightPanelMode('generated-result');
        break;
      case 'open-edit-image':
        openEditTarget({
          key: storyImage ? 'main:story' : 'main:square',
          image: storyImage || squareImage,
          aspect: storyImage ? 'story' : 'square',
          prompt: storyImage
            ? buildFinalPromptForSelectedAspect()
            : buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution }),
          label: storyImage ? 'Arte principal' : 'Arte quadrada',
        });
        break;
      case 'open-creative-factor':
        setCurrentStage('factor');
        setRightPanelMode('creative-factor');
        applyFatorCriativo();
        break;
      case 'open-project-history':
        setRightPanelMode('project-history');
        break;
      case 'open-template-detail':
        setRightPanelMode(selectedTemplate ? 'template-detail' : 'template-library');
        break;
      case 'download-generated':
        if (selectedEditTarget?.image) await download(selectedEditTarget.image, imageFileName(`criativo-edit-${selectedEditTarget.label}`));
        else if (storyImage) await download(storyImage, imageFileName(`criativo-principal-${selectedAspectRatio}`));
        else if (squareImage) await download(squareImage, imageFileName('criativo-square'));
        break;
      case 'regenerate-art':
        await generateSelectedArt();
        break;
      case 'open-assets':
        setCurrentStage('assets');
        setRightPanelMode('assets');
        break;
      case 'open-avatar':
        setCurrentStage('assets');
        setRightPanelMode('avatar-library');
        break;
      case 'open-template':
      case 'template-coming-soon':
        if (selectedTemplate) {
          setPreviewTemplate(null);
          setRightPanelMode('template-detail');
        } else {
          setStyleGalleryOpen(true);
        }
        break;
      default:
        console.warn('Ação não mapeada:', action);
        break;
    }
  };

  const reset = () => {
    setStep(0);
    setCurrentStage('initial');
    setRightPanelMode('none');
    setConversationMessages([]);
    setInitialPrompt('');
    setCurrentProjectId(null);
    setProjectTitle('');
    setLastSavedAt(null);
    setAutoSaveEnabled(true);
    setSelectedResolution('4K');
    setSelectedAspectRatio('4:5');
    setRefImages([]);
    setAnalysis(null);
    setEditedDoc('');
    setRawCopy('');
    setImproving(false);
    setCopyVariations([]);
    setSelectedVariationIdx(null);
    setSuggestedRawCopy('');
    setSuggestingCopy(false);
    setCopyApproved(false);
    setCopySource('ai');
    setProductUrl('');
    setUrlReading(false);
    setUrlContext(null);
    setUrlError(null);
    setLogoImage([]);
    setProductImages([]);
    setPreserveFaces(true);
    setBusinessContext('');
    setNegativePrompt('');
    setAdvancedOpen(false);
    setGenerating(false);
    setStoryImage(null);
    setSquareImage(null);
    setLightboxUrl(null);
    setContextLoading(false);
    setFactorSquareImages([null, null, null, null, null]);
    setFactorSquareLoading([false, false, false, false, false]);
    setFactorVariations(null);
    setFactorImages([]);
    setFactorErrors([]);
    setFactorLoading(false);
    setFactorProgress(0);
    setMainSquareLoading(false);
    setEditedVersions({});
    setEditPanelKey(null);
    setEditFeedback('');
    setEditLoadingKey(null);
    setSelectedEditKey('main:story');
    setSelectedEditTarget(null);
    setSelectedTemplateId(null);
    setSelectedTemplate(null);
    setTemplateSource(null);
  };

  const progressItems = [
    { label: 'Referências', done: !!analysis, current: ['references', 'reference-review'].includes(currentStage), note: analysis ? 'pronta' : 'opcional', action: analysis ? 'open-design-system' : 'open-upload-references' },
    { label: 'Copy', done: copyApproved, current: currentStage === 'copy', note: copyApproved ? 'aprovada' : 'pendente', action: copyApproved ? 'open-paste-copy' : 'generate-copy-now' },
    {
      label: 'Produto',
      done: logoImage.length > 0 || productImages.length > 0,
      current: currentStage === 'assets',
      note: logoImage.length > 0 || productImages.length > 0 ? 'com assets' : 'opcional',
      action: 'open-assets',
    },
    { label: 'Arte', done: !!storyImage || !!squareImage, current: ['generation-summary', 'result', 'factor', 'editing'].includes(currentStage), note: storyImage || squareImage ? 'gerada' : 'pendente', action: 'open-generation-summary' },
  ];

  const renderActionButton = (action: ConversationAction) => (
    <Button
      key={action.action}
      size="sm"
      disabled={action.disabled}
      variant={action.variant === 'primary' ? 'default' : action.variant === 'ghost' ? 'ghost' : 'outline'}
      onClick={() => handleQuickAction(action.action)}
      className={cn(
        'h-8 rounded-full text-xs',
        action.variant === 'primary' && 'bg-[#EC4899] text-white hover:bg-[#DB2777]',
        action.variant === 'danger' && 'border-destructive/40 text-destructive hover:text-destructive',
      )}
    >
      {action.label}
    </Button>
  );

  const renderCopyCard = (variation: CopyResult, idx: number) => (
    <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider text-[#EC4899]">{variation.angulo || `Sugestão ${idx + 1}`}</p>
        {copyApproved && copySource === 'ai' && selectedVariationIdx === idx && <Check className="h-4 w-4 text-[#EC4899]" />}
      </div>
      {variation.label && <CopyBlock label="Label" value={variation.label} small uppercase />}
      <CopyBlock label="Título" value={variation.titulo} bold />
      {variation.subtitulo && <CopyBlock label="Subtítulo" value={variation.subtitulo} />}
      {variation.dados && <CopyBlock label="Dados" value={variation.dados} small />}
      <CopyBlock label="CTA" value={variation.cta} accent />
      {variation.justificativa && <p className="text-[11px] text-white/50">{variation.justificativa}</p>}
      <Button size="sm" onClick={() => approveAiCopy(idx)} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
        Usar esta copy
      </Button>
    </div>
  );

  const renderGeneratedThumb = (url: string | null, aspect: 'story' | 'square', label: string) => {
    if (!url) return null;
    return (
      <button
        type="button"
        onClick={() => setLightboxUrl(url)}
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]',
          aspect === 'story' ? 'aspect-[9/16]' : 'aspect-square',
        )}
      >
        <img src={url} alt={label} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <ZoomIn className="h-5 w-5" />
        </div>
      </button>
    );
  };

  const renderClientSelect = () => (
    <Select
      value={selectedClientId || 'none'}
      onValueChange={(v) => {
        clientLogoRequestIdRef.current++; // invalida qualquer applyClientLogo ainda em voo
        if (v === 'none') {
          setSelectedClientId(null);
          setLogoImage([]);
          return;
        }
        setSelectedClientId(v);
        applyClientLogo(v);
      }}
    >
      <SelectTrigger className={cn('h-8 w-[140px] rounded-full', selectedClientId && 'ring-1 ring-[#EC4899]')}>
        <span className="truncate flex items-center gap-1.5">
          {loadingClientLogo && <Loader2 className="h-3 w-3 animate-spin" />}
          {selectedClientId ? (referenceClients.find((c) => c.id === selectedClientId)?.name || 'Cliente') : 'Cliente'}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem cliente</SelectItem>
        {referenceClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const renderBoardCard = ({
    url, aspect, title, subtitle, onDownload, onEdit, compact,
  }: {
    url: string; aspect: 'story' | 'square'; title?: string; subtitle?: string;
    onDownload: () => void; onEdit: () => void; compact?: boolean;
  }) => (
    <div className={cn('flex flex-col gap-2', compact ? 'w-full' : 'w-full max-w-[280px]')}>
      <div
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]',
          aspect === 'story' ? 'aspect-[9/16]' : 'aspect-square',
        )}
      >
        <img src={url} alt={title || 'Criativo gerado'} className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
          <button type="button" onClick={() => setLightboxUrl(url)} className="rounded-full bg-black/60 p-2 backdrop-blur hover:bg-black/80" title="Ver em tela cheia">
            <ZoomIn className="h-4 w-4 text-white" />
          </button>
          <button type="button" onClick={onDownload} className="rounded-full bg-black/60 p-2 backdrop-blur hover:bg-black/80" title="Baixar">
            <Download className="h-4 w-4 text-white" />
          </button>
          <button type="button" onClick={onEdit} className="rounded-full bg-black/60 p-2 backdrop-blur hover:bg-black/80" title="Editar com IA">
            <Pencil className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
      {(title || subtitle) && (
        <div>
          {title && <p className="text-xs font-medium text-white line-clamp-2">{title}</p>}
          {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      )}
    </div>
  );

  const PanelFold = ({
    title,
    children,
    defaultOpen = false,
  }: {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
  }) => (
    <Collapsible defaultOpen={defaultOpen} className="rounded-2xl border border-white/10 bg-white/[0.035]">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[#F9A8D4]">
        {title}
        <ChevronDown className="h-3.5 w-3.5 text-white/45" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-3 pb-3 text-xs text-white/75">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  const renderRightPanel = () => {
    const panelTitle: Record<RightPanelMode, string> = {
      none: 'Painel contextual',
      'upload-references': 'Enviar referências',
      'reference-library': 'Base de referências',
      'design-system': 'Direção visual',
      'paste-copy': 'Copy da arte',
      'copy-suggestions': 'Sugestões de copy',
      'read-url': 'Ler site/produto',
      assets: 'Assets reais',
      'avatar-library': 'Avatares',
      'generation-summary': 'Resumo final',
      'generated-result': 'Resultado',
      'creative-factor': 'Fator Criativo',
      'edit-image': 'Editar com IA',
      'project-history': 'Histórico de projetos',
      'template-library': 'Templates',
      'template-detail': 'Detalhes do template',
      'save-template': 'Salvar como template',
      'template-applied': 'Template aplicado',
    };

    return (
      <aside className="lg:sticky lg:top-4 h-fit lg:max-h-[calc(100vh-2rem)] rounded-[24px] border border-white/10 bg-[#111113]/95 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/38">Configuração</p>
            <h2 className="text-base font-semibold text-white/94">{panelTitle[rightPanelMode]}</h2>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0" onClick={() => setRightPanelMode('none')}>
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-4 space-y-4">
          {rightPanelMode === 'none' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/62">
              <Sparkles className="mb-3 h-5 w-5 text-[#EC4899]" />
              <p className="font-medium text-white/90">O painel contextual aparecerá aqui.</p>
              <p className="mt-1 text-xs">Escolha uma ação na conversa para configurar referências, copy, assets ou geração.</p>
            </div>
          )}

          {rightPanelMode === 'project-history' && (
            <div className="space-y-3">
              <Button onClick={fetchProjectHistory} disabled={projectHistoryLoading} variant="outline" className="w-full rounded-full">
                {projectHistoryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Atualizar histórico
              </Button>
              {projectHistoryLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
              ) : projectHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/50">
                  Nenhum projeto salvo ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {projectHistory.map((project) => (
                    <div key={project.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                      <div className="aspect-[4/5] w-full overflow-hidden bg-white/5">
                        {project.thumbnail_url ? (
                          <img src={project.thumbnail_url} alt={project.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/20 text-xs">Sem preview</div>
                        )}
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-black/65 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="sm" className="h-7 w-full rounded-full text-xs" onClick={() => loadCreativeProject(project.id)}>Abrir</Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => duplicateCreativeProject(project.id)}>Duplicar</Button>
                          <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs text-destructive hover:text-destructive" onClick={() => archiveCreativeProject(project.id)}>Arquivar</Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-white">{project.title}</p>
                        <p className="text-[10px] text-white/40">{new Date(project.updated_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightPanelMode === 'template-library' && (
            <div className="space-y-3">
              <p className="text-sm text-white/55">Comece com uma estrutura visual pronta ou salve seus melhores criativos como modelo.</p>
              <Input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="Buscar por nome, tag ou nicho" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {templateCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={templateAspectFilter} onValueChange={setTemplateAspectFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos formatos</SelectItem>
                    {(Object.keys(ASPECT_CONFIG) as CreativeAspectRatio[]).map((ratio) => <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full rounded-full" onClick={fetchTemplates} disabled={templatesLoading}>
                {templatesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Atualizar templates
              </Button>
              {templatesLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
              ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/50">
                  Nenhum template salvo ainda.
                  <p className="mt-1 text-xs">Depois de gerar um criativo, você poderá salvar como template.</p>
                </div>
              ) : templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 space-y-3">
                  {template.preview_url && <img src={template.preview_url} alt={template.name} className="aspect-[4/5] w-full rounded-xl object-cover" />}
                  <div>
                    <p className="font-medium text-white">{template.name}</p>
                    <p className="text-xs text-white/45">{template.category || 'Sem categoria'} · {template.niche || 'Sem nicho'} · {template.aspect_ratio}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(template.tags || []).slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/55">{tag}</span>)}
                    <span className="rounded-full bg-[#EC4899]/15 px-2 py-1 text-[10px] text-[#F9A8D4]">{template.usage_count || 0} usos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]" onClick={() => applyTemplate(template)}>Usar template</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setPreviewTemplate(template); setRightPanelMode('template-detail'); }}>Ver detalhes</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rightPanelMode === 'template-detail' && (() => {
            // previewTemplate (vindo de "Ver detalhes") tem prioridade; cai para o
            // template realmente aplicado (selectedTemplate) só quando não há preview.
            const detailTemplate = previewTemplate || selectedTemplate;
            return (
            <div className="space-y-3">
              {!detailTemplate ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/50">
                  Template não encontrado.
                  <Button className="mt-3 rounded-full" variant="outline" onClick={() => setRightPanelMode('template-library')}>Voltar</Button>
                </div>
              ) : (
                <>
                  {detailTemplate.preview_url ? (
                    <img src={detailTemplate.preview_url} alt={detailTemplate.name} className="aspect-[4/5] w-full rounded-2xl object-cover" />
                  ) : (
                    <div
                      className="aspect-[4/5] w-full rounded-2xl"
                      style={{ background: (detailTemplate.style_metadata as any)?.previewGradient || 'linear-gradient(135deg, #1C1B19 0%, #3A2A2A 55%, #EC4899 100%)' }}
                    />
                  )}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{detailTemplate.name}</p>
                      {detailTemplate.is_builtin && (
                        <span className="shrink-0 rounded-full bg-[#EC4899]/15 px-2 py-0.5 text-[10px] text-[#F9A8D4]">Estilo Wavy</span>
                      )}
                    </div>
                    {detailTemplate.description && <p className="mt-1 text-white/60">{detailTemplate.description}</p>}
                    <div className="mt-3 space-y-1 text-xs text-white/55">
                      <Info k="Categoria" v={detailTemplate.category || 'Não informada'} />
                      <Info k="Nicho" v={detailTemplate.niche || 'Não informado'} />
                      <Info k="Formato" v={detailTemplate.aspect_ratio || '4:5'} />
                      <Info k="Usos" v={String(detailTemplate.usage_count || 0)} />
                    </div>
                  </div>
                  {detailTemplate.negative_prompt && (
                    <PanelFold title="Anti-Padrões" defaultOpen>
                      <AntiPadroesList
                        items={detailTemplate.negative_prompt.split('\n').map((l) => l.trim().replace(/^-+\s*/, '')).filter(Boolean)}
                      />
                    </PanelFold>
                  )}
                  <PanelFold title="Estrutura">
                    <pre className="whitespace-pre-wrap text-[10px] text-white/60">{JSON.stringify({
                      layout: detailTemplate.layout_structure,
                      copy: detailTemplate.copy_structure,
                      style: detailTemplate.style_metadata,
                    }, null, 2)}</pre>
                  </PanelFold>
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]" onClick={() => applyTemplate(detailTemplate)}>Usar este template</Button>
                    <Button variant="outline" className="rounded-full" onClick={() => duplicateTemplate(detailTemplate)}>Duplicar</Button>
                    {!detailTemplate.is_builtin && (
                      <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={() => archiveTemplate(detailTemplate.id)}>Arquivar</Button>
                    )}
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setPreviewTemplate(null);
                        if (detailTemplate.is_builtin) setStyleGalleryOpen(true);
                        else setRightPanelMode('template-library');
                      }}
                    >
                      Voltar
                    </Button>
                  </div>
                </>
              )}
            </div>
            );
          })()}

          {rightPanelMode === 'template-applied' && selectedTemplate && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 p-4">
                <p className="text-sm font-semibold text-white">Template aplicado</p>
                <p className="mt-1 text-sm text-white/65">{selectedTemplate.name}</p>
              </div>
              <Button className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]" onClick={() => handleQuickAction('open-paste-copy')}>Inserir copy</Button>
              <Button className="w-full rounded-full" variant="outline" onClick={() => handleQuickAction('open-assets-product')}>Adicionar produto/pessoa</Button>
              <Button className="w-full rounded-full" variant="outline" onClick={() => setRightPanelMode('template-detail')}>Revisar estrutura</Button>
              <Button className="w-full rounded-full" variant="ghost" onClick={() => handleQuickAction('open-generation-summary')}>Gerar arte</Button>
            </div>
          )}

          {rightPanelMode === 'save-template' && (
            <div className="space-y-3">
              {templateSource?.imageUrl && <img src={templateSource.imageUrl} alt="Origem do template" className="aspect-[4/5] w-full rounded-2xl object-cover" />}
              <Input value={templateForm.name} onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nome do template" />
              <Textarea value={templateForm.description} onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Descrição" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={templateForm.category} onValueChange={(v) => setTemplateForm((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{templateCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={templateForm.niche} onChange={(e) => setTemplateForm((prev) => ({ ...prev, niche: e.target.value }))} placeholder="Nicho" />
              </div>
              <Input value={templateForm.tags} onChange={(e) => setTemplateForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags separadas por vírgula" />
              <div className="grid grid-cols-3 gap-2">
                <Select value={templateForm.visibility} onValueChange={(v) => setTemplateForm((prev) => ({ ...prev, visibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privado</SelectItem>
                    <SelectItem value="team">Time</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={templateForm.aspectRatio} onChange={(e) => setTemplateForm((prev) => ({ ...prev, aspectRatio: e.target.value }))} placeholder="4:5" />
                <Input value={templateForm.preferredResolution} onChange={(e) => setTemplateForm((prev) => ({ ...prev, preferredResolution: e.target.value }))} placeholder="4K" />
              </div>
              <PanelFold title="Avançado">
                <Label>Design System</Label>
                <Textarea value={templateForm.designSystemDoc} onChange={(e) => setTemplateForm((prev) => ({ ...prev, designSystemDoc: e.target.value }))} rows={5} className="font-mono text-xs" />
                <Label>Prompt base</Label>
                <Textarea value={templateForm.basePrompt} onChange={(e) => setTemplateForm((prev) => ({ ...prev, basePrompt: e.target.value }))} rows={5} className="font-mono text-xs" />
                <Label>Negative prompt</Label>
                <Textarea value={templateForm.negativePrompt} onChange={(e) => setTemplateForm((prev) => ({ ...prev, negativePrompt: e.target.value }))} rows={3} />
              </PanelFold>
              <Button onClick={saveTemplate} disabled={savingTemplate || !templateForm.name.trim()} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Salvar template
              </Button>
            </div>
          )}

          {rightPanelMode === 'upload-references' && (
            <>
              <p className="text-sm text-white/55">
                Envie imagens de anúncios, layouts ou estilos para a IA entender o DNA visual.
              </p>
              <ImageDropzone images={refImages} onChange={setRefImages} label="Solte, clique ou cole imagens de referência" maxImages={6} />
              <p className="text-xs text-white/38">{refImages.length}/6 imagens</p>
              {referenceClients.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-white/45">Associar ao cliente (opcional)</p>
                  <Select value={uploadClientId} onValueChange={setUploadClientId}>
                    <SelectTrigger className="rounded-full"><SelectValue placeholder="Nenhum cliente" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Nenhum cliente</SelectItem>
                      {referenceClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={analyzeRefs} disabled={analyzing || refImages.length === 0} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analisar referências
              </Button>
              {analysis && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/70">
                  <p className="font-medium text-white">Resumo visual pronto</p>
                  <p className="mt-1">Mood: {analysis.mood.adjetivos.join(', ')}</p>
                </div>
              )}
            </>
          )}

          {rightPanelMode === 'reference-library' && (
            <div className="space-y-3">
              <Select value={referenceClientFilter} onValueChange={(v) => { setReferenceClientFilter(v); fetchReferenceLibrary(v); }}>
                <SelectTrigger className="rounded-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {referenceClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {referenceLibraryLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                </div>
              ) : referenceAssets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/50">
                  Nenhuma referência salva ainda.
                  <p className="mt-1 text-xs">Quando você salvar referências por cliente, elas aparecerão aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {referenceAssets.map((asset) => {
                    const selected = selectedReferenceAssetIds.includes(asset.id);
                    return (
                      <div key={asset.id} className="relative">
                        <button
                          type="button"
                          onClick={() => setSelectedReferenceAssetIds((prev) => selected ? prev.filter((id) => id !== asset.id) : [...prev, asset.id])}
                          className={cn('w-full overflow-hidden rounded-2xl border bg-white/[0.035]', selected ? 'border-[#EC4899] ring-1 ring-[#EC4899]' : 'border-white/10')}
                        >
                          <img src={asset.thumbnail_url || asset.url} alt={asset.filename || 'Referência'} className="aspect-square w-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteReferenceAsset(asset.id); }}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/90 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]"
                disabled={selectedReferenceAssetIds.length === 0}
                onClick={() => {
                  const selectedUrls = referenceAssets.filter((asset) => selectedReferenceAssetIds.includes(asset.id)).map((asset) => asset.url);
                  setRefImages((prev) => [...prev, ...selectedUrls]);
                  setRightPanelMode('upload-references');
                  addAssistantMessage('Referências selecionadas da base. Você pode analisar agora.', [
                    { label: 'Analisar agora', action: 'open-upload-references', variant: 'primary' },
                  ]);
                }}
              >
                Usar selecionadas
              </Button>
            </div>
          )}

          {rightPanelMode === 'design-system' && (
            <div className="space-y-4">
              {!analysis ? (
                <p className="text-sm text-white/50">Ainda não há análise visual. Você pode seguir sem referências.</p>
              ) : (
                <>
                  <PanelFold title="Composição" defaultOpen>
                    <Info k="Formato" v={analysis.composicao.formato} />
                    <Info k="Estrutura" v={analysis.composicao.estrutura} />
                    <Info k="Hierarquia" v={analysis.composicao.hierarquia} />
                    <Info k="Silêncio" v={analysis.composicao.silencio} />
                  </PanelFold>
                  <PanelFold title="Fotografia">
                    <Info k="Tipo" v={analysis.fotografia.tipo} />
                    <Info k="Luz" v={analysis.fotografia.luz} />
                    <Info k="Tratamento" v={analysis.fotografia.tratamento} />
                    <Info k="Integração" v={analysis.fotografia.integracao} />
                  </PanelFold>
                  <PanelFold title="Paleta" defaultOpen>
                    <Info k="Dominante" v={analysis.paleta.dominante} />
                    <Info k="Secundária" v={analysis.paleta.secundaria} />
                    <Info k="Acento" v={analysis.paleta.acento} />
                    <Info k="Saturação" v={analysis.paleta.saturacao} />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {analysis.paleta.hexes.map((c) => (
                        <div key={c} className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px]">
                          <span className="h-3 w-3 rounded-full border border-white/20" style={{ background: c }} />
                          {c}
                        </div>
                      ))}
                    </div>
                  </PanelFold>
                  <PanelFold title="Tipografia">
                    <Info k="Família A" v={analysis.tipografia.familiaA} />
                    {analysis.tipografia.familiaB && <Info k="Família B" v={analysis.tipografia.familiaB} />}
                    <Info k="Contraste" v={analysis.tipografia.contraste} />
                    <Info k="Alinhamento" v={analysis.tipografia.alinhamento} />
                  </PanelFold>
                  <PanelFold title="Camadas">
                    <ol className="list-inside list-decimal space-y-1">
                      {analysis.camadas.map((layer, i) => <li key={i}>{layer}</li>)}
                    </ol>
                  </PanelFold>
                  <PanelFold title="Mood" defaultOpen>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.mood.adjetivos.map((m) => <span key={m} className="rounded-full bg-[#EC4899]/15 px-2 py-1 text-[10px] text-[#F9A8D4]">{m}</span>)}
                    </div>
                    {analysis.mood.referencias.length > 0 && (
                      <p className="pt-1 text-white/55">Referências: {analysis.mood.referencias.join(', ')}</p>
                    )}
                  </PanelFold>
                  <PanelFold title="Evita">
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.mood.evita.map((m) => <span key={m} className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">{m}</span>)}
                    </div>
                  </PanelFold>
                  {analysis.antiPadroes && analysis.antiPadroes.length > 0 && (
                    <PanelFold title="Anti-Padrões" defaultOpen>
                      <AntiPadroesList items={analysis.antiPadroes} />
                    </PanelFold>
                  )}
                </>
              )}
              <Textarea value={editedDoc} onChange={(e) => setEditedDoc(e.target.value)} rows={9} className="font-mono text-xs" placeholder="Design System Document" />
              <Button onClick={askCopyStep} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">Salvar ajustes e continuar</Button>
            </div>
          )}

          {rightPanelMode === 'paste-copy' && (
            <div className="space-y-3">
              {suggestedRawCopy && (
                <div className="rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 p-3 text-sm">
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-[#F9A8D4]">Copy sugerida pela IA</p>
                  <p className="whitespace-pre-wrap text-white/80">{suggestedRawCopy}</p>
                  <Button size="sm" onClick={() => setRawCopy(suggestedRawCopy)} className="mt-3 rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">Usar sugestão</Button>
                </div>
              )}
              <Textarea value={rawCopy} onChange={(e) => setRawCopy(e.target.value)} rows={8} placeholder="Cole ou escreva a copy da arte..." />
              <div className="grid gap-2">
                <Button onClick={approveOriginalCopy} disabled={!rawCopy.trim()} className="rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">Usar esta copy</Button>
                <Button variant="outline" onClick={improveCopy} disabled={improving || !rawCopy.trim()} className="rounded-full">
                  {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Otimizar com IA
                </Button>
              </div>
            </div>
          )}

          {rightPanelMode === 'read-url' && (
            <div className="space-y-3">
              <Input type="url" value={productUrl} onChange={(e) => { setProductUrl(e.target.value); setUrlError(null); }} placeholder="https://exemplo.com/produto" />
              <Button onClick={fetchProductUrl} disabled={urlReading || !productUrl.trim()} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                {urlReading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                Ler site
              </Button>
              {urlContext && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/70"><p className="font-medium text-white">{urlContext.title}</p><p>{urlContext.description}</p></div>}
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
              <Button
                variant="outline"
                disabled={!urlContext || suggestingCopy}
                onClick={async () => {
                  await generateSuggestedCopy(urlContext);
                  setRightPanelMode('paste-copy');
                }}
                className="w-full rounded-full"
              >
                {suggestingCopy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar sugestão de copy com este site
              </Button>
            </div>
          )}

          {rightPanelMode === 'copy-suggestions' && (
            <div className="space-y-3">
              {suggestedRawCopy && (
                <div className="rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 p-3 text-sm text-white/80">
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-[#F9A8D4]">Rascunho sugerido</p>
                  {suggestedRawCopy}
                </div>
              )}
              {copyVariations.length === 0 && (
                <Button onClick={improveCopy} disabled={improving || !rawCopy.trim()} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                  {improving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Gerar 4 sugestões
                </Button>
              )}
              {copyVariations.map(renderCopyCard)}
            </div>
          )}

          {rightPanelMode === 'assets' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-white/38">Logo da marca</p>
                <ImageDropzone images={logoImage} onChange={setLogoImage} label="Solte, clique ou cole o logo" maxImages={1} />
              </div>
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wider text-white/38">Produto / pessoa / cenário</p>
                <ImageDropzone images={productImages} onChange={setProductImages} label="Solte, clique ou cole imagens do produto/pessoa" maxImages={6} />
                {productImages.length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <Switch id="preserve-faces-new" checked={preserveFaces} onCheckedChange={setPreserveFaces} />
                    <Label htmlFor="preserve-faces-new" className="text-xs">Preservar rosto, pele, corpo e identidade.</Label>
                  </div>
                )}
              </div>
              <Button onClick={prepareGenerationSummary} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">Continuar para geração</Button>
            </div>
          )}

          {rightPanelMode === 'avatar-library' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/35" />
                <Input className="pl-9" placeholder="Buscar avatar" />
              </div>
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-white/50">Nenhum avatar.</div>
              <Button variant="outline" className="w-full rounded-full" onClick={() => toast({ title: 'Criação de avatar estará disponível em breve.' })}>+ Criar avatar</Button>
              <Button onClick={prepareGenerationSummary} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">Continuar sem avatar</Button>
            </div>
          )}

          {rightPanelMode === 'generation-summary' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/65 space-y-2">
                <Info k="Prompt inicial" v={initialPrompt || 'Não informado'} />
                <Info k="Referências" v={`${refImages.length} imagem(ns)`} />
                <Info k="Direção visual" v={analysis ? 'pronta' : 'sem análise'} />
                <Info k="Copy" v={copySource === 'ai' && selectedCopy ? selectedCopy.titulo : rawCopy || 'pendente'} />
                <Info k="Assets" v={`${logoImage.length ? 'logo' : 'sem logo'} · ${productImages.length} produto/pessoa`} />
                <Info k="Dimensão" v={`${selectedAspectRatio} · ${getSelectedAspectConfig().title}`} />
                <Info k="Uso recomendado" v={getSelectedAspectConfig().recommendedUse} />
                <Info k="Resolução" v={`${selectedResolution} · ${getSelectedResolutionConfig().label}`} />
                <Info k="Qualidade" v={getSelectedResolutionConfig().promptQuality} />
                <Info k="Idioma" v={language} />
                {selectedAspectRatio !== '1:1' && <Info k="Backend" v="gera em modo Story e orienta o prompt para o formato escolhido" />}
                <Info k="Modelo visual" v="GPT Image 2" />
              </div>
              {selectedTemplate && (
                <div className="rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 p-3 text-xs text-white/70">
                  <p className="font-semibold text-white">Template aplicado</p>
                  <p className="mt-1">{selectedTemplate.name} · {selectedTemplate.category || 'Sem categoria'} · {selectedTemplate.aspect_ratio}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedTemplate.tags || []).slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[10px]">{tag}</span>)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 rounded-full text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setSelectedTemplateId(null);
                      toast({ title: 'Template removido deste projeto' });
                    }}
                  >
                    Remover template
                  </Button>
                </div>
              )}
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/38">Contexto do negócio</Label>
                <Textarea value={businessContext} onChange={(e) => setBusinessContext(e.target.value)} rows={3} placeholder={contextLoading ? 'Gerando contexto...' : 'Contexto do negócio'} />
                <Button size="sm" variant="ghost" onClick={generateBusinessContext} disabled={contextLoading} className="mt-2 rounded-full">
                  {contextLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                  Regenerar contexto
                </Button>
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/38">DO NOT INCLUDE</Label>
                <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={3} placeholder="Uma restrição por linha" />
              </div>
              <Button onClick={generateSelectedArt} disabled={generating || mainSquareLoading} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                {generating || mainSquareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {generating || mainSquareLoading ? 'Gerando arte...' : `Gerar arte ${selectedAspectRatio} em ${selectedResolution}`}
              </Button>
            </div>
          )}

          {rightPanelMode === 'generated-result' && (
            <div className="space-y-3">
              <div className="flex gap-2 text-[10px]">
                <span className="rounded-full bg-[#EC4899]/15 px-2 py-1 text-[#F9A8D4]">{selectedAspectRatio}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">{selectedResolution}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">{language}</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">GPT Image 2</span>
              </div>
              <p className="text-xs text-white/45">A arte aparece no quadro grande, logo abaixo da conversa.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-full" disabled={!storyImage && !squareImage} onClick={() => storyImage ? download(storyImage, imageFileName(`criativo-principal-${selectedAspectRatio}`)) : squareImage && download(squareImage, imageFileName('criativo-square'))}><Download className="mr-2 h-3 w-3" />Baixar</Button>
                <Button variant="outline" className="rounded-full" disabled={!storyImage || mainSquareLoading} onClick={() => recreateSquare('main')}><RefreshCw className="mr-2 h-3 w-3" />1080</Button>
                <Button variant="outline" className="rounded-full" disabled={!storyImage && !squareImage} onClick={() => handleQuickAction('open-edit-image')}><Pencil className="mr-2 h-3 w-3" />Editar</Button>
                <Button variant="outline" className="rounded-full" disabled={!storyImage && !squareImage} onClick={() => handleQuickAction('open-creative-factor')}><Sparkles className="mr-2 h-3 w-3" />Fator</Button>
                <Button variant="outline" className="rounded-full" disabled={!storyImage && !squareImage} onClick={() => setLightboxUrl(storyImage || squareImage)}><ZoomIn className="mr-2 h-3 w-3" />Preview</Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={!storyImage && !squareImage}
                  onClick={() => openSaveTemplate({
                    sourceProjectId: currentProjectId,
                    imageUrl: storyImage || squareImage || '',
                    prompt: storyImage ? buildFinalPromptForSelectedAspect() : buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution }),
                    aspectRatio: storyImage ? selectedAspectRatio : '1:1',
                    copy: copySource === 'ai' ? selectedCopy : { rawCopy },
                    designSystemDoc: editedDoc,
                    negativePrompt,
                    businessContext,
                  })}
                >
                  <Layers className="mr-2 h-3 w-3" /> Template
                </Button>
              </div>
            </div>
          )}

          {rightPanelMode === 'creative-factor' && (
            <div className="space-y-3">
              <p className="text-sm text-white/62">Gere 5 variações estratégicas para testar ângulos diferentes no Meta Ads.</p>
              {(!factorVariations || factorLoading) && (
                <Button onClick={applyFatorCriativo} disabled={factorLoading || (!storyImage && !squareImage)} className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]">
                  {factorLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {factorLoading ? `Gerando ${factorProgress}/5...` : 'Aplicar Fator Criativo'}
                </Button>
              )}
              {!factorVariations && !factorLoading && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/62">
                  <p className="mb-2 font-medium text-white">Eixos que serão explorados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Emocional', 'Oferta', 'Persona', 'Hook', 'Estrutura'].map((axis) => (
                      <span key={axis} className="rounded-full bg-[#EC4899]/15 px-2 py-1 text-[#F9A8D4]">{axis}</span>
                    ))}
                  </div>
                </div>
              )}
              {factorLoading && !factorVariations && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
              {factorVariations && Array.from({ length: 5 }).map((_, i) => {
                const v = factorVariations?.[i];
                const img = factorImages[i];
                const sqImg = factorSquareImages[i];
                const err = factorErrors[i];
                return (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-[#EC4899]">#{i + 1} {v?.eixo || 'variação'}</p>
                    {err && (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                        {err}
                      </div>
                    )}
                    {!img && !err && <Skeleton className="h-10 rounded-2xl" />}
                    {v && (
                      <>
                        <p className="text-sm font-medium">{v.nome}</p>
                        <div className="rounded-xl bg-black/20 p-2 text-xs text-white/60">
                          <p><span className="text-white/35">Mudança:</span> {v.estrategia.mudanca}</p>
                          <p><span className="text-white/35">Para quem:</span> {v.estrategia.paraQuem}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-2 text-xs text-white/70">
                          {v.copy.label && <p className="text-[10px] uppercase tracking-wider text-[#F9A8D4]">{v.copy.label}</p>}
                          <p className="font-semibold text-white">{v.copy.titulo}</p>
                          {v.copy.subtitulo && <p>{v.copy.subtitulo}</p>}
                          {v.copy.dados && <p className="text-white/45">{v.copy.dados}</p>}
                          <p className="text-[#F9A8D4]">{v.copy.cta}</p>
                        </div>
                        <div className="rounded-xl bg-black/20 p-2 text-xs text-white/60">
                          <p><span className="text-white/35">Hook:</span> {v.descricaoVisual.hook}</p>
                          <p><span className="text-white/35">Composição:</span> {v.descricaoVisual.composicao}</p>
                          {v.descricaoVisual.tom && <p><span className="text-white/35">Tom:</span> {v.descricaoVisual.tom}</p>}
                          <p><span className="text-white/35">Diferença:</span> {v.descricaoVisual.diferenca}</p>
                        </div>
                        <Collapsible>
                          <CollapsibleTrigger className="text-xs text-white/45 hover:text-white">Ver prompt completo</CollapsibleTrigger>
                          <CollapsibleContent>
                            <Textarea value={v.promptCompleto} readOnly rows={5} className="mt-2 font-mono text-[10px]" />
                          </CollapsibleContent>
                        </Collapsible>
                      </>
                    )}
                    {img && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(img, imageFileName(`criativo-fator-${i + 1}-${v?.eixo || 'story'}`))}>Baixar Story</Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => recreateSquare(i)} disabled={factorSquareLoading[i]}>{factorSquareLoading[i] ? 'Gerando...' : '1080x1080'}</Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEditTarget({ key: `f${i}:story`, image: img, aspect: 'story', prompt: v?.promptCompleto || '', label: `Fator ${i + 1}` })}>Editar</Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLightboxUrl(img)}>Preview</Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => openSaveTemplate({
                          sourceProjectId: currentProjectId,
                          imageUrl: img,
                          prompt: v?.promptCompleto || '',
                          aspectRatio: selectedAspectRatio,
                          copy: v?.copy,
                          designSystemDoc: editedDoc,
                          negativePrompt,
                          businessContext,
                          factorVariation: v,
                        })}>Template</Button>
                      </div>
                    )}
                    {sqImg && (
                      <div className="mt-2 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                        <p className="text-[10px] text-white/40">Versão 1080x1080 · veja no quadro abaixo</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(sqImg, imageFileName(`criativo-fator-${i + 1}-square`))}>Baixar</Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => openEditTarget({ key: `f${i}:square`, image: sqImg, aspect: 'square', prompt: v?.promptCompleto || '', label: `Fator ${i + 1} square` })}>Editar</Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLightboxUrl(sqImg)}>Preview</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {rightPanelMode === 'edit-image' && (
            <div className="space-y-3">
              <Select
                value={selectedEditTarget?.key || selectedEditKey}
                onValueChange={(key) => {
                  const target = getEditTargetFromKey(key);
                  if (target.image) openEditTarget(target);
                  else setSelectedEditKey(key);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {storyImage && <SelectItem value="main:story">Principal Story</SelectItem>}
                  {squareImage && <SelectItem value="main:square">Principal 1:1</SelectItem>}
                  {factorImages.map((img, i) => img && <SelectItem key={i} value={`f${i}:story`}>Fator #{i + 1}</SelectItem>)}
                  {factorSquareImages.map((img, i) => img && <SelectItem key={`sq-${i}`} value={`f${i}:square`}>Fator #{i + 1} 1:1</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedEditTarget && (
                <p className="text-xs uppercase tracking-wider text-[#F9A8D4]">{selectedEditTarget.label}</p>
              )}
              {renderGeneratedThumb(
                selectedEditTarget?.image || getEditTargetFromKey(selectedEditKey).image,
                selectedEditTarget?.aspect || getEditTargetFromKey(selectedEditKey).aspect,
                'Imagem para edição',
              )}
              <Textarea value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} rows={4} placeholder="Ex.: deixe o CTA mais destacado, aumente contraste do título, remova o elemento da esquerda..." />
              <Button
                disabled={!editFeedback.trim() || !!editLoadingKey}
                onClick={() => {
                  const target = selectedEditTarget || getEditTargetFromKey(selectedEditKey);
                  if (!target.image) {
                    toast({ title: 'Imagem indisponível para edição', variant: 'destructive' });
                    return;
                  }
                  editArt(target.key, target.image, target.aspect, target.prompt);
                }}
                className="w-full rounded-full bg-[#EC4899] text-white hover:bg-[#DB2777]"
              >
                {editLoadingKey === (selectedEditTarget?.key || selectedEditKey) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                Aplicar edição
              </Button>
              {(editedVersions[selectedEditTarget?.key || selectedEditKey] || []).map((ed, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 space-y-2">
                  {renderGeneratedThumb(ed.url, selectedEditTarget?.aspect || getEditTargetFromKey(selectedEditKey).aspect, `Edit ${i + 1}`)}
                  <p className="text-xs text-white/50">{ed.feedback}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => download(ed.url, imageFileName(`criativo-edit-${selectedEditTarget?.label || selectedEditKey}`))}>Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => setLightboxUrl(ed.url)}>Preview</Button>
                    <Button size="sm" variant="outline" onClick={() => openSaveTemplate({
                      sourceProjectId: currentProjectId,
                      imageUrl: ed.url,
                      prompt: selectedEditTarget?.prompt || getEditTargetFromKey(selectedEditKey).prompt,
                      aspectRatio: selectedEditTarget?.aspect === 'square' ? '1:1' : selectedAspectRatio,
                      copy: copySource === 'ai' ? selectedCopy : { rawCopy },
                      designSystemDoc: editedDoc,
                      negativePrompt,
                      businessContext,
                      editFeedback: ed.feedback,
                    })}>Template</Button>
                    <Button size="sm" variant="ghost" onClick={() => discardEdit(selectedEditTarget?.key || selectedEditKey, i)} className="text-destructive hover:text-destructive">Descartar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  };

  const conversationalLayout = (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">

        <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Wand2 className="h-5 w-5 text-[#EC4899]" />
                Criativo Studio
              </h1>
              <p className="mt-1 text-sm text-white/62">Workspace conversacional para criação de criativos</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder={initialPrompt ? initialPrompt.slice(0, 60) : 'Nome do projeto'}
                  className="h-8 w-64 rounded-full border-white/10 bg-white/[0.035] text-xs"
                />
                <span className="text-xs text-white/38">
                  {loadingProject ? 'Carregando...' : savingProject ? 'Salvando...' : lastSavedAt ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Ainda não salvo'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-full" disabled={savingProject || loadingProject} onClick={() => saveProjectState()}>
                {savingProject ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-2 h-3.5 w-3.5" />}
                Salvar
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleQuickAction('open-project-history')}>
                <History className="mr-2 h-3.5 w-3.5" /> Histórico
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={reset}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Novo chat
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {currentStage !== 'initial' && (
            <div className="mt-5 flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.035] p-1.5">
              {progressItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickAction(item.action)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition hover:bg-white/10',
                    item.current ? 'bg-[#EC4899]/20 text-white ring-1 ring-[#EC4899]/50' : 'text-white/55',
                    item.done && !item.current && 'bg-white/8 text-white/80',
                  )}
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-full text-[9px]', item.done ? 'bg-[#EC4899] text-white' : 'bg-white/10')}>
                    {item.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  {item.label}
                  <span className="hidden text-white/35 sm:inline">{item.note}</span>
                </button>
              ))}
            </div>
          )}

          <section className={cn('flex flex-1 flex-col', currentStage === 'initial' ? 'justify-center py-12' : 'py-6')}>
            {currentStage === 'initial' && (
              <div className="mx-auto w-full max-w-3xl text-center">
                <p className="mb-4 text-3xl font-semibold tracking-tight">O que vamos criar hoje?</p>
                <div className="rounded-[24px] border border-white/10 bg-[#111113] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:border-[#EC4899]/70">
                  <Textarea
                    value={initialPrompt}
                    onChange={(e) => setInitialPrompt(e.target.value)}
                    rows={5}
                    placeholder="Descreva a imagem que você quer criar..."
                    className="min-h-[130px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {renderClientSelect()}
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/62">GPT Image 2</span>
                      <Select value={selectedResolution} onValueChange={(v) => setSelectedResolution(v as CreativeResolution)}>
                        <SelectTrigger className="h-8 w-[92px] rounded-full"><span>{selectedResolution}</span></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1K">1K — Rápido</SelectItem>
                          <SelectItem value="2K">2K — Equilibrado</SelectItem>
                          <SelectItem value="4K">4K — Máxima qualidade</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedAspectRatio} onValueChange={(v) => setSelectedAspectRatio(v as CreativeAspectRatio)}>
                        <SelectTrigger className="h-8 w-[96px] rounded-full"><span>{selectedAspectRatio}</span></SelectTrigger>
                        <SelectContent className="w-[280px]">
                          {(Object.keys(ASPECT_CONFIG) as CreativeAspectRatio[]).map((ratio) => {
                            const config = ASPECT_CONFIG[ratio];
                            return (
                              <SelectItem key={ratio} value={ratio}>
                                <div className="flex flex-col py-1">
                                  <span className="font-semibold">{config.label} · {config.title}</span>
                                  <span className="text-[10px] text-white/45">{config.recommendedUse}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleQuickAction('open-assets')}>Produto</Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleQuickAction('open-avatar')}>Avatar</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('rounded-full', selectedTemplate && 'ring-1 ring-[#EC4899]')}
                        onClick={() => handleQuickAction('open-template')}
                      >
                        {selectedTemplate ? `Template: ${selectedTemplate.name.slice(0, 18)}` : 'Template'}
                      </Button>
                    </div>
                    <Button onClick={startConversation} className="h-10 rounded-full bg-[#EC4899] px-5 text-white hover:bg-[#DB2777]">
                      <Send className="mr-2 h-4 w-4" /> Iniciar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentStage !== 'initial' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/10 bg-[#111113] p-2">
                  {renderClientSelect()}
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/62">GPT Image 2</span>
                  <Select value={selectedResolution} onValueChange={(v) => setSelectedResolution(v as CreativeResolution)}>
                    <SelectTrigger className="h-8 w-[92px] rounded-full"><span>{selectedResolution}</span></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K — Rápido</SelectItem>
                      <SelectItem value="2K">2K — Equilibrado</SelectItem>
                      <SelectItem value="4K">4K — Máxima qualidade</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedAspectRatio} onValueChange={(v) => setSelectedAspectRatio(v as CreativeAspectRatio)}>
                    <SelectTrigger className="h-8 w-[96px] rounded-full"><span>{selectedAspectRatio}</span></SelectTrigger>
                    <SelectContent className="w-[280px]">
                      {(Object.keys(ASPECT_CONFIG) as CreativeAspectRatio[]).map((ratio) => {
                        const config = ASPECT_CONFIG[ratio];
                        return (
                          <SelectItem key={ratio} value={ratio}>
                            <div className="flex flex-col py-1">
                              <span className="font-semibold">{config.label} · {config.title}</span>
                              <span className="text-[10px] text-white/45">{config.recommendedUse}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleQuickAction('open-assets')}>Produto</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleQuickAction('open-avatar')}>Avatar</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn('rounded-full', selectedTemplate && 'ring-1 ring-[#EC4899]')}
                    onClick={() => handleQuickAction('open-template')}
                  >
                    {selectedTemplate ? `Template: ${selectedTemplate.name.slice(0, 18)}` : 'Template'}
                  </Button>
                </div>
                {conversationMessages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div className={cn('mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', message.role === 'assistant' ? 'bg-[#EC4899]/15 text-[#F9A8D4]' : 'bg-white/10')}>
                      {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/38">
                        <span>{message.role === 'assistant' ? 'Criativo AI' : 'Você'}</span>
                        {message.timestamp && <span>{message.timestamp}</span>}
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-[#111113] p-4 text-sm leading-relaxed text-white/82">
                        {message.content}
                      </div>
                      {message.actions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map(renderActionButton)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(analyzing || improving || urlReading || contextLoading || generating || factorLoading || !!editLoadingKey) && (
                  <div className="flex gap-3 text-sm text-white/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EC4899]/15 text-[#F9A8D4]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-[#111113] p-4">
                      {analyzing && 'Analisando referências...'}
                      {improving && 'Gerando sugestões de copy...'}
                      {urlReading && 'Lendo site...'}
                      {contextLoading && 'Preparando contexto do negócio...'}
                      {generating && 'Gerando arte...'}
                      {factorLoading && `Aplicando Fator Criativo ${factorProgress}/5...`}
                      {editLoadingKey && 'Aplicando edição...'}
                    </div>
                  </div>
                )}
                {(storyImage || squareImage || factorLoading || (factorVariations && factorVariations.length > 0)) && (
                  <div className="mt-2 space-y-5 rounded-[24px] border border-white/10 bg-[#111113] p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/45">Artes prontas</h3>
                      {(storyImage || squareImage) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full text-xs text-white/50"
                          onClick={() => { setCurrentStage('result'); setRightPanelMode('generated-result'); }}
                        >
                          Ações e configuração
                        </Button>
                      )}
                    </div>

                    {(storyImage || squareImage) && (
                      <div className="flex flex-wrap gap-4">
                        {storyImage && renderBoardCard({
                          url: storyImage,
                          aspect: 'story',
                          title: 'Arte principal',
                          subtitle: selectedAspectRatio,
                          onDownload: () => download(storyImage, imageFileName(`criativo-principal-${selectedAspectRatio}`)),
                          onEdit: () => openEditTarget({ key: 'main:story', image: storyImage, aspect: 'story', prompt: buildFinalPromptForSelectedAspect(), label: 'Principal Story' }),
                        })}
                        {mainSquareLoading && (
                          <div className="w-full max-w-[280px]"><Skeleton className="aspect-square rounded-2xl" /></div>
                        )}
                        {squareImage && renderBoardCard({
                          url: squareImage,
                          aspect: 'square',
                          title: 'Versão 1080x1080',
                          onDownload: () => download(squareImage, imageFileName('criativo-square')),
                          onEdit: () => openEditTarget({ key: 'main:square', image: squareImage, aspect: 'square', prompt: buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution }), label: 'Principal 1:1' }),
                        })}
                      </div>
                    )}

                    {(factorLoading || (factorVariations && factorVariations.length > 0)) && (
                      <div className="space-y-3">
                        <p className="text-[11px] uppercase tracking-wider text-[#F9A8D4]">
                          Fator Criativo · 5 variações{factorLoading && ` (${factorProgress}/5)`}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const v = factorVariations?.[i];
                            const img = factorImages[i];
                            const sqImg = factorSquareImages[i];
                            const err = factorErrors[i];
                            return (
                              <div key={i} className="space-y-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-[#EC4899]">#{i + 1} {v?.eixo || 'variação'}</p>
                                {img ? renderBoardCard({
                                  url: img,
                                  aspect: 'story',
                                  compact: true,
                                  title: v?.nome,
                                  onDownload: () => download(img, imageFileName(`criativo-fator-${i + 1}-${v?.eixo || 'story'}`)),
                                  onEdit: () => openEditTarget({ key: `f${i}:story`, image: img, aspect: 'story', prompt: v?.promptCompleto || '', label: `Fator ${i + 1}` }),
                                }) : err ? (
                                  <div className="aspect-[9/16] rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[10px] text-destructive">{err}</div>
                                ) : (
                                  <Skeleton className="aspect-[9/16] rounded-2xl" />
                                )}
                                {factorSquareLoading[i] && <Skeleton className="aspect-square rounded-2xl" />}
                                {sqImg && renderBoardCard({
                                  url: sqImg,
                                  aspect: 'square',
                                  compact: true,
                                  subtitle: '1080x1080',
                                  onDownload: () => download(sqImg, imageFileName(`criativo-fator-${i + 1}-square`)),
                                  onEdit: () => openEditTarget({ key: `f${i}:square`, image: sqImg, aspect: 'square', prompt: v?.promptCompleto || '', label: `Fator ${i + 1} square` }),
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </section>
        </main>

        <div className="p-4 lg:pl-0">
          {renderRightPanel()}
        </div>
      </div>

      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] max-h-[95vh] p-0 bg-black/95 border-white/10 overflow-hidden">
          {lightboxUrl && (
            <div className="relative flex items-center justify-center w-full h-full">
              <img src={lightboxUrl} alt="preview" className="max-w-full max-h-[88vh] object-contain" />
              <button onClick={() => setLightboxUrl(null)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-2 backdrop-blur" aria-label="Fechar">
                <X className="h-4 w-4 text-white" />
              </button>
              <Button size="sm" variant="outline" onClick={() => download(lightboxUrl, `criativo-${Date.now()}.png`)} className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur">
                <Download className="h-3.5 w-3.5 mr-2" /> Baixar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StyleGalleryDialog
        open={styleGalleryOpen}
        onOpenChange={setStyleGalleryOpen}
        builtinTemplates={builtinTemplates}
        appliedTemplateId={selectedTemplate?.is_builtin ? selectedTemplate.id : null}
        onApply={applyTemplate}
        onViewDetails={(template) => {
          setPreviewTemplate(template);
          setRightPanelMode('template-detail');
          setStyleGalleryOpen(false);
        }}
        onOpenMyTemplates={() => {
          setStyleGalleryOpen(false);
          setRightPanelMode('template-library');
          fetchTemplates();
        }}
      />
    </div>
  );

  if (roleLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return conversationalLayout;

  return (
    <div className="p-3 sm:p-6 pt-20 lg:pt-6 space-y-4 sm:space-y-5 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            Criativo Studio
          </h1>
          <p className="text-[11px] sm:text-xs text-white/60 mt-1">
            Referências → Copy → Produto → Arte.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 sm:px-3">
          <RotateCcw className="h-3.5 w-3.5 sm:mr-2" />
          <span className="hidden sm:inline">Recomeçar</span>
        </Button>
      </header>

      <StepIndicator
        steps={['Referências', 'Copywriting', 'Produto', 'Gerar arte']}
        shortSteps={['Refs', 'Copy', 'Produto', 'Arte']}
        current={step}
        completed={completed}
        onJump={(i) => setStep(i)}
      />

      {/* STEP 1 */}
      {step === 0 && (
        <GlassCard className="space-y-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-accent" />
              1. Referências visuais
            </h2>
            <p className="text-xs text-white/60 mt-1">
              A IA decodifica as 8 dimensões: composição, fotografia, paleta, tipografia, camadas, hierarquia, espaço e mood.
            </p>
          </div>

          <ImageDropzone
            images={refImages}
            onChange={setRefImages}
            label="Solte, clique ou cole imagens de referência"
            maxImages={6}
          />

          <div className="flex gap-3">
            <Button size="sm" onClick={analyzeRefs} disabled={analyzing || refImages.length === 0}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              Analisar referências
            </Button>
            {analysis && (
              <Button size="sm" variant="outline" onClick={() => setStep(1)}>
                Avançar <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>

          {analysis && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <Section label="Composição">
                  <Info k="Formato" v={analysis.composicao.formato} />
                  <Info k="Estrutura" v={analysis.composicao.estrutura} />
                  <Info k="Hierarquia" v={analysis.composicao.hierarquia} />
                  <Info k="Silêncio" v={analysis.composicao.silencio} />
                </Section>
                <Section label="Fotografia">
                  <Info k="Tipo" v={analysis.fotografia.tipo} />
                  <Info k="Luz" v={analysis.fotografia.luz} />
                  <Info k="Tratamento" v={analysis.fotografia.tratamento} />
                  <Info k="Integração" v={analysis.fotografia.integracao} />
                </Section>
                <Section label="Tipografia">
                  <Info k="Família A" v={analysis.tipografia.familiaA} />
                  {analysis.tipografia.familiaB && <Info k="Família B" v={analysis.tipografia.familiaB} />}
                  <Info k="Contraste" v={analysis.tipografia.contraste} />
                  <Info k="Alinhamento" v={analysis.tipografia.alinhamento} />
                </Section>
                <Section label="Paleta">
                  <Info k="Saturação" v={analysis.paleta.saturacao} />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {analysis.paleta.hexes.map((c) => (
                      <div key={c} className="flex items-center gap-1 glass px-1.5 py-0.5 rounded">
                        <div className="w-3 h-3 rounded border border-white/10" style={{ background: c }} />
                        <span className="text-[10px] font-mono">{c}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>

              <Section label="Camadas (de baixo para cima)">
                <ol className="space-y-1 text-xs text-white/80 list-decimal list-inside">
                  {analysis.camadas.map((l, i) => <li key={i}>{l}</li>)}
                </ol>
              </Section>

              <div className="grid sm:grid-cols-3 gap-3">
                <Section label="Mood">
                  <p className="text-xs text-white/80">{analysis.mood.adjetivos.join(' · ')}</p>
                </Section>
                <Section label="Referências">
                  <p className="text-xs text-white/80">{analysis.mood.referencias.join(', ')}</p>
                </Section>
                <Section label="Evita">
                  <div className="flex flex-wrap gap-1">
                    {analysis.mood.evita.map((e) => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30">
                        {e}
                      </span>
                    ))}
                  </div>
                </Section>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  Design System Document (em inglês — vai direto pro prompt; editável)
                </p>
                <Textarea
                  value={editedDoc}
                  onChange={(e) => setEditedDoc(e.target.value)}
                  rows={8}
                  className="font-mono text-[11px]"
                />
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <GlassCard className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">2. Copywriting</h2>
            <p className="text-xs text-white/60 mt-1">
              Escreva sua copy. A IA devolve em 5 blocos visuais (label, título, subtítulo, dados, CTA). Você escolhe entre a sua original ou a sugestão.
            </p>
          </div>

          {/* URL do site/produto (opcional) */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> URL do site ou produto (opcional)
            </Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://exemplo.com/produto"
                value={productUrl}
                onChange={(e) => { setProductUrl(e.target.value); setUrlError(null); }}
                disabled={urlReading}
                className="text-[13px] sm:text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={fetchProductUrl}
                disabled={urlReading || !productUrl.trim()}
                className="shrink-0"
              >
                {urlReading
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <Globe className="h-3.5 w-3.5 mr-1.5" />}
                {urlContext ? 'Reler' : 'Ler site'}
              </Button>
            </div>
            {urlReading && (
              <p className="text-[11px] text-white/50 flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Lendo conteúdo do site…
              </p>
            )}
            {urlContext && !urlReading && (
              <p className="text-[11px] text-accent flex items-center gap-1.5">
                <Check className="h-3 w-3" /> Site lido — usado como base da sugestão
                {urlContext.title ? ` · ${urlContext.title.slice(0, 60)}` : ''}
              </p>
            )}
            {urlError && !urlReading && (
              <p className="text-[11px] text-destructive">{urlError}</p>
            )}
          </div>

          {/* Sugestão da IA + botão prominente */}
          {suggestedRawCopy && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-accent font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Copy sugerida pela IA
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => setRawCopy(suggestedRawCopy)}
                    className="bg-accent text-black hover:bg-accent/90 h-7 text-[11px]"
                  >
                    <Check className="h-3 w-3 mr-1" /> Usar copy sugerida
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateSuggestedCopy(urlContext)}
                    disabled={suggestingCopy}
                    className="h-7 text-[11px]"
                  >
                    {suggestingCopy
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <p className="text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap">{suggestedRawCopy}</p>
            </div>
          )}

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">
              Sua copy (editável)
            </Label>
            <Textarea
              placeholder={suggestedRawCopy || 'Ex: Estamos vendendo curso de kitesurf em Floripa, foco em iniciantes…'}
              value={rawCopy}
              onChange={(e) => setRawCopy(e.target.value)}
              rows={5}
              className="text-sm"
            />
          </div>

          {suggestingCopy && !suggestedRawCopy && (
            <p className="text-[11px] text-white/40 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Gerando uma sugestão prévia{urlContext ? ' com base no site' : ' baseada nas suas referências'}…
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button size="sm" onClick={improveCopy} disabled={improving}>
              {improving ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {copyVariations.length > 0 ? 'Refazer 4 sugestões' : 'Sugerir 4 versões otimizadas'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Button>
          </div>

          {(copyVariations.length > 0 || rawCopy.trim()) && (
            <div className="space-y-3 pt-2">
              {rawCopy.trim() && (
                <CopyOptionCard
                  title="Sua copy original"
                  selected={copyApproved && copySource === 'original'}
                  onSelect={() => {
                    setCopySource('original');
                    setSelectedVariationIdx(null);
                    setCopyApproved(true);
                    setStep(2);
                  }}
                >
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{rawCopy}</p>
                </CopyOptionCard>
              )}

              {copyVariations.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                  {copyVariations.map((variation, idx) => (
                    <CopyOptionCard
                      key={idx}
                      title={`Sugestão ${idx + 1}${variation.angulo ? ` — ${variation.angulo}` : ''}`}
                      accent
                      selected={copyApproved && copySource === 'ai' && selectedVariationIdx === idx}
                      onSelect={() => {
                        setCopySource('ai');
                        setSelectedVariationIdx(idx);
                        setCopyApproved(true);
                        setStep(2);
                      }}
                    >
                      {variation.label && <CopyBlock label="Label" value={variation.label} small uppercase />}
                      <CopyBlock label="Título" value={variation.titulo} bold />
                      {variation.subtitulo && <CopyBlock label="Subtítulo" value={variation.subtitulo} />}
                      {variation.dados && <CopyBlock label="Dados" value={variation.dados} small />}
                      <CopyBlock label="CTA" value={variation.cta} accent />
                      {variation.justificativa && (
                        <p className="text-[11px] text-white/50 italic pt-1 border-t border-white/10">
                          {variation.justificativa}
                        </p>
                      )}
                    </CopyOptionCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <GlassCard className="space-y-5">
          <div>
            <h2 className="text-base font-semibold">3. Logo, produto e cenário</h2>
            <p className="text-xs text-white/60 mt-1">
              Carregue o logo da marca e imagens reais de produto/pessoa/cenário. Ambos opcionais.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Logo da marca (opcional, 1 imagem)</p>
            <p className="text-[11px] text-white/50">
              A IA vai posicionar o logo discretamente em um canto, sem distorcer ou recolorir.
            </p>
            <ImageDropzone
              images={logoImage}
              onChange={setLogoImage}
              label="Solte, clique ou cole o logo (PNG transparente preferível)"
              maxImages={1}
            />
          </div>

          <div className="space-y-2 pt-3 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Produto, pessoa ou cenário (opcional)</p>
            <p className="text-[11px] text-white/50">
              Imagens reais que devem aparecer no criativo (rosto, produto, ambiente).
            </p>
            <ImageDropzone
              images={productImages}
              onChange={setProductImages}
              label="Solte, clique ou cole imagens do produto/pessoa"
              maxImages={6}
            />
            {productImages.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <Switch id="preserve" checked={preserveFaces} onCheckedChange={setPreserveFaces} />
                <Label htmlFor="preserve" className="text-xs cursor-pointer">
                  Preservar rostos / identidade exatamente como nas referências
                </Label>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button size="sm" onClick={() => setStep(3)}>
              Avançar <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Button>
          </div>
        </GlassCard>
      )}

      {/* STEP 4 */}
      {step === 3 && (
        <GlassCard className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">4. Gerar criativo</h2>
            <p className="text-xs text-white/60 mt-1">
              Renderiza copy, fotos e logo direto na imagem. Comece pelo Story 1080x1920 e depois recrie em quadrado.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="biz" className="text-[10px] uppercase tracking-wider text-white/40">
                Contexto do negócio (gerado pela IA)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={generateBusinessContext}
                disabled={contextLoading}
              >
                {contextLoading
                  ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  : <RefreshCw className="h-3 w-3 mr-1" />}
                Regenerar
              </Button>
            </div>
            <Textarea
              id="biz"
              placeholder={contextLoading ? 'Gerando contexto a partir da análise e copy…' : 'Será preenchido automaticamente. Você pode editar.'}
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              rows={2}
              className="text-[13px] sm:text-sm"
            />
            <p className="text-[10px] text-white/40">A IA cria com base no mood, referências e copy aprovada. Edite se quiser ajustar tom ou nicho.</p>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">
              Modelo de geração (Google Gemini)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODEL_OPTIONS.map((m) => {
                const active = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={cn(
                      'glass rounded-lg px-3 py-2 text-left transition border',
                      active
                        ? 'border-accent/60 bg-accent/10 ring-1 ring-accent/40'
                        : 'border-white/10 hover:border-white/20',
                    )}
                  >
                    <div className={cn('text-sm font-semibold', active ? 'text-accent' : 'text-white')}>
                      {m.name}
                    </div>
                    <div className="text-[10px] text-white/60 leading-tight mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/40 mt-1.5">
              As 5 variações do Fator Criativo usam <span className="text-white/70">o mesmo modelo selecionado acima</span>.
            </p>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Idioma do texto na arte</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="text-[13px] sm:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                <ChevronDown className={cn('h-3.5 w-3.5 mr-1 transition-transform', advancedOpen && 'rotate-180')} />
                Opções avançadas (DO NOT INCLUDE)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                placeholder="Uma instrução por linha. Ex:&#10;cores neon&#10;sombras pesadas&#10;clip-art genérico"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={3}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-white/40 mt-1">
                Itens que a IA deve evitar. Já incluímos automaticamente o que veio do "Evita" da análise visual.
              </p>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <Button size="sm" onClick={() => generate('story')} disabled={generating} className="flex-1 sm:flex-none">
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
                {storyImage ? 'Gerar Story novamente' : 'Gerar Story (1080x1920)'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
            </div>

            {storyImage && (
              <div className="flex flex-col sm:items-end gap-1">
                <button
                  type="button"
                  onClick={applyFatorCriativo}
                  disabled={factorLoading}
                  className={cn(
                    'relative overflow-hidden rounded-lg bg-white text-black px-5 py-2.5 text-sm font-semibold',
                    'shadow-[0_0_24px_rgba(255,255,255,0.35)] hover:shadow-[0_0_36px_rgba(255,255,255,0.6)]',
                    'transition-all disabled:opacity-70 disabled:cursor-wait',
                    'before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.9)_50%,transparent_70%)] before:bg-[length:200%_100%]',
                    !factorLoading && 'before:animate-[shimmer_2.4s_ease-in-out_infinite]',
                  )}
                >
                  <span className="relative flex items-center gap-2">
                    {factorLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando {factorProgress}/5…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Aplicar Fator Criativo
                      </>
                    )}
                  </span>
                </button>
                <p className="text-[10px] text-white/40 sm:text-right">
                  Gera 5 variações estratégicas para alimentar o Andromeda do Meta.
                </p>
              </div>
            )}
          </div>

          {storyImage && (() => {
            const mainStoryKey = 'main:story';
            const mainSquareKey = 'main:square';
            const mainStoryPrompt = buildFinalPrompt('story', { selectedAspectRatio, selectedResolution });
            const mainSquarePrompt = buildFinalPrompt('square', { selectedAspectRatio: '1:1', selectedResolution });

            const renderEditPanel = (key: string, originalImage: string, aspect: 'story' | 'square', originalPrompt: string) => {
              if (editPanelKey !== key) return null;
              const loading = editLoadingKey === key;
              return (
                <div className="rounded-md border border-accent/30 bg-accent/5 p-2 space-y-1.5">
                  <Textarea
                    placeholder="Ex.: troque o CTA por 'Comece agora', tire o galho da esquerda…"
                    value={editFeedback}
                    onChange={(e) => setEditFeedback(e.target.value)}
                    rows={3}
                    className="text-[11px]"
                    disabled={loading}
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => editArt(key, originalImage, aspect, originalPrompt)}
                      disabled={loading || !editFeedback.trim()}
                      className="flex-1 h-7 text-[10px] bg-accent text-black hover:bg-accent/90"
                    >
                      {loading
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Check className="h-3 w-3 mr-1" />}
                      Aplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditPanelKey(null); setEditFeedback(''); }}
                      disabled={loading}
                      className="h-7 text-[10px]"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              );
            };

            const renderEditButton = (key: string) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditPanelKey(editPanelKey === key ? null : key);
                  setEditFeedback('');
                }}
                className="w-full h-7 text-[10px]"
              >
                <Pencil className="h-3 w-3 mr-1" /> Editar com I.A
              </Button>
            );

            const renderEditedColumns = (sourceKey: string, aspect: 'story' | 'square', srcLabel: string) =>
              (editedVersions[sourceKey] || []).map((ed, idx) => (
                <div key={`${sourceKey}-edit-${idx}`} className="space-y-2 min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-accent/80 font-semibold truncate">
                    ✎ {srcLabel} · edit {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(ed.url)}
                    className={cn(
                      'group relative block w-full rounded-lg overflow-hidden glass cursor-zoom-in',
                      aspect === 'story' ? 'aspect-[9/16]' : 'aspect-square',
                    )}
                  >
                    <img src={ed.url} alt="editado" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </button>
                  <p className="text-[10px] text-white/50 italic line-clamp-2" title={ed.feedback}>
                    "{ed.feedback}"
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(ed.url, `criativo-edit-${Date.now()}.png`)}
                    className="w-full h-7 text-[10px]"
                  >
                    <Download className="h-3 w-3 mr-1" /> Baixar editada
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => discardEdit(sourceKey, idx)}
                    className="w-full h-7 text-[10px] text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Descartar
                  </Button>
                </div>
              ));

            return (
              <div className={cn(
                'grid gap-3 sm:gap-4 pt-2',
                'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
              )}>
                {/* Main column */}
                <div className="space-y-2 min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-accent font-semibold">
                    Principal
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(storyImage)}
                    className="group relative block w-full rounded-lg overflow-hidden glass aspect-[9/16] cursor-zoom-in"
                  >
                    <img src={storyImage} alt="story" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(storyImage, `criativo-story-${Date.now()}.png`)}
                    className="w-full h-7 text-[10px]"
                  >
                    <Download className="h-3 w-3 mr-1" /> Baixar Story
                  </Button>
                  {!squareImage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recreateSquare('main')}
                      disabled={mainSquareLoading}
                      className="w-full h-7 text-[10px]"
                    >
                      {mainSquareLoading
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <RefreshCw className="h-3 w-3 mr-1" />}
                      Recriar em 1080x1080
                    </Button>
                  )}
                  {renderEditButton(mainStoryKey)}
                  {renderEditPanel(mainStoryKey, storyImage, 'story', mainStoryPrompt)}
                  {(squareImage || mainSquareLoading) && (
                    <>
                      <button
                        type="button"
                        onClick={() => squareImage && setLightboxUrl(squareImage)}
                        disabled={!squareImage}
                        className={cn(
                          'group relative block w-full rounded-lg overflow-hidden glass aspect-square',
                          squareImage ? 'cursor-zoom-in' : 'cursor-default',
                        )}
                      >
                        {squareImage ? (
                          <>
                            <img src={squareImage} alt="square" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                            </div>
                          </>
                        ) : (
                          <Skeleton className="w-full h-full" />
                        )}
                      </button>
                      {squareImage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => download(squareImage, `criativo-square-${Date.now()}.png`)}
                            className="w-full h-7 text-[10px]"
                          >
                            <Download className="h-3 w-3 mr-1" /> Baixar 1080x1080
                          </Button>
                          {renderEditButton(mainSquareKey)}
                          {renderEditPanel(mainSquareKey, squareImage, 'square', mainSquarePrompt)}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Edições da principal (story) */}
                {renderEditedColumns(mainStoryKey, 'story', 'Principal')}
                {/* Edições da principal (square) */}
                {squareImage && renderEditedColumns(mainSquareKey, 'square', 'Principal 1:1')}

                {/* Fator Criativo columns */}
                {(factorVariations || factorLoading) && Array.from({ length: 5 }).flatMap((_, i) => {
                  const v = factorVariations?.[i];
                  const img = factorImages[i];
                  const err = factorErrors[i];
                  const sqImg = factorSquareImages[i];
                  const sqLoading = factorSquareLoading[i];
                  const stKey = `f${i}:story`;
                  const sqKey = `f${i}:square`;
                  const stPrompt = v?.promptCompleto || '';

                  const column = (
                    <div key={`f${i}`} className="space-y-2 min-w-0">
                      <p className="text-[9px] uppercase tracking-wider text-accent font-semibold truncate">
                        #{i + 1} {v?.eixo || '...'}
                      </p>
                      <button
                        type="button"
                        onClick={() => img && setLightboxUrl(img)}
                        disabled={!img}
                        className={cn(
                          'group relative block w-full rounded-lg overflow-hidden glass aspect-[9/16]',
                          img ? 'cursor-zoom-in' : 'cursor-default',
                        )}
                      >
                        {img ? (
                          <>
                            <img src={img} alt={v?.nome || `variação ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                            </div>
                          </>
                        ) : err ? (
                          <div className="absolute inset-0 flex items-center justify-center p-2 text-[10px] text-destructive text-center">
                            Erro ao gerar
                          </div>
                        ) : (
                          <Skeleton className="w-full h-full" />
                        )}
                      </button>
                      {v && (
                        <p className="text-[10px] text-white/70 font-medium truncate" title={v.nome}>
                          {v.nome}
                        </p>
                      )}
                      {img && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => download(img, `fator-${i + 1}-${v?.eixo}-${Date.now()}.png`)}
                          className="w-full h-7 text-[10px]"
                        >
                          <Download className="h-3 w-3 mr-1" /> Baixar Story
                        </Button>
                      )}
                      {img && !sqImg && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recreateSquare(i)}
                          disabled={sqLoading}
                          className="w-full h-7 text-[10px]"
                        >
                          {sqLoading
                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            : <RefreshCw className="h-3 w-3 mr-1" />}
                          Recriar em 1080x1080
                        </Button>
                      )}
                      {img && (
                        <>
                          {renderEditButton(stKey)}
                          {renderEditPanel(stKey, img, 'story', stPrompt)}
                        </>
                      )}
                      {(sqImg || sqLoading) && (
                        <>
                          <button
                            type="button"
                            onClick={() => sqImg && setLightboxUrl(sqImg)}
                            disabled={!sqImg}
                            className={cn(
                              'group relative block w-full rounded-lg overflow-hidden glass aspect-square',
                              sqImg ? 'cursor-zoom-in' : 'cursor-default',
                            )}
                          >
                            {sqImg ? (
                              <>
                                <img src={sqImg} alt={`variação ${i + 1} 1080`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                                </div>
                              </>
                            ) : (
                              <Skeleton className="w-full h-full" />
                            )}
                          </button>
                          {sqImg && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => download(sqImg, `fator-${i + 1}-square-${Date.now()}.png`)}
                                className="w-full h-7 text-[10px]"
                              >
                                <Download className="h-3 w-3 mr-1" /> Baixar 1080x1080
                              </Button>
                              {renderEditButton(sqKey)}
                              {renderEditPanel(sqKey, sqImg, 'square', stPrompt)}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );

                  return [
                    column,
                    ...renderEditedColumns(stKey, 'story', `#${i + 1}`),
                    ...(sqImg ? renderEditedColumns(sqKey, 'square', `#${i + 1} 1:1`) : []),
                  ];
                })}
              </div>
            );
          })()}
        </GlassCard>
      )}

      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] max-h-[95vh] p-0 bg-black/95 border-white/10 overflow-hidden">
          {lightboxUrl && (
            <div className="relative flex items-center justify-center w-full h-full">
              <img
                src={lightboxUrl}
                alt="preview"
                className="max-w-full max-h-[88vh] object-contain"
              />
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-2 backdrop-blur"
                aria-label="Fechar"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => download(lightboxUrl, `criativo-${Date.now()}.png`)}
                className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur"
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Baixar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-xs">
      <span className="text-white/40">{k}: </span>
      <span className="text-white/85">{v}</span>
    </div>
  );
}

function AntiPadroesList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((rule, i) => (
        <li key={i} className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive/90 leading-relaxed">
          {rule}
        </li>
      ))}
    </ul>
  );
}

function CopyOptionCard({
  title, children, selected, onSelect, accent,
}: {
  title: string; children: React.ReactNode; selected: boolean; onSelect: () => void; accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 border space-y-2 flex flex-col',
        accent ? 'bg-accent/5 border-accent/20' : 'bg-white/5 border-white/10',
        selected && 'ring-2 ring-accent',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/80">{title}</p>
        {selected && <Check className="h-3.5 w-3.5 text-accent" />}
      </div>
      <div className="space-y-2 flex-1">{children}</div>
      <Button
        size="sm"
        variant={selected ? 'default' : 'outline'}
        onClick={onSelect}
        className={cn('w-full mt-2', selected && 'bg-accent text-black hover:bg-accent/90')}
      >
        {selected ? 'Selecionada' : 'Usar essa'}
      </Button>
    </div>
  );
}

function CopyBlock({
  label, value, bold, small, uppercase, accent,
}: { label: string; value: string; bold?: boolean; small?: boolean; uppercase?: boolean; accent?: boolean }) {
  return (
    <div>
      <p className={cn('text-[10px] uppercase tracking-wider mb-0.5', accent ? 'text-accent' : 'text-white/40')}>{label}</p>
      <p className={cn(
        small ? 'text-[11px]' : 'text-sm',
        bold && 'font-semibold',
        uppercase && 'uppercase tracking-wider',
        accent && 'font-medium',
      )}>{value}</p>
    </div>
  );
}
