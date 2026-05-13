import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { StepIndicator } from '@/components/criativo/StepIndicator';
import { cn } from '@/lib/utils';
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
}

interface CopyResult {
  label: string;
  titulo: string;
  subtitulo: string;
  dados: string;
  cta: string;
  avaliacao: { clareza: string; hierarquia: string; brevidade: string; gatilho: string; tom: string };
  justificativa: string;
}

const IMAGE_MODELS = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', desc: 'Qualidade alta — usa fotos e logo, renderiza textos' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', desc: 'Mais rápido — boa qualidade, mesmo motor' },
] as const;

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
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const [copyApproved, setCopyApproved] = useState(false);
  const [copySource, setCopySource] = useState<'original' | 'ai'>('ai');

  // Step 3
  const [logoImage, setLogoImage] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [preserveFaces, setPreserveFaces] = useState(true);

  // Step 4
  const [model, setModel] = useState<typeof IMAGE_MODELS[number]['id']>('nano-banana-pro');
  const [language, setLanguage] = useState<string>('pt-BR');
  const [businessContext, setBusinessContext] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [squareImage, setSquareImage] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate('/dashboard');
  }, [isAdmin, roleLoading, navigate]);

  const completed = [!!analysis, copyApproved, true, !!storyImage];

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
      const a = data as VisualAnalysis;
      setAnalysis(a);
      setEditedDoc(a.designSystemDoc);
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
      setCopyResult(data as CopyResult);
    } catch (e: any) {
      toast({ title: 'Erro ao melhorar copy', description: e.message, variant: 'destructive' });
    } finally {
      setImproving(false);
    }
  };

  const buildFinalPrompt = (aspect: 'story' | 'square') => {
    const dims = aspect === 'story'
      ? '9:16 vertical Instagram Story, 1080x1920px'
      : '1:1 perfect square Instagram post, 1080x1080px';
    const safeZone = aspect === 'story'
      ? 'Top safe zone: keep 280px from the very top edge completely free of any text, graphic or important element. Bottom safe zone: keep 280px from the very bottom edge completely free. This protects against Instagram UI overlays (profile, stickers, reply bar).'
      : 'Top safe zone: keep 120px from the top edge clear of important text. Bottom safe zone: keep 120px from the bottom edge clear.';

    const intro = `[INTRODUCTION]
Create a ${dims} advertisement image for ${businessContext.trim() || 'a professional brand'}.`;

    const photoBlock = productImages.length > 0
      ? `[ATTACHED PHOTOS]
${productImages.length} reference image(s) provided showing the product/person/scene that must appear in the composition.
${preserveFaces ? 'Preserve their exact likeness. Do NOT alter faces, skin tone, body shape or appearance in any way. Treat the subject as a fixed reference.' : ''}
Integrate the subject naturally into the composition described below.`
      : '';

    const designSystem = editedDoc || analysis?.designSystemDoc || '';

    const safe = `[SAFE ZONE]
${safeZone}
${aspect === 'square' ? 'Centered composition optimized for square 1:1 framing.' : ''}`;

    // Text blocks from selected copy
    let textBlocks = '';
    if (copySource === 'ai' && copyResult) {
      const parts: string[] = [];
      if (copyResult.label) parts.push(`LABEL (top, small uppercase, wide tracking, secondary color): "${copyResult.label}"`);
      if (copyResult.titulo) parts.push(`MAIN TITLE (dominant, large, primary typeface, high contrast): "${copyResult.titulo}"`);
      if (copyResult.subtitulo) parts.push(`SUBTITLE (medium, secondary typeface, supports the title): "${copyResult.subtitulo}"`);
      if (copyResult.dados) parts.push(`DATA LINE (small, factual: date/place/price/spots): "${copyResult.dados}"`);
      if (copyResult.cta) parts.push(`CTA (pill or button, accent color, bold): "${copyResult.cta}"`);
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
      ? negativePrompt.split('\n').map((l) => `- ${l.trim()}`).filter((l) => l.length > 2)
      : [];
    const evitaList = analysis?.mood.evita.map((e) => `- ${e}`) || [];

    const doNot = `[DO NOT INCLUDE]
${[...evitaList, ...userNegatives].join('\n')}
- Any element within the top or bottom safe zones
- Any text in a language other than ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}
- Misspelled, garbled or fake-looking text
- Watermarks, signatures, low-resolution artifacts
- Generic stock-photo aesthetic`;

    const closing = `All text in the artwork MUST be written in ${language === 'pt-BR' ? 'Portuguese (Brazil)' : language === 'es' ? 'Spanish' : 'English'}. Final result: high quality, polished, professional advertising design, sharp typography, brand-grade composition.`;

    return [intro, photoBlock, '[DESIGN SYSTEM]\n' + designSystem, safe, logoBlock, textBlocks, moodBlock, doNot, closing]
      .filter(Boolean)
      .join('\n\n');
  };

  const generate = async (aspect: 'story' | 'square') => {
    setGenerating(true);
    if (aspect === 'square') setSquareImage(null);
    try {
      const prompt = buildFinalPrompt(aspect);
      const { data, error } = await supabase.functions.invoke('criativo-generate', {
        body: {
          model,
          prompt,
          aspectRatio: aspect,
          referenceImages: productImages,
          logoImage: logoImage[0] || null,
        },
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
    setEditedDoc('');
    setRawCopy('');
    setCopyResult(null);
    setCopyApproved(false);
    setCopySource('ai');
    setLogoImage([]);
    setProductImages([]);
    setPreserveFaces(true);
    setBusinessContext('');
    setNegativePrompt('');
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
    <div className="p-4 sm:p-6 pt-20 lg:pt-6 space-y-5 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent" />
            Criativo Studio
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Referências → Copy → Produto → Arte. Metodologia de direção de arte aplicada a IA generativa.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Recomeçar
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

          <Textarea
            placeholder="Ex: Estamos vendendo curso de kitesurf em Floripa, foco em iniciantes, com instrutores certificados IKO, vagas a partir de R$ 890 começando dia 15/03..."
            value={rawCopy}
            onChange={(e) => setRawCopy(e.target.value)}
            rows={4}
            className="text-sm"
          />

          <div className="flex gap-3 flex-wrap">
            <Button size="sm" onClick={improveCopy} disabled={improving}>
              {improving ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              {copyResult ? 'Refazer sugestão' : 'Sugerir versão otimizada'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(0)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Button>
          </div>

          {(copyResult || rawCopy.trim()) && (
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              {rawCopy.trim() && (
                <CopyOptionCard
                  title="Sua copy original"
                  selected={copyApproved && copySource === 'original'}
                  onSelect={() => {
                    setCopySource('original');
                    setCopyApproved(true);
                    setStep(2);
                  }}
                >
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{rawCopy}</p>
                </CopyOptionCard>
              )}

              {copyResult && (
                <CopyOptionCard
                  title="Sugestão da IA — 5 blocos"
                  accent
                  selected={copyApproved && copySource === 'ai'}
                  onSelect={() => {
                    setCopySource('ai');
                    setCopyApproved(true);
                    setStep(2);
                  }}
                >
                  {copyResult.label && <CopyBlock label="Label" value={copyResult.label} small uppercase />}
                  <CopyBlock label="Título" value={copyResult.titulo} bold />
                  {copyResult.subtitulo && <CopyBlock label="Subtítulo" value={copyResult.subtitulo} />}
                  {copyResult.dados && <CopyBlock label="Dados" value={copyResult.dados} small />}
                  <CopyBlock label="CTA" value={copyResult.cta} accent />
                  {copyResult.justificativa && (
                    <p className="text-[11px] text-white/50 italic pt-1 border-t border-white/10">
                      {copyResult.justificativa}
                    </p>
                  )}
                </CopyOptionCard>
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
              Configure contexto e modelo. Comece pelo Story 1080x1920 e depois recrie em quadrado.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz" className="text-[10px] uppercase tracking-wider text-white/40">
              Contexto do negócio (importante!)
            </Label>
            <Input
              id="biz"
              placeholder="Ex: Mentoria premium de harmonização facial em São Paulo / Bar de coquetelaria autoral em Pinheiros"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-white/40">Quanto mais específico, melhor o tom visual. "Mentoria premium" ≠ "curso".</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Modelo</Label>
              <Select value={model} onValueChange={(v) => setModel(v as any)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div>
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Idioma do texto na arte</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex gap-3 flex-wrap">
            <Button size="sm" onClick={() => generate('story')} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
              {storyImage ? 'Gerar Story novamente' : 'Gerar Story (1080x1920)'}
            </Button>
            {storyImage && (
              <Button size="sm" variant="outline" onClick={() => generate('square')} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                {squareImage ? 'Gerar Quadrado novamente' : 'Recriar em 1080x1080'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setStep(2)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Button>
          </div>

          {(storyImage || squareImage) && (
            <div className="flex flex-wrap gap-6 items-start justify-center pt-2">
              {storyImage && (
                <div className="space-y-2 w-[220px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 text-center">Story 1080x1920</p>
                  <div className="rounded-xl overflow-hidden glass aspect-[9/16]">
                    <img src={storyImage} alt="story" className="w-full h-full object-cover" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => download(storyImage, `criativo-story-${Date.now()}.png`)} className="w-full">
                    <Download className="h-3.5 w-3.5 mr-2" /> Baixar Story
                  </Button>
                </div>
              )}
              {squareImage && (
                <div className="space-y-2 w-[280px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 text-center">Quadrado 1080x1080</p>
                  <div className="rounded-xl overflow-hidden glass aspect-square">
                    <img src={squareImage} alt="square" className="w-full h-full object-cover" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => download(squareImage, `criativo-square-${Date.now()}.png`)} className="w-full">
                    <Download className="h-3.5 w-3.5 mr-2" /> Baixar Quadrado
                  </Button>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}
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
