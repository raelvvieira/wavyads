import { useMemo, useRef, useState } from "react";
import { Download, Package, Check, Loader2, Save } from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { GlassCard } from "@/components/GlassCard";
import { ProfileEditor } from "./ProfileEditor";
import { SlideCanvas } from "./SlideCanvas";
import { PATTERN_TEMPLATES } from "./templates";
import { determinarFormato, templateFromPattern, type TemplateId, type TemplateSlideProps } from "./templates/shared";
import { useSocialProfile } from "@/hooks/useSocialProfile";
import { toast } from "@/hooks/use-toast";
import type { CopyAprovada, SlideImagem, CopyPatternId } from "@/types/social";

interface Props {
  tema: string;
  copy: CopyAprovada;
  imagens: SlideImagem[];
  patternId?: CopyPatternId | null;
  onFinish: () => void;
}

export function DesignStep({ tema, copy, imagens, patternId, onFinish }: Props) {
  const { profile, template, save, uploadAvatar } = useSocialProfile();
  // Auto: pattern_id da copy → template, com override manual.
  const suggested = templateFromPattern(patternId ?? copy.pattern_id);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateId>(suggested || template);
  const [exporting, setExporting] = useState(false);
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const slides = copy.slides || [];
  const total = slides.length;

  const composedSlides: TemplateSlideProps[] = useMemo(() => {
    const imgMap = new Map(imagens.map((i) => [i.slide_index, i.url]));
    return slides.map((s, i) => ({
      slideIndex: i,
      total,
      titulo: s.titulo,
      corpo: s.corpo,
      imgUrl: imgMap.get(i),
      tipoSlide: s.tipo,
      formato: determinarFormato(s.tipo, i, total),
      profile,
    }));
  }, [slides, imagens, total, profile]);

  const Template = PATTERN_TEMPLATES[currentTemplate];

  const setRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) slideRefs.current.set(i, el);
    else slideRefs.current.delete(i);
  };

  const baseName = (tema || "carrossel").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "carrossel";

  const exportOne = async (i: number) => {
    const node = slideRefs.current.get(i);
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        width: 1080, height: 1350, pixelRatio: 1,
        canvasWidth: 1080, canvasHeight: 1350,
        style: { transform: "scale(1)", transformOrigin: "top left" },
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, `${baseName}-${String(i + 1).padStart(2, "0")}.png`);
    } catch (e: any) {
      toast({ title: "Falha ao exportar slide", description: e.message, variant: "destructive" });
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < total; i++) {
        const node = slideRefs.current.get(i);
        if (!node) continue;
        const dataUrl = await toPng(node, {
          width: 1080, height: 1350, pixelRatio: 1,
          canvasWidth: 1080, canvasHeight: 1350,
          style: { transform: "scale(1)", transformOrigin: "top left" },
          cacheBust: true,
        });
        const b64 = dataUrl.split(",")[1];
        zip.file(`${baseName}-${String(i + 1).padStart(2, "0")}.png`, b64, { base64: true });
      }
      if (copy.legenda) zip.file("legenda.txt", copy.legenda + "\n\n" + (copy.hashtags || []).join(" "));
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `${baseName}.zip`);
      toast({ title: `${total} slides exportados`, description: "Download iniciado" });
    } catch (e: any) {
      toast({ title: "Falha ao exportar carrossel", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 5 · Design · Padrão {currentTemplate}</div>
            <h2 className="text-lg font-semibold">Aplicar template visual e exportar</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save({ template: currentTemplate })}
              className="glass rounded-lg px-3 py-2 text-xs inline-flex items-center gap-1.5 hover:bg-white/5"
              title="Salvar preferências"
            >
              <Save className="h-3.5 w-3.5" /> Salvar perfil
            </button>
            <button
              onClick={exportAll}
              disabled={exporting}
              className="btn-accent rounded-lg px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {exporting ? "Exportando…" : "Baixar tudo (.zip)"}
            </button>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Identidade</div>
          <ProfileEditor
            profile={profile}
            onChange={(p) => save(p)}
            onUploadAvatar={uploadAvatar}
          />
        </div>
      </GlassCard>

      <div className="flex flex-wrap gap-4 justify-center p-4 glass rounded-xl">
        {composedSlides.map((props, i) => (
          <div key={i} className="flex flex-col items-center gap-2 group">
            <SlideCanvas ref={setRef(i)} scale={0.25}>
              <Template {...props} profile={profile} />
            </SlideCanvas>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 font-mono">{String(i + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
              <button
                onClick={() => exportOne(i)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] inline-flex items-center gap-1 text-accent hover:text-accent-foreground"
                title="Baixar este slide"
              >
                <Download className="h-3 w-3" /> PNG
              </button>
            </div>
          </div>
        ))}
      </div>

      {copy.legenda && (
        <GlassCard>
          <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Legenda do post</div>
          <p className="text-sm text-white/80 whitespace-pre-wrap mb-3">{copy.legenda}</p>
          {copy.hashtags && copy.hashtags.length > 0 && (
            <p className="text-xs text-accent">{copy.hashtags.join(" ")}</p>
          )}
        </GlassCard>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onFinish}
          className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
        >
          <Check className="h-4 w-4" /> Finalizar pipeline
        </button>
      </div>
    </div>
  );
}
