import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { SlideImageCard } from "./SlideImageCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { CopyAprovada, Formato, SlideImagem } from "@/types/social";

interface Props {
  formato: Exclude<Formato, "reel">;
  tema: string;
  copy: CopyAprovada;
  estiloGlobal?: string;
  initial?: SlideImagem[];
  onApprove: (imagens: SlideImagem[]) => void;
}

export function ImageStep({ formato, tema, copy, estiloGlobal, initial, onApprove }: Props) {
  const slides = copy.slides || [];
  const [images, setImages] = useState<(SlideImagem | null)[]>(
    () => slides.map((_, i) => initial?.find((x) => x.slide_index === i) || null),
  );
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const setOne = (i: number, img: SlideImagem) =>
    setImages((arr) => arr.map((x, idx) => (idx === i ? img : x)));

  const generateAll = async () => {
    setBatchProgress({ done: 0, total: slides.length });
    const out: (SlideImagem | null)[] = [...images];
    for (let i = 0; i < slides.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("social-image-search", {
          body: {
            slide_index: i,
            slide_titulo: slides[i].titulo,
            slide_corpo: slides[i].corpo,
            slide_tipo: slides[i].tipo,
            visual_prompt: slides[i].visual_prompt,
            formato,
            tema,
            estilo_global: estiloGlobal,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Track usage per source called
        const u = data?.usage || {};
        if (u.apify_calls) recordAiUsage("apify-google-images", u.apify_calls);
        if (u.pexels_calls) recordAiUsage("pexels-search", u.pexels_calls);
        if (u.freepik_stock_calls) recordAiUsage("freepik-stock-search", u.freepik_stock_calls);
        if (u.gemini_calls) recordAiUsage("image-gemini-pro", u.gemini_calls);

        if (data?.ok && data.url) {
          out[i] = {
            slide_index: i,
            url: data.url,
            source: data.source || "ai",
            prompt_usado: data.prompt_usado || slides[i].visual_prompt,
            fonte: data.fonte,
            tipo_visual: data.tipo_visual,
          };
          setImages([...out]);
        } else {
          toast({
            title: `Slide ${i + 1}: sem imagem`,
            description: `Tipo: ${data?.tipo_visual || "?"}. Use Freepik ou upload manual.`,
          });
        }
      } catch (e: any) {
        toast({ title: `Falha no slide ${i + 1}`, description: e.message, variant: "destructive" });
      }
      setBatchProgress({ done: i + 1, total: slides.length });
    }
    setBatchProgress(null);
    toast({ title: "Busca de imagens concluída" });
  };


  const allDone = images.every(Boolean);
  const isBatch = batchProgress !== null;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 4 · Imagens</div>
            <h2 className="text-lg font-semibold">Gere ou escolha uma imagem por slide</h2>
          </div>
          <button
            onClick={generateAll}
            disabled={isBatch}
            className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isBatch
              ? `Buscando ${batchProgress!.done}/${batchProgress!.total}…`
              : "Buscar imagens (fontes reais + IA fallback)"}

          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides.map((s, i) => (
          <SlideImageCard
            key={i}
            slide={s}
            slideIndex={i}
            formato={formato}
            tema={tema}
            estiloGlobal={estiloGlobal}
            image={images[i]}
            onChange={(img) => setOne(i, img)}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onApprove(images.filter(Boolean) as SlideImagem[])}
          disabled={!allDone}
          className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Aprovar Imagens →
        </button>
      </div>
    </div>
  );
}
