import { useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Image as ImageIcon, Loader2, Plug, Ruler, ShieldCheck } from "lucide-react";
import { toPng } from "html-to-image";
import fileSaver from "file-saver";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SlideCanvas } from "@/components/social/design/SlideCanvas";
import { AdaptiveCarouselProvider } from "@/components/social/design/templates/adaptive";
import { PATTERN_TEMPLATES } from "@/components/social/design/templates";
import { getPluggableTemplate, PLUGGABLE_TEMPLATES } from "@/components/social/design/templates/plug-in-registry";
import {
  DEFAULT_PROFILE,
  determinarFormato,
  type TemplateId,
  type TemplateSlideProps,
} from "@/components/social/design/templates/shared";
import {
  TEMPLATE_FIXTURES,
  getTemplateFixture,
  type TemplateFixtureId,
} from "@/components/social/design/lab/fixtures";
import wavyLogo from "@/assets/wavy-logo.png";

const saveAs = (fileSaver as { saveAs?: (blob: Blob, filename?: string) => void })?.saveAs ?? (fileSaver as unknown as (blob: Blob, filename?: string) => void);

interface LabTemplateOption {
  id: string;
  label: string;
  source: string;
  status?: "experimental";
}

const PRODUCTION_TEMPLATE_OPTIONS: LabTemplateOption[] = [
  { id: "1A", label: "1A Tutorial", source: "Template2A" },
  { id: "1B", label: "1B Conflito", source: "Template1B" },
  { id: "2A", label: "2A Storytelling", source: "Template1 light" },
  { id: "2B", label: "2B Editorial Dark", source: "Template1 dark" },
  { id: "4", label: "4 Post Frase", source: "Template3" },
  { id: "5", label: "5 Frase Mestre", source: "Template4" },
];

const TEMPLATE_OPTIONS: LabTemplateOption[] = [
  ...PRODUCTION_TEMPLATE_OPTIONS,
  ...PLUGGABLE_TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    source: template.source,
    status: template.status === "experimental" ? ("experimental" as const) : undefined,
  })),
];

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const waitForStablePaint = async (root?: HTMLElement | null) => {
  await document.fonts.ready;
  await waitForPaint();
  await waitForPaint();

  if (!root) {
    return;
  }

  const startedAt = performance.now();
  while (performance.now() - startedAt < 4000) {
    const adaptiveNode = root.querySelector<HTMLElement>('[data-adaptive-ready="false"]');
    if (!adaptiveNode) {
      return;
    }

    await waitForPaint();
  }
};

export function SocialTemplateLabContent() {
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState<string>("post-frase");
  const [fixtureId, setFixtureId] = useState<TemplateFixtureId>("medium");
  const [mediaFixtureId, setMediaFixtureId] = useState<string>("balanced");
  const [withImage, setWithImage] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const pluginTemplate = getPluggableTemplate(templateId);
  const fixture = pluginTemplate?.fixtures[fixtureId] ?? getTemplateFixture(fixtureId);
  const Template = pluginTemplate?.component ?? PATTERN_TEMPLATES[templateId as TemplateId] ?? PATTERN_TEMPLATES["2A"];
  const activeTemplate = TEMPLATE_OPTIONS.find((item) => item.id === templateId)!;
  const pluginMediaFixtures = pluginTemplate?.mediaFixtures ?? [];
  const activeMediaFixture = pluginMediaFixtures.find((item) => item.id === mediaFixtureId) ?? pluginMediaFixtures[0];
  const hasPluginMediaFixtures = pluginMediaFixtures.length > 0;
  const mediaUrl = hasPluginMediaFixtures ? activeMediaFixture?.imageUrl : withImage ? wavyLogo : undefined;

  const slides = useMemo<TemplateSlideProps[]>(() => {
    const total = fixture.slides.length;
    return fixture.slides.map((slide, index) => ({
      slideIndex: index,
      total,
      titulo: slide.titulo,
      corpo: slide.corpo,
      imgUrl: mediaUrl,
      tipoSlide: slide.tipo,
      formato: determinarFormato(slide.tipo, index, total),
      profile: DEFAULT_PROFILE,
    }));
  }, [fixture, mediaUrl]);

  const setSlideRef = (index: number) => (node: HTMLDivElement | null) => {
    if (node) {
      slideRefs.current.set(index, node);
    } else {
      slideRefs.current.delete(index);
    }
  };

  const exportSlide = async (index: number) => {
    const node = slideRefs.current.get(index);
    if (!node) return;

    setExportingIndex(index);
    try {
      await waitForStablePaint(node);
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1350,
        canvasWidth: 1080,
        canvasHeight: 1350,
        pixelRatio: 1,
        cacheBust: true,
        style: { transform: "scale(1)", transformOrigin: "top left" },
      });
      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, `lab-${templateId}-${fixtureId}-${String(index + 1).padStart(2, "0")}.png`);
    } catch (error) {
      toast({
        title: "Falha ao exportar amostra",
        description: error instanceof Error ? error.message : "Nao foi possivel gerar o PNG.",
        variant: "destructive",
      });
    } finally {
      setExportingIndex(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 pb-12 pt-20 lg:px-6 lg:pt-6">
      <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/social-midia-studio")}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Voltar ao Social Midia Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-accent">
              <Ruler className="h-3.5 w-3.5" /> Fase 4 · Templates adaptativos
            </div>
            <h1 className="text-2xl font-semibold">Laboratorio de templates</h1>
            <p className="mt-1 text-sm text-white/50">Templates atuais e experimentais testados sem alterar a producao.</p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Pipeline de producao intacto
        </div>
      </header>

      <section className="mb-6 grid gap-5 border-b border-white/10 pb-6 xl:grid-cols-[1.4fr_1fr_auto]">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase text-white/40">Template</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTemplateId(option.id)}
                className={cn(
                  "min-h-14 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  option.id === templateId
                    ? "border-accent/60 bg-accent/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="block text-xs font-semibold">{option.label}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
                  {option.status === "experimental" && <Plug className="h-3 w-3 text-sky-300" />}
                  {option.source}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-medium uppercase text-white/40">Carga de texto</div>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATE_FIXTURES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFixtureId(option.id)}
                className={cn(
                  "min-h-14 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  option.id === fixtureId
                    ? "border-accent/60 bg-accent/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className="block text-xs font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-[10px] text-white/40">{option.slides[0].titulo.length}c capa</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/40">{fixture.description}</p>
        </div>

        {hasPluginMediaFixtures ? (
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase text-white/40">Media de teste</div>
            <div className="grid gap-2">
              {pluginMediaFixtures.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMediaFixtureId(option.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    option.id === mediaFixtureId
                      ? "border-accent/60 bg-accent/10 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-white/40">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 xl:justify-end">
            <Switch id="lab-image" checked={withImage} onCheckedChange={setWithImage} />
            <Label htmlFor="lab-image" className="inline-flex items-center gap-2 text-xs text-white/70">
              <ImageIcon className="h-4 w-4" /> Imagem de teste
            </Label>
          </div>
        )}
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{activeTemplate.label}</div>
          <div className="text-xs text-white/40">
            {activeTemplate.source} · {fixture.label} · 1080 × 1350
          </div>
          {pluginTemplate && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-sky-300">
              <Plug className="h-3 w-3" /> Descoberto automaticamente pelo manifest
            </div>
          )}
        </div>
        <div className="rounded-md border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-200">
          {hasPluginMediaFixtures ? "AdaptiveText ativo no laboratorio" : "Baseline sem adaptacao automatica"}
        </div>
      </div>

      <AdaptiveCarouselProvider
        sessionKey={`${templateId}:${fixtureId}:${hasPluginMediaFixtures ? mediaFixtureId : withImage ? "image" : "empty"}`}
        paused={exportingIndex !== null}
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, index) => (
            <article key={`${templateId}-${fixtureId}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Slide {index + 1} · {slide.formato}
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/40">
                    Titulo {slide.titulo.length}c · Corpo {slide.corpo.length}c
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => exportSlide(index)}
                  disabled={exportingIndex !== null}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={`Baixar slide ${index + 1} em PNG`}
                >
                  {exportingIndex === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="flex min-h-[330px] items-start justify-center overflow-auto rounded-md bg-black/30 p-3">
                <SlideCanvas ref={setSlideRef(index)} scale={0.22}>
                  <Template {...slide} />
                </SlideCanvas>
              </div>
            </article>
          ))}
        </section>
      </AdaptiveCarouselProvider>
    </main>
  );
}

export default function SocialTemplateLabPage() {
  const { isAdmin, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <SocialTemplateLabContent />;
}
