import { useState, useRef } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCw, Pencil, Upload, ImageIcon, Loader2 } from "lucide-react";
import { FreepikSearchDialog } from "./FreepikSearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import { cn } from "@/lib/utils";
import type { Slide, SlideImagem, Formato } from "@/types/social";

interface Props {
  slide: Slide;
  slideIndex: number;
  formato: Formato;
  tema: string;
  estiloGlobal?: string;
  image: SlideImagem | null;
  onChange: (img: SlideImagem) => void;
}

export function SlideImageCard({
  slide, slideIndex, formato, tema, estiloGlobal, image, onChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [freepikOpen, setFreepikOpen] = useState(false);
  const [prompt, setPrompt] = useState(slide.visual_prompt);
  const fileInput = useRef<HTMLInputElement>(null);

  const generate = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-image-gen", {
        body: {
          visual_prompt: customPrompt || slide.visual_prompt,
          formato,
          tema,
          estilo_global: estiloGlobal,
          slide_index: slideIndex,
          slide_titulo: slide.titulo,
          slide_corpo: slide.corpo,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      recordAiUsage("image-gemini-pro", 1);
      onChange({
        slide_index: slideIndex,
        url: data.url,
        source: "ai",
        prompt_usado: data.prompt_usado || customPrompt || slide.visual_prompt,
      });
    } catch (e: any) {
      toast({ title: "Falha ao gerar imagem", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const path = `upload-${Date.now()}-s${slideIndex}-${file.name}`;
      const { error } = await supabase.storage.from("social-media").upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      onChange({ slide_index: slideIndex, url: data.publicUrl, source: "upload", prompt_usado: "" });
    } catch (e: any) {
      toast({ title: "Falha no upload", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">#{slideIndex + 1}</span>
          <Badge variant="outline" className="border-white/20">
            {slide.tipo.toUpperCase()}
          </Badge>
        </div>
        {image && (
          <Badge variant="outline" className={cn(
            "text-[10px]",
            image.source === "ai" && "border-accent/40 text-accent",
            image.source === "google" && "border-blue-500/40 text-blue-300",
            image.source === "pexels" && "border-emerald-500/40 text-emerald-300",
            image.source === "freepik" && "border-cyan-500/40 text-cyan-300",
            image.source === "freepik-stock" && "border-cyan-500/40 text-cyan-300",
            image.source === "upload" && "border-violet-500/40 text-violet-300",
          )}>
            {image.fonte || image.source}
          </Badge>
        )}

      </div>

      <div className="aspect-square rounded-lg overflow-hidden bg-white/[0.03] border border-white/10 mb-3 relative">
        {image ? (
          <img src={image.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
            <ImageIcon className="h-10 w-10 mb-2" />
            <span className="text-xs">sem imagem</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-white/80 mb-1 line-clamp-1">{slide.titulo}</p>
      <p className="text-[11px] text-white/40 mb-3 line-clamp-2">{slide.visual_prompt}</p>

      <div className="grid grid-cols-4 gap-1">
        <button
          onClick={() => generate()}
          disabled={loading}
          title="Gerar/Regerar com IA"
          className="glass rounded-md py-2 hover:bg-white/5 disabled:opacity-50 flex items-center justify-center"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { setPrompt(slide.visual_prompt); setEditOpen(true); }}
          title="Editar prompt"
          className="glass rounded-md py-2 hover:bg-white/5 flex items-center justify-center"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={loading}
          title="Upload manual"
          className="glass rounded-md py-2 hover:bg-white/5 disabled:opacity-50 flex items-center justify-center"
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setFreepikOpen(true)}
          title="Buscar no Freepik"
          className="glass rounded-md py-2 hover:bg-white/5 flex items-center justify-center text-[10px] font-semibold"
        >
          FP
        </button>
      </div>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onUpload} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar prompt do slide #{slideIndex + 1}</DialogTitle>
          </DialogHeader>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="glass rounded-lg px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              onClick={() => { setEditOpen(false); generate(prompt); }}
              className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Gerar com novo prompt
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FreepikSearchDialog
        open={freepikOpen}
        onOpenChange={setFreepikOpen}
        defaultQuery={slide.visual_prompt.split(" ").slice(0, 5).join(" ")}
        onPick={(url) =>
          onChange({ slide_index: slideIndex, url, source: "freepik", prompt_usado: slide.visual_prompt })
        }
      />
    </GlassCard>
  );
}
