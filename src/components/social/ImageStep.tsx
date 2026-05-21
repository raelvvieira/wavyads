import { useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2, Upload, RotateCw, ImageIcon } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import { cn } from "@/lib/utils";
import {
  WAVY_STYLES, suggestStyle, getStyle, templateSuffixFromPattern,
} from "@/lib/wavyImageStyles";
import type { CopyAprovada, CopyPatternId, SlideImagem } from "@/types/social";

interface Props {
  patternId: CopyPatternId;
  tema: string;
  copy: CopyAprovada;
  estiloGlobal?: string;
  initial?: SlideImagem[];
  onApprove: (imagens: SlideImagem[]) => void;
}

export function ImageStep({ patternId, tema, copy, estiloGlobal, initial, onApprove }: Props) {
  const slides = copy.slides || [];
  const templateId = templateSuffixFromPattern(patternId);

  const [images, setImages] = useState<(SlideImagem | null)[]>(() =>
    slides.map((_, i) => initial?.find((x) => x.slide_index === i) || null),
  );
  const [styleByIdx, setStyleByIdx] = useState<string[]>(() =>
    slides.map((s, i) => initial?.[i]?.style_id || suggestStyle(s, tema, patternId).id),
  );
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);

  const setOne = (i: number, img: SlideImagem) =>
    setImages((arr) => arr.map((x, idx) => (idx === i ? img : x)));
  const setStyle = (i: number, id: string) =>
    setStyleByIdx((arr) => arr.map((x, idx) => (idx === i ? id : x)));

  const generateOne = async (i: number, styleIdOverride?: string) => {
    const slide = slides[i];
    const styleId = styleIdOverride || styleByIdx[i];
    const style = getStyle(styleId);
    if (!style) return;

    if (style.caminho === "upload") {
      toast({
        title: `${style.nome} requer upload`,
        description: "Esse estilo exige foto real. Use o botão Upload.",
      });
      return;
    }

    setLoadingIdx(i);
    try {
      const { data, error } = await supabase.functions.invoke("social-image-gen", {
        body: {
          visual_prompt: slide.visual_prompt,
          pattern_id: patternId,
          tema, estilo_global: estiloGlobal,
          slide_index: i,
          slide_titulo: slide.titulo,
          slide_corpo: slide.corpo,
          style_id: styleId,
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
        prompt_usado: data.prompt_usado || slide.visual_prompt,
        style_id: styleId,
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
      const style = getStyle(styleByIdx[i]);
      if (style?.caminho === "ia") {
        await generateOne(i);
      }
      setBatch({ done: i + 1, total: slides.length });
    }
    setBatch(null);
    toast({ title: "Lote concluído", description: "Slides que exigem foto real precisam de upload." });
  };

  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);
  const onUpload = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingIdx(i);
    try {
      const path = `upload-${Date.now()}-s${i}-${file.name}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      setOne(i, {
        slide_index: i,
        url: data.publicUrl,
        source: "upload",
        prompt_usado: "",
        style_id: styleByIdx[i],
      });
    } catch (e: any) {
      toast({ title: "Falha no upload", description: e.message, variant: "destructive" });
    } finally {
      setLoadingIdx(null);
      if (fileInputs.current[i]) fileInputs.current[i]!.value = "";
    }
  };

  const allDone = images.every(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 4 · Imagens · Padrão {patternId}</div>
            <h2 className="text-lg font-semibold">Wavy Image Skill</h2>
            <p className="text-xs text-white/50 mt-1">
              Cada slide tem um estilo sugerido e um caminho (IA ou Upload). Você pode trocar antes de gerar.
            </p>
          </div>
          <button
            onClick={generateAll}
            disabled={batch !== null || loadingIdx !== null}
            className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {batch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {batch ? `Gerando ${batch.done}/${batch.total}…` : "Gerar todos com IA"}
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides.map((slide, i) => {
          const style = getStyle(styleByIdx[i])!;
          const img = images[i];
          const isLoading = loadingIdx === i;
          const isUpload = style.caminho === "upload";
          return (
            <GlassCard key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-white/40">#{i + 1}</span>
                <Badge variant="outline" className="border-white/20 text-[10px]">
                  {slide.tipo.toUpperCase()}
                </Badge>
              </div>

              <Select value={style.id} onValueChange={(v) => setStyle(i, v)}>
                <SelectTrigger className="glass-input h-9 text-xs">
                  <SelectValue>
                    <span className="inline-flex items-center gap-1.5">
                      <span>{style.emoji}</span>
                      <span className="truncate">{style.nome}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WAVY_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span>{s.emoji}</span>
                        <span>{s.nome}</span>
                        <Badge variant="outline" className="ml-1 text-[9px] border-white/20">
                          {s.caminho === "ia" ? "IA" : "UPLOAD"}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-white/50 mt-2 leading-snug">{style.resumo}</p>

              <div className="aspect-[3/4] mt-3 rounded-lg overflow-hidden bg-white/[0.03] border border-white/10 relative">
                {img ? (
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <span className="text-xs">{isUpload ? "aguardando upload" : "sem imagem"}</span>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-accent animate-spin" />
                  </div>
                )}
                {img?.style_id && (
                  <Badge
                    variant="outline"
                    className="absolute top-2 right-2 text-[9px] border-accent/40 text-accent bg-black/50"
                  >
                    {getStyle(img.style_id)?.emoji} {getStyle(img.style_id)?.nome}
                  </Badge>
                )}
              </div>

              <p className="text-xs font-semibold text-white/80 mt-3 line-clamp-1">{slide.titulo}</p>
              <p className="text-[11px] text-white/40 line-clamp-2 mt-0.5">{slide.visual_prompt}</p>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => generateOne(i)}
                  disabled={isLoading || isUpload}
                  className={cn(
                    "rounded-md py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5",
                    isUpload ? "glass opacity-40 cursor-not-allowed" : "btn-accent",
                  )}
                  title={isUpload ? "Este estilo requer upload" : "Gerar com IA (Gemini)"}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {img ? "Regerar" : "Gerar IA"}
                </button>
                <button
                  onClick={() => fileInputs.current[i]?.click()}
                  disabled={isLoading}
                  className="glass rounded-md py-2 text-xs font-semibold hover:bg-white/5 inline-flex items-center justify-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
              </div>

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
    </div>
  );
}
