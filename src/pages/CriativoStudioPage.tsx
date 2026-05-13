import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { StepIndicator } from '@/components/criativo/StepIndicator';
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
} from 'lucide-react';

interface VisualAnalysis {
  paletaCores: string[];
  tipografia: string;
  composicao: string;
  elementosGraficos: string;
  estilo: string;
  mood: string;
  promptVisual: string;
}

interface CopyResult {
  headline: string;
  subheadline: string;
  cta: string;
  justificativa: string;
}

const FREEPIK_MODELS = [
  { id: 'classic-fast', name: 'Classic Fast', desc: 'Rápido e barato — bom para testes' },
  { id: 'flux-dev', name: 'Flux Dev', desc: 'Equilíbrio entre qualidade e velocidade' },
  { id: 'mystic', name: 'Mystic 2K', desc: 'Alta qualidade fotorrealista' },
  { id: 'imagen3', name: 'Imagen 3', desc: 'Google Imagen via Freepik' },
] as const;

export default function CriativoStudioPage() {
  const { isAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step state
  const [step, setStep] = useState(0);

  // Step 1
  const [refImages, setRefImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');

  // Step 2
  const [rawCopy, setRawCopy] = useState('');
  const [improving, setImproving] = useState(false);
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const [copyApproved, setCopyApproved] = useState(false);

  // Step 3
  const [productImages, setProductImages] = useState<string[]>([]);

  // Step 4
  const [model, setModel] = useState<typeof FREEPIK_MODELS[number]['id']>('flux-dev');
  const [generating, setGenerating] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [squareImage, setSquareImage] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate('/dashboard');
  }, [isAdmin, roleLoading, navigate]);

  const completed = [
    !!analysis,
    copyApproved,
    true, // step 3 opcional
    !!storyImage,
  ];

  // ---- Step 1
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
      setAnalysis(data as VisualAnalysis);
      setEditedPrompt((data as VisualAnalysis).promptVisual);
      toast({ title: 'Análise concluída' });
    } catch (e: any) {
      toast({ title: 'Erro ao analisar', description: e.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- Step 2
  const improveCopy = async () => {
    if (!rawCopy.trim()) {
      toast({ title: 'Escreva sua copy primeiro', variant: 'destructive' });
      return;
    }
    setImproving(true);
    setCopyApproved(false);
    try {
      const { data, error } = await supabase.functions.invoke('criativo-improve-copy', {
        body: { rawCopy },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCopyResult(data as CopyResult);
    } catch (e: any) {
      toast({ title: 'Erro ao melhorar copy', description: e.message, variant: 'destructive' });
    } finally {
      setImproving(false);
    }
  };

  // ---- Step 4
  const buildFinalPrompt = (aspect: 'story' | 'square') => {
    const dims = aspect === 'story' ? '1080x1920 vertical Instagram Story' : '1080x1080 square Instagram post';
    const visual = editedPrompt || analysis?.promptVisual || '';
    const palette = analysis?.paletaCores?.join(', ') || '';
    const copyBlock = copyResult
      ? `Include this text overlay (legible, professional typography):\nHeadline: "${copyResult.headline}"\n${copyResult.subheadline ? `Subheadline: "${copyResult.subheadline}"\n` : ''}CTA: "${copyResult.cta}"`
      : '';
    const productNote = productImages.length > 0
      ? `Feature the product/person shown in the provided reference images prominently in the composition.`
      : '';
    return [
      `Advertising creative for social media — ${dims}.`,
      visual,
      palette ? `Color palette: ${palette}.` : '',
      productNote,
      copyBlock,
      'High quality, polished, professional advertising design, sharp typography, brand-grade composition.',
    ].filter(Boolean).join('\n\n');
  };

  const generate = async (aspect: 'story' | 'square') => {
    setGenerating(true);
    try {
      const prompt = buildFinalPrompt(aspect);
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: { model, prompt, aspectRatio: aspect },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any).imageUrl;
      if (aspect === 'story') setStoryImage(url);
      else setSquareImage(url);
      toast({ title: `Imagem ${aspect === 'story' ? 'Story' : 'Quadrada'} gerada` });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
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
    setEditedPrompt('');
    setRawCopy('');
    setCopyResult(null);
    setCopyApproved(false);
    setProductImages([]);
    setStoryImage(null);
    setSquareImage(null);
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
    <div className="p-4 sm:p-6 pt-20 lg:pt-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Wand2 className="h-7 w-7 text-accent" />
            Criativo Studio
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Crie criativos com IA: referências → copy → produto → arte final.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Recomeçar
        </Button>
      </header>

      <StepIndicator
        steps={['Referências', 'Copywriting', 'Produto', 'Gerar arte']}
        current={step}
        completed={completed}
        onJump={(i) => setStep(i)}
      />

      {/* STEP 1 */}
      {step === 0 && (
        <GlassCard className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Palette className="h-5 w-5 text-accent" />
              1. Referências visuais
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Carregue, arraste ou cole (Ctrl+V) imagens que servirão de inspiração.
              A IA vai analisar paleta, tipografia, composição e estilo.
            </p>
          </div>

          <ImageDropzone
            images={refImages}
            onChange={setRefImages}
            label="Solte, clique ou cole imagens de referência"
            maxImages={6}
          />

          <div className="flex gap-3">
            <Button onClick={analyzeRefs} disabled={analyzing || refImages.length === 0}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Analisar referências
            </Button>
            {analysis && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Avançar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {analysis && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Estilo" value={analysis.estilo} />
                <Info label="Mood" value={analysis.mood} />
                <Info label="Tipografia" value={analysis.tipografia} />
                <Info label="Composição" value={analysis.composicao} />
                <Info label="Elementos gráficos" value={analysis.elementosGraficos} />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Paleta</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.paletaCores.map((c) => (
                      <div key={c} className="flex items-center gap-1.5 glass px-2 py-1 rounded-md">
                        <div className="w-4 h-4 rounded border border-white/10" style={{ background: c }} />
                        <span className="text-xs font-mono">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
                  Prompt visual (editável — esse texto será usado para gerar a arte)
                </p>
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <GlassCard className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">2. Copywriting</h2>
            <p className="text-sm text-white/60 mt-1">
              Escreva o que você quer vender. A IA devolve uma versão otimizada para criativo.
            </p>
          </div>

          <Textarea
            placeholder="Ex: Estamos vendendo curso de kitesurf em Floripa, foco em iniciantes, com instrutores certificados IKO..."
            value={rawCopy}
            onChange={(e) => setRawCopy(e.target.value)}
            rows={4}
          />

          <div className="flex gap-3 flex-wrap">
            <Button onClick={improveCopy} disabled={improving}>
              {improving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {copyResult ? 'Refazer' : 'Melhorar com IA'}
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          {copyResult && (
            <GlassCard className="space-y-3 bg-accent/5 border border-accent/20">
              <div>
                <p className="text-xs uppercase tracking-wider text-accent mb-1">Headline</p>
                <p className="text-lg font-semibold">{copyResult.headline}</p>
              </div>
              {copyResult.subheadline && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Subheadline</p>
                  <p className="text-sm">{copyResult.subheadline}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">CTA</p>
                <p className="text-sm font-medium">{copyResult.cta}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Por quê funciona</p>
                <p className="text-xs text-white/60">{copyResult.justificativa}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setCopyApproved(true);
                    setStep(2);
                  }}
                  className={copyApproved ? 'bg-accent text-black' : ''}
                >
                  OK, usar essa
                </Button>
                <Button size="sm" variant="ghost" onClick={improveCopy} disabled={improving}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refazer
                </Button>
              </div>
            </GlassCard>
          )}
        </GlassCard>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <GlassCard className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">3. Imagens de produto, pessoa ou cenário (opcional)</h2>
            <p className="text-sm text-white/60 mt-1">
              Carregue imagens reais que devem aparecer no criativo (rosto, produto, ambiente).
              Pode pular se não tiver.
            </p>
          </div>

          <ImageDropzone
            images={productImages}
            onChange={setProductImages}
            label="Solte, clique ou cole imagens do produto/pessoa"
            maxImages={6}
          />

          <div className="flex gap-3">
            <Button onClick={() => setStep(3)}>
              Avançar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>
        </GlassCard>
      )}

      {/* STEP 4 */}
      {step === 3 && (
        <GlassCard className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">4. Gerar criativo</h2>
            <p className="text-sm text-white/60 mt-1">
              Escolha o modelo de IA e gere a arte. Comece pelo Story 1080x1920.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 mb-2 block">Modelo</label>
              <Select value={model} onValueChange={(v) => setModel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREEPIK_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => generate('story')} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              {storyImage ? 'Gerar Story novamente' : 'Gerar Story (1080x1920)'}
            </Button>
            {storyImage && (
              <Button variant="outline" onClick={() => generate('square')} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {squareImage ? 'Gerar Quadrado novamente' : 'Recriar em 1080x1080'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {storyImage && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-white/40">Story 1080x1920</p>
                <div className="rounded-xl overflow-hidden glass">
                  <img src={storyImage} alt="story" className="w-full" />
                </div>
                <Button size="sm" variant="outline" onClick={() => download(storyImage, `criativo-story-${Date.now()}.png`)} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Baixar Story
                </Button>
              </div>
            )}
            {squareImage && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-white/40">Quadrado 1080x1080</p>
                <div className="rounded-xl overflow-hidden glass">
                  <img src={squareImage} alt="square" className="w-full" />
                </div>
                <Button size="sm" variant="outline" onClick={() => download(squareImage, `criativo-square-${Date.now()}.png`)} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Baixar Quadrado
                </Button>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-sm text-white/80">{value}</p>
    </div>
  );
}
