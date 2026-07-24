import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Package, Check, Loader2, Save } from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { GlassCard } from "@/components/GlassCard";
import { ProfileEditor } from "./ProfileEditor";
import { SlideCanvas } from "./SlideCanvas";
import { PATTERN_TEMPLATES } from "./templates";
import { AdaptiveCarouselProvider, waitForAdaptiveReady } from "./templates/adaptive";
import { determinarFormato, templateFromPattern, type TemplateId, type TemplateSlideProps } from "./templates/shared";
import { useCompiledDesign, DesignErrorBoundary } from "./useCompiledDesign";
import { useSocialProfile } from "@/hooks/useSocialProfile";
import { toast } from "@/hooks/use-toast";
import type { CopyAprovada, SlideImagem, CopyPatternId } from "@/types/social";

interface Props {
  tema: string;
  copy: CopyAprovada;
  imagens: SlideImagem[];
  patternId?: CopyPatternId | null;
  /** Código React custom do template selecionado. Se presente e válido, substitui o layout embutido. */
  designCode?: string;
  onFinish: () => void;
}

export function DesignStep({ tema, copy, imagens, patternId, designCode, onFinish }: Props) {
  const { profile, template, save, uploadAvatar } = useSocialProfile();
  // Auto: pattern_id da copy → template, com override manual.
  const suggested = templateFromPattern(patternId ?? copy.pattern_id);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateId>(suggested || template);
  const [exporting, setExporting] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
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

  const BuiltinTemplate = PATTERN_TEMPLATES[currentTemplate];
  // Design custom (código React do template). Fallback para o embutido em erro.
  const { Comp: CustomDesign, error: designError } = useCompiledDesign(designCode);
  const Template = CustomDesign || BuiltinTemplate;
  const usingCustom = !!CustomDesign;
  // Algum slide falhou no render do custom e caiu no embutido.
  const [renderFailed, setRenderFailed] = useState(false);
  useEffect(() => { setRenderFailed(false); }, [designCode]);

  // Chave que muda sempre que o conteúdo visível dos slides muda, para o
  // AdaptiveCarouselProvider reiniciar o ciclo de auto-fit do texto.
  const adaptiveSessionKey = useMemo(
    () =>
      `${currentTemplate}:${usingCustom ? "custom" : "builtin"}:` +
      composedSlides.map((s) => `${s.titulo}|${s.corpo}|${s.imgUrl ?? ""}`).join("~~"),
    [currentTemplate, usingCustom, composedSlides],
  );

  const setRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) slideRefs.current.set(i, el);
    else slideRefs.current.delete(i);
  };

  const baseName = (tema || "carrossel").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "carrossel";

  const exportOne = async (i: number) => {
    const node = slideRefs.current.get(i);
    if (!node) return;
    setExportingIndex(i);
    try {
      await waitForAdaptiveReady(node);
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
    } finally {
      setExportingIndex(null);
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < total; i++) {
        const node = slideRefs.current.get(i);
        if (!node) continue;
        await waitForAdaptiveReady(node);
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

      {designCode && (
        <div className={`rounded-lg px-3 py-2 text-xs border ${usingCustom && !renderFailed ? "bg-accent/5 border-accent/20 text-white/70" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
          {!usingCustom
            ? `Código de design com erro — usando o layout embutido. ${designError || ""}`
            : renderFailed
            ? "Alguns slides falharam no código custom e usaram o layout embutido."
            : "Usando o código de design custom deste template."}
        </div>
      )}

      <AdaptiveCarouselProvider sessionKey={adaptiveSessionKey} paused={exporting || exportingIndex !== null}>
        <div className="flex flex-wrap gap-4 justify-center p-4 glass rounded-xl">
          {composedSlides.map((props, i) => (
            <div key={i} className="flex flex-col items-center gap-2 group">
              <SlideCanvas ref={setRef(i)} scale={0.25}>
                <DesignErrorBoundary
                  resetKey={designCode || "builtin"}
                  onError={() => setRenderFailed(true)}
                  fallback={<BuiltinTemplate {...props} profile={profile} />}
                >
                  <Template {...props} profile={profile} />
                </DesignErrorBoundary>
              </SlideCanvas>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-mono">{String(i + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
                <button
                  onClick={() => exportOne(i)}
                  disabled={exportingIndex !== null || exporting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] inline-flex items-center gap-1 text-accent hover:text-accent-foreground disabled:opacity-40"
                  title="Baixar este slide"
                >
                  <Download className="h-3 w-3" /> PNG
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdaptiveCarouselProvider>

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
