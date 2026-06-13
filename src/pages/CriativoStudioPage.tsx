import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useClients } from '@/hooks/useClients';
import { useClientEditorial, useSaveClientEditorial } from '@/hooks/useClientEditorial';
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
import { EditorialDrawer } from '@/components/criativo/EditorialDrawer';
import { cn } from '@/lib/utils';
import { recordAiUsage } from '@/lib/aiUsageTracker';
import type { VisualAnalysis, CopyResult } from '@/types/criativo';
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
  BookOpen,
  Save,
} from 'lucide-react';


type ImageQuality = 'low' | 'medium' | 'high';
const IMAGE_MODEL = 'gpt-image-2' as const;
const MODEL_OPTIONS: { id: ImageQuality; name: string; desc: string; usage: 'image-gemini-flash' | 'image-gemini-flash-2' | 'image-gemini-pro' }[] = [
  { id: 'low', name: 'Padrão', desc: 'Rápido e econômico', usage: 'image-gemini-flash' },
  { id: 'medium', name: 'Recomendado', desc: 'Qualidade e velocidade', usage: 'image-gemini-flash-2' },
  { id: 'high', name: 'Máxima qualidade', desc: 'Melhor resultado, mais lento', usage: 'image-gemini-pro' },
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

  const [step, setStep] = useState(0);

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
  const [quality, setQuality] = useState<ImageQuality>('medium');
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

  // Edições por imagem
  type EditedVersion = { url: string; feedback: string };
  const [editedVersions, setEditedVersions] = useState<Record<string, EditedVersion[]>>({});
  const [crossAspectVersions, setCrossAspectVersions] = useState<Record<string, EditedVersion[]>>({});
  const [aspectLoadingKey, setAspectLoadingKey] = useState<string | null>(null);
  const [editPanelKey, setEditPanelKey] = useState<string | null>(null);
  const [editFeedback, setEditFeedback] = useState('');
  const [editLoadingKey, setEditLoadingKey] = useState<string | null>(null);

  // Editorial Criativo por cliente
  const { data: clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editorialDrawerOpen, setEditorialDrawerOpen] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const { data: clientEditorial } = useClientEditorial(selectedClientId);
  const saveEditorial = useSaveClientEditorial();

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate('/dashboard');
  }, [isAdmin, roleLoading, navigate]);

  const completed = [!!analysis, copyApproved, true, !!storyImage];
  const selectedCopy: CopyResult | null =
    selectedVariationIdx !== null ? copyVariations[selectedVariationIdx] || null : null;

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

  const generateSuggestedCopy = async (ctx: typeof urlContext) => {
    if (!analysis) return;
    setSuggestingCopy(true);
    setSuggestedRawCopy('');
    try {
      const { data, error } = await supabase.functions.invoke('criativo-suggest-copy', {
        body: { analysis, language, urlContext: ctx || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      recordAiUsage('text-flash');
      const s = ((data as any)?.suggestion || '').trim();
      if (s) setSuggestedRawCopy(s);
    } catch (e) {
      console.warn('suggest-copy', e);
    } finally {
      setSuggestingCopy(false);
    }
  };

  // Auto-suggest a draft copy when entering Step 2 with refs analyzed
  useEffect(() => {
    if (step !== 1 || !analysis || suggestedRawCopy || suggestingCopy) return;
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
      const url = (data as any).editedImageUrl as string;
      setEditedVersions((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { url, feedback }],
      }));
      setEditPanelKey(null);
      setEditFeedback('');
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

  const discardAspect = (key: string, idx: number) => {
    setCrossAspectVersions((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== idx),
    }));
  };

  const recreateAspect = async (
    sourceKey: string,
    sourceUrl: string,
    sourceAspect: 'story' | 'square',
    sourcePrompt: string,
  ) => {
    const target: 'story' | 'square' = sourceAspect === 'story' ? 'square' : 'story';
    setAspectLoadingKey(sourceKey);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          prompt: sourcePrompt || buildFinalPrompt(target),
          aspectRatio: target,
          model: IMAGE_MODEL,
          quality,
          isVariation: true,
          productImages,
          logoImage: logoImage[0] || null,
          aspectReference: sourceUrl,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const usageType = MODEL_OPTIONS.find((m) => m.id === quality)?.usage || 'image-gemini-flash-2';
      recordAiUsage(usageType);
      const url = (data as any).imageUrl as string;
      const label = target === 'square' ? '→ 1:1' : '→ Story 9:16';
      setCrossAspectVersions((prev) => ({
        ...prev,
        [sourceKey]: [...(prev[sourceKey] || []), { url, feedback: label }],
      }));
      toast({ title: target === 'square' ? 'Versão 1080×1080 gerada' : 'Versão Story 9:16 gerada' });
    } catch (e: any) {
      toast({ title: 'Erro ao recriar', description: e?.message || 'Erro', variant: 'destructive' });
    } finally {
      setAspectLoadingKey(null);
    }
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
      setShowSavePrompt(true);
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
      setSelectedVariationIdx(null);
    } catch (e: any) {
      toast({ title: 'Erro ao melhorar copy', description: e.message, variant: 'destructive' });
    } finally {
      setImproving(false);
    }
  };

  const buildFinalPrompt = (aspect: 'story' | 'square') => {
    const params = {
      businessContext,
      productImages,
      logoImage: logoImage[0] || null,
      designSystemDoc: editedDoc || analysis?.designSystemDoc || '',
      aspectRatio: aspect,
      selectedCopy,
      rawCopy,
      copySource,
      mood: analysis?.mood || { adjetivos: [], referencias: [], evita: [] },
      negativePrompt,
      language,
      storyReference: aspect === 'square' ? storyImage : null,
    };

    const {
      businessContext: businessContextP,
      productImages: productImagesP,
      logoImage: logoImageP,
      designSystemDoc,
      aspectRatio,
      selectedCopy: selectedCopyP,
      rawCopy: rawCopyP,
      copySource: copySourceP,
      mood,
      negativePrompt: negativePromptP,
      language: languageP,
      storyReference,
    } = params;

    const lines: string[] = [];

    // [INTRODUCTION]
    if (businessContextP?.trim()) {
      lines.push(`[INTRODUCTION]\n${businessContextP.trim()}`);
    }

    // [REFERENCE IMAGES]
    const totalRefs = productImagesP.length + (logoImageP ? 1 : 0) + (!!(aspectRatio === 'square' && storyReference) ? 1 : 0);
    if (totalRefs > 0) {
      lines.push(
        `[REFERENCE IMAGES]\n` +
        `${productImagesP.length > 0 ? `- ${productImagesP.length} product/person image(s): use as the exact source of truth for faces, body, product appearance. Preserve every detail — do not alter faces, skin tone, hair, clothing or product shape.\n` : ''}` +
        `${logoImageP ? `- 1 brand logo: place it discreetly in a corner. Do not distort, recolor or recreate the logo — use it exactly as provided.\n` : ''}` +
        `${aspectRatio === 'square' && storyReference ? `- 1 story reference: maintain full visual consistency with this approved story version.\n` : ''}`
      );
    }

    // [DESIGN SYSTEM]
    if (designSystemDoc?.trim()) {
      lines.push(`[DESIGN SYSTEM]\n${designSystemDoc.trim()}`);
    }

    // [COMPOSITION]
    lines.push(
      `[COMPOSITION]\n` +
      `Recreate the layout, proportions and element positioning exactly as defined in the Design System above.\n` +
      `Maintain the same visual structure — do not invent new layouts.\n` +
      `Every element must stay inside the safe zone: 60px margin on all sides.\n` +
      `${aspectRatio === 'square' && storyReference ? 'Adapt the approved story composition to a perfect 1:1 square format while preserving all visual decisions.' : ''}`
    );

    // [TEXT BLOCKS]
    if (copySourceP === 'ai' && selectedCopyP) {
      lines.push(
        `[TEXT BLOCKS]\n` +
        `Render the following text blocks exactly as written. Do not translate, paraphrase or alter any word.\n` +
        `Use strong typographic hierarchy — each block must be visually distinct in size, weight and placement:\n\n` +
        `LABEL: ${selectedCopyP.label}\n` +
        `MAIN TITLE: ${selectedCopyP.titulo}\n` +
        `SUBTITLE: ${selectedCopyP.subtitulo}\n` +
        `${selectedCopyP.dados ? `DATA LINE: ${selectedCopyP.dados}\n` : ''}` +
        `CTA: ${selectedCopyP.cta}`
      );
    } else if (rawCopyP?.trim()) {
      lines.push(
        `[TEXT BLOCKS]\n` +
        `Render the following copy exactly as written. Do not translate, paraphrase or alter any word:\n\n` +
        rawCopyP.trim()
      );
    }

    // [PHOTOGRAPHY & LIGHTING]
    const hasPersonOrProduct = productImagesP.length > 0;
    if (hasPersonOrProduct) {
      lines.push(
        `[PHOTOGRAPHY & LIGHTING]\n` +
        `Simulate professional advertising photography:\n` +
        `- Soft frontal key light with gentle fill light balancing shadows\n` +
        `- Subtle rim light to define subject contours\n` +
        `- Natural cinematic lighting — no harsh shadows, no flat studio look\n` +
        `- Realistic skin texture with natural pores and micro-details\n` +
        `- No plastic skin, no artificial smoothing, no AI-generated appearance\n` +
        `- Shallow depth of field to separate subject from background\n` +
        `- Color grading consistent with the mood defined below`
      );
    }

    // [VISUAL QUALITY]
    lines.push(
      `[VISUAL QUALITY]\n` +
      `The final result must look like a premium Brazilian advertising campaign created by a senior art director.\n` +
      `- Agency-made appearance: polished, intentional, professional\n` +
      `- Perfect typographic hierarchy: kerning balanced, tracking professional, no crowded text\n` +
      `- Clean composition with generous negative space\n` +
      `- Cinematic color grading: balanced contrast, refined sharpness, natural highlights\n` +
      `- No visual pollution, no generic stock photo look, no clip-art elements\n` +
      `- Luxury advertising finish: every detail considered`
    );

    // [MOOD]
    if ((mood?.adjetivos?.length ?? 0) > 0 || (mood?.referencias?.length ?? 0) > 0) {
      lines.push(
        `[MOOD]\n` +
        `${mood.adjetivos.length > 0 ? `Tone: ${mood.adjetivos.join(' · ')}\n` : ''}` +
        `${mood.referencias.length > 0 ? `Visual references: ${mood.referencias.join(', ')}\n` : ''}`
      );
    }

    // [DO NOT INCLUDE]
    const doNotList: string[] = [];
    if ((mood?.evita?.length ?? 0) > 0) doNotList.push(...mood.evita);
    if (negativePromptP?.trim()) {
      doNotList.push(...negativePromptP.trim().split('\n').map((l) => l.trim()).filter(Boolean));
    }
    doNotList.push(
      'watermarks or signatures',
      'text outside the defined safe zone',
      'invented logos or brand marks',
      'neon colors unless specified in the design system',
      'heavy drop shadows unless specified',
      'generic clip-art or stock illustration style',
      'AI-generated appearance',
    );
    lines.push(`[DO NOT INCLUDE]\n${doNotList.map((i) => `- ${i}`).join('\n')}`);

    // [LANGUAGE]
    lines.push(
      `[LANGUAGE]\n` +
      `All text rendered inside the image must be in ${languageP || 'Português (BR)'}. ` +
      `Do not use any other language for any text element inside the artwork.`
    );

    // Final instruction
    lines.push(
      `Generate a complete, polished professional advertising artwork. ` +
      `Every decision — layout, typography, color, lighting, composition — must reflect the work of a senior art director at a top Brazilian advertising agency.`
    );

    return lines.join('\n\n');
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
      const originalPrompt = buildFinalPrompt(aspect);
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
                model: IMAGE_MODEL,
                quality,
                isVariation: true,
                productImages,
                logoImage: logoImage[0] || null,
                storyReference: aspect === 'square' ? storyImage : null,
              },
            });
            if (ge) throw ge;
            if ((gd as any)?.error) throw new Error((gd as any).error);
            recordAiUsage(MODEL_OPTIONS.find((m) => m.id === quality)?.usage || 'image-gemini-flash-2');
            setFactorImages((prev) => {
              const next = [...prev];
              next[i] = (gd as any).imageUrl;
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
      const prompt = buildFinalPrompt(aspect);
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          prompt,
          aspectRatio: aspect,
          model: IMAGE_MODEL,
          quality,
          productImages,
          logoImage: logoImage[0] || null,
          storyReference: null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const usageType = MODEL_OPTIONS.find((m) => m.id === quality)?.usage || 'image-gemini-flash-2';
      recordAiUsage(usageType);
      setStoryImage((data as any).imageUrl);
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
        ? buildFinalPrompt('square')
        : factorVariations?.[target]?.promptCompleto;
      if (!prompt) throw new Error('Prompt não disponível');
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          prompt,
          aspectRatio: 'square',
          model: IMAGE_MODEL,
          quality,
          isVariation: typeof target === 'number',
          productImages,
          logoImage: logoImage[0] || null,
          storyReference: storyImage,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const usageType = MODEL_OPTIONS.find((m) => m.id === quality)?.usage || 'image-gemini-flash-2';
      recordAiUsage(usageType);
      const url = (data as any).imageUrl as string;
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
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const reset = () => {
    setStep(0);
    setRefImages([]);
    setAnalysis(null);
    setEditedDoc('');
    setRawCopy('');
    setCopyVariations([]);
    setSelectedVariationIdx(null);
    setSuggestedRawCopy('');
    setCopyApproved(false);
    setCopySource('ai');
    setLogoImage([]);
    setProductImages([]);
    setPreserveFaces(true);
    setBusinessContext('');
    setNegativePrompt('');
    setStoryImage(null);
    setSquareImage(null);
    setFactorSquareImages([null, null, null, null, null]);
    setFactorSquareLoading([false, false, false, false, false]);
    setProductUrl('');
    setUrlContext(null);
    setUrlError(null);
    setEditedVersions({});
    setCrossAspectVersions({});
    setAspectLoadingKey(null);
    setEditPanelKey(null);
    setEditFeedback('');
    setSelectedClientId(null);
    setShowSavePrompt(false);
  };

  if (roleLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

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
          {/* Seletor de cliente + Editorial Criativo */}
          <div className="space-y-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-white/40 shrink-0">
                Cliente (opcional)
              </Label>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedClientId || ''}
                onValueChange={(v) => {
                  setSelectedClientId(v || null);
                  setShowSavePrompt(false);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {(clients || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditorialDrawerOpen(true)}
                  className="shrink-0 gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Editorial Criativo
                </Button>
              )}
            </div>

            {selectedClientId && clientEditorial && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-xs font-medium text-accent">
                    Editorial Criativo carregado —{' '}
                    {(clients || []).find((c) => c.id === selectedClientId)?.name}
                  </span>
                  <span className="text-[10px] text-white/40 ml-auto">
                    {new Date(clientEditorial.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clientEditorial.visual_analysis?.paleta?.hexes?.slice(0, 5).map((c) => (
                    <div key={c} className="flex items-center gap-1 glass px-1.5 py-0.5 rounded">
                      <div className="w-3 h-3 rounded border border-white/10 shrink-0" style={{ background: c }} />
                      <span className="text-[10px] font-mono">{c}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/60">
                  {clientEditorial.visual_analysis?.mood?.adjetivos?.join(' · ')}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      setAnalysis(clientEditorial.visual_analysis);
                      setEditedDoc(clientEditorial.design_system_doc);
                      setShowSavePrompt(false);
                      setStep(1);
                    }}
                    className="flex-1"
                  >
                    Usar este Editorial e avançar →
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditorialDrawerOpen(true)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {selectedClientId && clientEditorial === null && (
              <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                ⚠ Este cliente ainda não tem Editorial Criativo. Faça a análise abaixo para criar o primeiro.
              </p>
            )}
          </div>

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

              {/* Save prompt */}
              {showSavePrompt && (
                <div className="rounded-lg border border-white/15 bg-white/[0.03] p-3 space-y-2.5">
                  <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5 text-accent" />
                    Salvar como Editorial Criativo?
                  </p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedClientId || ''}
                      onValueChange={(v) => setSelectedClientId(v || null)}
                    >
                      <SelectTrigger className="text-xs flex-1">
                        <SelectValue placeholder="Selecionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(clients || []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedClientId || saveEditorial.isPending}
                      onClick={async () => {
                        if (!selectedClientId || !analysis) return;
                        try {
                          await saveEditorial.mutateAsync({
                            clientId: selectedClientId,
                            designSystemDoc: editedDoc,
                            visualAnalysis: analysis,
                          });
                          setShowSavePrompt(false);
                          toast({ title: 'Editorial Criativo salvo' });
                        } catch (e: any) {
                          toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
                        }
                      }}
                      className="shrink-0"
                    >
                      {saveEditorial.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSavePrompt(false)}
                      className="shrink-0 text-white/40"
                    >
                      Pular
                    </Button>
                  </div>
                </div>
              )}
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
              Qualidade da geração (GPT Image 2)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODEL_OPTIONS.map((m) => {
                const active = quality === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setQuality(m.id)}
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
              As 5 variações do Fator Criativo usam <span className="text-white/70">a mesma qualidade selecionada acima</span>.
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
            const mainStoryPrompt = buildFinalPrompt('story');
            const mainSquarePrompt = buildFinalPrompt('square');

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

            const renderAspectButton = (
              sourceKey: string,
              sourceUrl: string,
              sourceAspect: 'story' | 'square',
              sourcePrompt: string,
            ) => {
              const target = sourceAspect === 'story' ? 'square' : 'story';
              const label = target === 'square' ? 'Recriar em 1:1 (1080)' : 'Recriar em Story 9:16';
              const loading = aspectLoadingKey === sourceKey;
              return (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => recreateAspect(sourceKey, sourceUrl, sourceAspect, sourcePrompt)}
                  disabled={loading || aspectLoadingKey !== null}
                  className="w-full h-7 text-[10px]"
                >
                  {loading
                    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    : <RefreshCw className="h-3 w-3 mr-1" />}
                  {label}
                </Button>
              );
            };

            const renderEditedColumns = (
              sourceKey: string,
              aspect: 'story' | 'square',
              srcLabel: string,
              sourcePrompt: string,
            ) =>
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
                  {renderAspectButton(`${sourceKey}-edit-${idx}`, ed.url, aspect, sourcePrompt)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => discardEdit(sourceKey, idx)}
                    className="w-full h-7 text-[10px] text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Descartar
                  </Button>
                  {renderCrossAspectColumnsInline(`${sourceKey}-edit-${idx}`, aspect)}
                </div>
              ));

            const renderCrossAspectColumnsInline = (sourceKey: string, sourceAspect: 'story' | 'square') => {
              const target = sourceAspect === 'story' ? 'square' : 'story';
              return (crossAspectVersions[sourceKey] || []).map((v, idx) => (
                <div key={`${sourceKey}-cross-${idx}`} className="space-y-1.5 pt-2 border-t border-white/10">
                  <p className="text-[9px] uppercase tracking-wider text-accent/80 font-semibold truncate">
                    {v.feedback}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(v.url)}
                    className={cn(
                      'group relative block w-full rounded-lg overflow-hidden glass cursor-zoom-in',
                      target === 'story' ? 'aspect-[9/16]' : 'aspect-square',
                    )}
                  >
                    <img src={v.url} alt="versão" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(v.url, `criativo-${target}-${Date.now()}.png`)}
                    className="w-full h-7 text-[10px]"
                  >
                    <Download className="h-3 w-3 mr-1" /> Baixar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => discardAspect(sourceKey, idx)}
                    className="w-full h-7 text-[10px] text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Descartar
                  </Button>
                </div>
              ));
            };


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
                  {renderAspectButton(mainStoryKey, storyImage, 'story', mainStoryPrompt)}
                  {renderCrossAspectColumnsInline(mainStoryKey, 'story')}
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
                          {renderAspectButton(mainSquareKey, squareImage, 'square', mainSquarePrompt)}
                          {renderCrossAspectColumnsInline(mainSquareKey, 'square')}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Edições da principal (story) */}
                {renderEditedColumns(mainStoryKey, 'story', 'Principal', mainStoryPrompt)}
                {/* Edições da principal (square) */}
                {squareImage && renderEditedColumns(mainSquareKey, 'square', 'Principal 1:1', mainSquarePrompt)}

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
                    ...renderEditedColumns(stKey, 'story', `#${i + 1}`, stPrompt),
                    ...(sqImg ? renderEditedColumns(sqKey, 'square', `#${i + 1} 1:1`, stPrompt) : []),
                  ];
                })}
              </div>
            );
          })()}
        </GlassCard>
      )}

      <EditorialDrawer
        open={editorialDrawerOpen}
        onOpenChange={setEditorialDrawerOpen}
        editorial={clientEditorial ?? null}
        clientName={(clients || []).find((c) => c.id === selectedClientId)?.name || ''}
        onRequestUpdate={() => {
          setAnalysis(null);
          setEditedDoc('');
          setShowSavePrompt(false);
          setRefImages([]);
        }}
      />

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
