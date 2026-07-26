import { useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, Loader2, Upload, ImageIcon, Palette, RotateCcw, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import {
  buildImagePrompt, suggestStyleId, getStyle, templateSuffixFromPattern,
} from "@/lib/wavyImageStyles";
import {
  generateVisualConcept, conceptNegatives, styleFromVisualFamily, type VisualConcept,
} from "@/lib/visualConcept";
import { useImageStyles } from "@/hooks/useImageStyles";
import { ImageStylesEditor } from "./ImageStylesEditor";
import type { CopyAprovada, CopyPatternId, SlideImagem } from "@/types/social";

interface Props {
  patternId: CopyPatternId;
  tema: string;
  copy: CopyAprovada;
  initial?: SlideImagem[];
  /** Assunto real do post viral — o diretor de arte usa como fonte de fatos/entidades. */
  briefing?: string;
  onApprove: (imagens: SlideImagem[]) => void;
}

export function ImageStep({ patternId, tema, copy, initial, briefing, onApprove }: Props) {
  const slides = copy.slides || [];
  const templateId = templateSuffixFromPattern(patternId);
  const { styles, saveStyle, createStyle, deleteStyle, resetStyle } = useImageStyles();

  // Leitura da copy inteira → base para sugestão de estilo por slide.
  const fullCopyText = useMemo(
    () => [...slides.map((s) => `${s.titulo} ${s.corpo} ${s.visual_prompt}`), copy.legenda].join(" "),
    [slides, copy.legenda],
  );
  const suggestedIds = useMemo(
    () => slides.map((s) => suggestStyleId(s, fullCopyText, tema)),
    [slides, fullCopyText, tema],
  );

  const [images, setImages] = useState<(SlideImagem | null)[]>(() =>
    slides.map((_, i) => initial?.find((x) => x.slide_index === i) || null),
  );
  // Estilo escolhido por slide — inicia no sugerido, editável via dropdown.
  // Normaliza ids legados (fora dos 3 estilos atuais) para o sugerido.
  const [chosenIds, setChosenIds] = useState<string[]>(() =>
    slides.map((_, i) => {
      const persisted = initial?.[i]?.style_id;
      return persisted && getStyle(persisted, styles) ? persisted : suggestedIds[i];
    }),
  );
  // Prompt editado manualmente (drawer). null = derivar do estilo.
  const [promptOverride, setPromptOverride] = useState<(string | null)[]>(() => slides.map(() => null));
  // Conceito do diretor de arte por slide (decide O QUE a imagem mostra).
  const [concepts, setConcepts] = useState<(VisualConcept | null)[]>(() => slides.map(() => null));
  const [conceptLoadingIdx, setConceptLoadingIdx] = useState<number | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
  const [editingStyles, setEditingStyles] = useState(false);

  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);
  // Slides cujo estilo o usuário trocou na mão — não sobrescrever com o do conceito.
  const styleTouched = useRef<Set<number>>(new Set());

  const styleOf = (i: number) => getStyle(chosenIds[i], styles) || styles[1] || styles[0];

  /**
   * Monta o prompt final. O "o quê" vem do conceito do diretor de arte
   * (image_generation_core); se não houver, cai no visual_prompt da copy.
   * O "como" (câmera/luz/pele/grão) vem do estilo.
   */
  const buildPromptFor = (i: number, concept?: VisualConcept | null) => {
    if (promptOverride[i] != null) return promptOverride[i]!;
    const core = concept?.image_generation_core?.trim() || slides[i].visual_prompt;
    return buildImagePrompt({
      style: styleOf(i),
      template_id: templateId,
      visual_prompt: core,
      tema,
      slide_titulo: slides[i].titulo,
      slide_corpo: slides[i].corpo,
    }) + conceptNegatives(concept);
  };

  const effectivePrompt = (i: number) => buildPromptFor(i, concepts[i]);

  /** Roda o diretor de arte para o slide e adota o estilo sugerido pela família. */
  const makeConcept = async (i: number): Promise<VisualConcept | null> => {
    setConceptLoadingIdx(i);
    try {
      const concept = await generateVisualConcept({
        tema,
        briefing,
        slide: slides[i],
        slideIndex: i,
        total: slides.length,
        formato: slides[i].tipo,
        slidesAround: slides
          .map((s, idx) => ({ titulo: s.titulo, corpo: s.corpo, idx }))
          .filter((s) => s.idx !== i)
          .slice(0, 4)
          .map(({ titulo, corpo }) => ({ titulo, corpo })),
        pattern: patternId,
      });
      setConcepts((arr) => arr.map((c, idx) => (idx === i ? concept : c)));
      // A família visual sugere um acabamento — só aplica se o usuário não escolheu.
      if (!styleTouched.current.has(i)) {
        const suggested = styleFromVisualFamily(concept.visual_family);
        if (suggested && getStyle(suggested, styles)) {
          setChosenIds((arr) => arr.map((x, idx) => (idx === i ? suggested : x)));
        }
      }
      return concept;
    } catch (e: any) {
      toast({ title: `Conceito do slide ${i + 1} falhou`, description: e.message, variant: "destructive" });
      return null;
    } finally {
      setConceptLoadingIdx(null);
    }
  };

  const setOne = (i: number, img: SlideImagem | null) =>
    setImages((arr) => arr.map((x, idx) => (idx === i ? img : x)));

  const chooseStyle = (i: number, id: string) => {
    styleTouched.current.add(i);
    setChosenIds((arr) => arr.map((x, idx) => (idx === i ? id : x)));
    // Trocar de estilo descarta o prompt editado (rebuild do novo estilo).
    setPromptOverride((arr) => arr.map((x, idx) => (idx === i ? null : x)));
  };

  const generateOne = async (i: number) => {
    setLoadingIdx(i);
    try {
      // 1) Conceito primeiro (o QUÊ). Se o usuário editou o prompt na mão, respeita.
      let concept = concepts[i];
      if (!concept && promptOverride[i] == null) {
        concept = await makeConcept(i);
      }
      // 2) Renderização (o COMO) — o estilo pode ter mudado por causa da família.
      const style = getStyle(
        concept && !styleTouched.current.has(i)
          ? (styleFromVisualFamily(concept.visual_family) || chosenIds[i])
          : chosenIds[i],
        styles,
      ) || styleOf(i);
      const prompt = buildPromptFor(i, concept);
      const { data, error } = await supabase.functions.invoke("social-image-gen", {
        body: {
          prompt,
          style_id: style.id,
          pattern_id: patternId,
          tema,
          slide_index: i,
          slide_titulo: slides[i].titulo,
          slide_corpo: slides[i].corpo,
          visual_prompt: concept?.image_generation_core || slides[i].visual_prompt,
          template_id: templateId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      recordAiUsage("image-gemini-pro", 1);
      setOne(i, {
        slide_index: i,
        url: data.url,
        source: "ai",
        prompt_usado: data.prompt_usado || prompt,
        style_id: style.id,
      });
    } catch (e: any) {
      toast({ title: `Falha no slide ${i + 1}`, description: e.message, variant: "destructive" });
    } finally {
      setLoadingIdx(null);
    }
  };

  const generateAll = async () => {
    setBatch({ done: 0, total: slides.length });
    for (let i = 0; i < slides.length; i++) {
      // Não sobrescreve fotos que o usuário subiu manualmente.
      if (images[i]?.source !== "upload") {
        await generateOne(i);
      }
      setBatch({ done: i + 1, total: slides.length });
    }
    setBatch(null);
    toast({ title: "Lote concluído" });
  };

  const onUpload = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingIdx(i);
    try {
      const path = `upload-${Date.now()}-s${i}-${file.name}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      setOne(i, { slide_index: i, url: data.publicUrl, source: "upload", prompt_usado: "", style_id: chosenIds[i] });
    } catch (e: any) {
      toast({ title: "Falha no upload", description: e.message, variant: "destructive" });
    } finally {
      setLoadingIdx(null);
      if (fileInputs.current[i]) fileInputs.current[i]!.value = "";
    }
  };

  const allDone = images.every(Boolean);

  if (editingStyles) {
    return (
      <ImageStylesEditor
        styles={styles}
        onSave={saveStyle}
        onCreate={createStyle}
        onDelete={deleteStyle}
        onReset={resetStyle}
        onClose={() => setEditingStyles(false)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 5 · Imagens</div>
            <h2 className="text-lg font-semibold">Wavy Image Skill</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingStyles(true)}
              className="glass rounded-lg px-3 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/10"
            >
              <Palette className="h-4 w-4" /> Editar estilos
            </button>
            <button
              onClick={generateAll}
              disabled={batch !== null || loadingIdx !== null}
              className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {batch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {batch ? `Gerando ${batch.done}/${batch.total}…` : "Gerar todos com IA"}
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides.map((slide, i) => {
          const img = images[i];
          const isLoading = loadingIdx === i;
          // Trava ações do card durante loading próprio OU lote em andamento.
          const busy = isLoading || batch !== null;
          const suggested = getStyle(suggestedIds[i], styles);
          const chosen = styleOf(i);
          return (
            <GlassCard key={i} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/40">#{i + 1}</span>
                <Badge variant="outline" className="border-white/20 text-[10px]">{slide.tipo.toUpperCase()}</Badge>
              </div>

              {/* Estilo sugerido */}
              <div className="text-[11px] text-white/50">
                Estilo sugerido: <span className="text-accent font-semibold">{suggested?.emoji} {suggested?.nome}</span>
              </div>

              {/* Escolha manual + confirmar */}
              <div className="flex items-center gap-2">
                <Select value={chosenIds[i]} onValueChange={(v) => chooseStyle(i, v)}>
                  <SelectTrigger className="glass-input h-9 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.emoji} {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => generateOne(i)}
                  disabled={busy}
                  className="btn-accent rounded-md h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {img ? "Refazer" : "Confirmar"}
                </button>
              </div>

              {/* Imagem (clique → drawer) */}
              <button
                onClick={() => setDrawerIdx(i)}
                className="aspect-[3/4] rounded-lg overflow-hidden bg-white/[0.03] border border-white/10 relative group text-left"
              >
                {img ? (
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <span className="text-xs">sem imagem</span>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-accent animate-spin" />
                  </div>
                )}
                <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-accent border border-accent/30">
                  {chosen.emoji} {chosen.nome}
                </span>
                <span className="absolute bottom-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  ver copy + prompt
                </span>
              </button>

              {/* Usar foto própria */}
              <button
                onClick={() => fileInputs.current[i]?.click()}
                disabled={busy}
                className="w-full glass rounded-md py-2 text-[11px] font-semibold hover:bg-white/10 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> Usar foto própria
              </button>

              <input
                ref={(el) => (fileInputs.current[i] = el)}
                type="file" accept="image/*" hidden
                onChange={(e) => onUpload(i, e)}
              />
            </GlassCard>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onApprove(images.filter(Boolean) as SlideImagem[])}
          disabled={!allDone}
          className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Aprovar imagens →
        </button>
      </div>

      {/* Drawer lateral: copy do slide + prompt editável */}
      <Sheet open={drawerIdx !== null} onOpenChange={(o) => !o && setDrawerIdx(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawerIdx !== null && (
            <>
              <SheetHeader>
                <SheetTitle>Slide #{drawerIdx + 1} · {slides[drawerIdx].tipo.toUpperCase()}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Copy do slide</div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 space-y-2">
                    <p className="text-sm font-semibold text-white">{slides[drawerIdx].titulo}</p>
                    <p className="text-xs text-white/70 whitespace-pre-wrap">{slides[drawerIdx].corpo}</p>
                    {slides[drawerIdx].visual_prompt && (
                      <p className="text-[11px] text-white/40 italic border-t border-white/10 pt-2">
                        Ideia visual: {slides[drawerIdx].visual_prompt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Conceito do diretor de arte — o QUÊ e o PORQUÊ da imagem */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-white/40 inline-flex items-center gap-1.5">
                      <Lightbulb className="h-3 w-3 text-accent" /> Conceito visual
                    </div>
                    <button
                      onClick={() => makeConcept(drawerIdx)}
                      disabled={conceptLoadingIdx === drawerIdx}
                      className="text-[10px] text-white/50 hover:text-white inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {conceptLoadingIdx === drawerIdx
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RotateCcw className="h-3 w-3" />}
                      {concepts[drawerIdx] ? "Refazer conceito" : "Gerar conceito"}
                    </button>
                  </div>
                  {concepts[drawerIdx] ? (
                    <div className="rounded-lg bg-accent/[0.06] border border-accent/20 p-3 space-y-2">
                      <p className="text-sm font-semibold text-white">{concepts[drawerIdx]!.creative_concept}</p>
                      <p className="text-[11px] text-white/70">
                        <span className="text-accent">Twist:</span> {concepts[drawerIdx]!.creative_twist}
                      </p>
                      {concepts[drawerIdx]!.scene?.moment && (
                        <p className="text-[11px] text-white/55">
                          <span className="text-white/35">Cena:</span> {concepts[drawerIdx]!.scene!.moment}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                          {concepts[drawerIdx]!.visual_family}
                        </span>
                        {concepts[drawerIdx]!.composition?.hero_element && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                            hero: {concepts[drawerIdx]!.composition!.hero_element}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white/[0.03] border border-dashed border-white/15 p-3 text-[11px] text-white/45">
                      Sem conceito ainda — será criado automaticamente ao gerar a imagem.
                      Ele decide <span className="text-white/70">o que</span> a imagem mostra a partir da copy deste slide.
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Prompt de geração</div>
                    {promptOverride[drawerIdx] != null && (
                      <button
                        onClick={() => setPromptOverride((arr) => arr.map((x, idx) => (idx === drawerIdx ? null : x)))}
                        className="text-[10px] text-white/50 hover:text-white inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Restaurar do estilo
                      </button>
                    )}
                  </div>
                  <Textarea
                    value={effectivePrompt(drawerIdx)}
                    onChange={(e) =>
                      setPromptOverride((arr) => arr.map((x, idx) => (idx === drawerIdx ? e.target.value : x)))
                    }
                    rows={12}
                    className="glass-input w-full rounded-lg text-xs font-mono leading-relaxed"
                  />
                </div>

                <button
                  onClick={() => { generateOne(drawerIdx); }}
                  disabled={loadingIdx === drawerIdx || batch !== null}
                  className="w-full btn-accent rounded-lg py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingIdx === drawerIdx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Gerar com este prompt
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
