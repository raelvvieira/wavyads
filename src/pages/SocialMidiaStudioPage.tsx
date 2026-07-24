import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Search, Link2, Flame, ClipboardList, PlayCircle } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { StepIndicator } from "@/components/criativo/StepIndicator";
import { GlassCard } from "@/components/GlassCard";
import { MyBaseSidebar, useMyBase } from "@/components/social/MyBaseSidebar";
import { ViralResultsList } from "@/components/social/ViralResultsList";
import { CopyExtractionStep } from "@/components/social/CopyExtractionStep";
import { ResearchStep } from "@/components/social/ResearchStep";
import { FormatPicker } from "@/components/social/FormatPicker";
import { FormatStep } from "@/components/social/FormatStep";
import { ImageStep } from "@/components/social/ImageStep";
import { ReelFinalStep } from "@/components/social/ReelFinalStep";
import { DesignStep } from "@/components/social/design/DesignStep";

import { useViralScraper, type ViralSource, type ViralPost } from "@/hooks/useViralScraper";
import { useImageStyles } from "@/hooks/useImageStyles";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildCopyPrompt, type CopyTemplate } from "@/lib/copyTemplates";
import { buildImagePrompt, suggestStyleId, getStyle, templateSuffixFromPattern } from "@/lib/wavyImageStyles";
import type { CopyPatternId, CopyAprovada, SlideImagem, PostCopy } from "@/types/social";

const STEPS = ["Scraper", "Resumo", "Template", "Copy Final", "Imagens", "Design"];
const SHORT = ["1", "2", "3", "4", "5", "6"];

interface Pipeline {
  etapa_atual: number;
  post_viral: ViralPost | null;
  post_copy: PostCopy | null;
  tema: string | null;
  pattern_id: CopyPatternId | null;
  num_slides: number;
  /** Template escolhido na Etapa 3 (default editado ou custom). */
  selected_template: CopyTemplate | null;
  copy_aprovada: CopyAprovada | null;
  imagens: SlideImagem[] | null;
}


const SOURCE_CARDS: { id: ViralSource; emoji: string; icon: any; title: string; desc: string }[] = [
  { id: "base", emoji: "📋", icon: ClipboardList, title: "Minha Base", desc: "Últimos posts dos perfis salvos" },
  { id: "theme", emoji: "🔍", icon: Search, title: "Por Tema", desc: "Busca por hashtag" },
  { id: "url", emoji: "🔗", icon: Link2, title: "Link Direto", desc: "Cole a URL do post" },
  { id: "top", emoji: "🔥", icon: Flame, title: "Top Viral Geral", desc: "Mais vistos da base" },
];

// Preenche campos vazios com placeholders para permitir navegação livre entre etapas (modo configuração)
function jumpTo(s: Pipeline, i: number): Pipeline {
  const next: Pipeline = { ...s, etapa_atual: i };
  if (i >= 1 && !next.post_copy) {
    next.post_copy = {
      tipo: "carrossel",
      legenda: "",
      hashtags: [],
      copy_consolidada: "[placeholder de configuração]",
      status: {},
    } as PostCopy;
  }
  if (i >= 2 && !next.tema) {
    next.tema = "Tema de configuração";
  }
  if (i >= 3 && !next.pattern_id) {
    next.pattern_id = "2A";
    next.num_slides = 7;
  }
  if (i >= 4 && !next.copy_aprovada) {
    next.pattern_id = next.pattern_id || "2A";
    next.num_slides = next.num_slides || 7;
    next.copy_aprovada = {
      pattern_id: next.pattern_id,
      slides: Array.from({ length: 5 }).map((_, k) => ({
        tipo: (k === 0 ? "cover" : k === 4 ? "cta" : "solucao") as any,
        titulo: `Slide ${k + 1}`,
        corpo: "Conteúdo de exemplo para configuração visual deste slide.",
        visual_prompt: "placeholder visual",
      })),
      legenda: "Legenda de exemplo para configuração.",
      hashtags: ["#exemplo", "#config"],
    };
  }
  if (i >= 5 && (!next.imagens || next.imagens.length === 0)) {
    const slides = next.copy_aprovada?.slides || [];
    next.imagens = slides.map((_, k) => ({
      slide_index: k,
      url: "/placeholder.svg",
      source: "upload" as const,
      prompt_usado: "placeholder",
    }));
  }
  return next;
}


export default function SocialMidiaStudioPage() {
  const { isAdmin, isLoading } = useRole();
  const { profiles, add, remove } = useMyBase();
  const { loading, results, error, search, getRaw } = useViralScraper();

  const [pipeline, setPipeline] = useState<Pipeline>({
    etapa_atual: 0,
    post_viral: null,
    post_copy: null,
    tema: null,
    pattern_id: null,
    num_slides: 0,
    selected_template: null,
    copy_aprovada: null,
    imagens: null,
  });
  const [source, setSource] = useState<ViralSource>("base");
  const [theme, setTheme] = useState("");
  const [url, setUrl] = useState("");

  const isReel = pipeline.pattern_id === "3";
  const isExtractingCopy = pipeline.etapa_atual === 0 && !!pipeline.post_viral && !pipeline.post_copy;

  const completed = useMemo(
    () => STEPS.map((_, i) => i < pipeline.etapa_atual),
    [pipeline.etapa_atual],
  );

  // Prompt final do template selecionado (editável/custom) para a Copy Final.
  const templatePrompt = useMemo(() => {
    if (!pipeline.selected_template || !pipeline.tema || !pipeline.post_copy) return undefined;
    return buildCopyPrompt(pipeline.selected_template, {
      tema: pipeline.tema,
      briefing: pipeline.post_copy.copy_consolidada,
      num_slides: pipeline.num_slides,
      copy_referencia: pipeline.post_copy.copy_consolidada,
    });
  }, [pipeline.selected_template, pipeline.tema, pipeline.post_copy, pipeline.num_slides]);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleSearch = async () => {
    if (source === "theme" && !theme.trim()) {
      toast({ title: "Informe um tema", variant: "destructive" });
      return;
    }
    if (source === "url" && !url.trim()) {
      toast({ title: "Informe uma URL", variant: "destructive" });
      return;
    }
    await search({ source, profiles, theme, url });
  };

  const pickPost = (p: ViralPost) => {
    setPipeline((s) => ({ ...s, post_viral: p, post_copy: null }));
  };

  // ---- Criar post rápido: template → copy → imagens → arte final, sozinho ----
  const { styles: imageStyles } = useImageStyles();
  const [quickBusy, setQuickBusy] = useState<{ step: "copy" | "images"; done: number; total: number } | null>(null);

  const quickCreate = async (template: CopyTemplate, num_slides: number) => {
    const tema = pipeline.tema?.trim();
    const briefing = pipeline.post_copy?.copy_consolidada?.trim();
    if (!tema || !briefing) {
      toast({ title: "Faltam dados", description: "Confirme o tema na etapa anterior.", variant: "destructive" });
      return;
    }
    const pattern_id = template.baseLayout;
    setQuickBusy({ step: "copy", done: 0, total: 1 });
    try {
      // 1) Copy — mesma chamada da Etapa 4 (FormatStep)
      const tPrompt = buildCopyPrompt(template, { tema, briefing, num_slides, copy_referencia: briefing });
      const { data: copyData, error: copyErr } = await supabase.functions.invoke("social-copy", {
        body: { mode: "pattern", pattern_id, tema, briefing, num_slides, copy_referencia: briefing, template_prompt: tPrompt },
      });
      if (copyErr) throw new Error(copyErr.message);
      if ((copyData as any)?.error) throw new Error((copyData as any).error);
      recordAiUsage("text-claude-sonnet", 1);
      const copy: CopyAprovada = { ...(copyData as CopyAprovada), pattern_id };

      // Reel não tem imagens/design — entrega o roteiro (Etapa 5).
      if (pattern_id === "3") {
        setPipeline((s) => ({ ...s, selected_template: template, pattern_id, num_slides, copy_aprovada: copy, etapa_atual: 4 }));
        setQuickBusy(null);
        toast({ title: "Reel pronto!", description: "Roteiro gerado." });
        return;
      }

      // 2) Imagens — mesma lógica da Etapa 5 (ImageStep), estilo sugerido por slide
      const slides = copy.slides || [];
      const templateId = templateSuffixFromPattern(pattern_id);
      const fullText = [...slides.map((sl) => `${sl.titulo} ${sl.corpo} ${sl.visual_prompt}`), copy.legenda].join(" ");
      const imagens: SlideImagem[] = [];
      for (let i = 0; i < slides.length; i++) {
        setQuickBusy({ step: "images", done: i, total: slides.length });
        const styleId = suggestStyleId(slides[i], fullText, tema);
        const style = getStyle(styleId, imageStyles) || imageStyles[0];
        const prompt = buildImagePrompt({
          style, template_id: templateId, visual_prompt: slides[i].visual_prompt,
          tema, slide_titulo: slides[i].titulo, slide_corpo: slides[i].corpo,
        });
        try {
          const { data: imgData, error: imgErr } = await supabase.functions.invoke("social-image-gen", {
            body: {
              prompt, style_id: style.id, pattern_id, tema, slide_index: i,
              slide_titulo: slides[i].titulo, slide_corpo: slides[i].corpo,
              visual_prompt: slides[i].visual_prompt, template_id: templateId,
            },
          });
          if (imgErr || (imgData as any)?.error) throw new Error(imgErr?.message || (imgData as any)?.error);
          recordAiUsage("image-gemini-pro", 1);
          imagens.push({ slide_index: i, url: (imgData as any).url, source: "ai", prompt_usado: (imgData as any).prompt_usado || prompt, style_id: style.id });
        } catch (imgE) {
          // Um slide sem imagem não trava o fluxo — o template renderiza puro texto.
          console.warn(`quickCreate: imagem do slide ${i} falhou`, imgE);
        }
      }

      // 3) Arte final — deixa tudo pronto na Etapa 6 (Design)
      setQuickBusy({ step: "images", done: slides.length, total: slides.length });
      setPipeline((s) => ({ ...s, selected_template: template, pattern_id, num_slides, copy_aprovada: copy, imagens, etapa_atual: 5 }));
      setQuickBusy(null);
      toast({ title: "Post pronto!", description: "Arte final gerada. Revise e exporte." });
    } catch (e: any) {
      setQuickBusy(null);
      toast({ title: "Falha ao criar post rápido", description: e?.message || "Erro", variant: "destructive" });
    }
  };


  return (
    <div className="container mx-auto px-4 lg:px-6 pt-20 lg:pt-6 pb-10 max-w-7xl">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <PlayCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Social Mídia Studio</h1>
            <p className="text-sm text-white/50">Pipeline viral → conteúdo pronto</p>
          </div>
        </div>
      </header>

      <div className="mb-6">
        <StepIndicator
          steps={STEPS}
          shortSteps={SHORT}
          current={pipeline.etapa_atual}
          completed={completed}
          allowJumpAny
          onJump={(i) => setPipeline((s) => jumpTo(s, i))}
        />
      </div>


      {/* Etapa 1 — Scraper */}
      {pipeline.etapa_atual === 0 && !isExtractingCopy && (
        <div className="flex flex-col lg:flex-row gap-4">
          <MyBaseSidebar profiles={profiles} onAdd={add} onRemove={remove} />

          <div className="flex-1 min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOURCE_CARDS.map((c) => {
                const active = source === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSource(c.id)}
                    className={cn(
                      "glass rounded-xl p-4 text-left transition-all",
                      active ? "border-accent/60 bg-accent/10 accent-glow" : "hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-sm font-semibold text-white">{c.title}</span>
                    </div>
                    <p className="text-xs text-white/50">{c.desc}</p>
                  </button>
                );
              })}
            </div>

            {source === "theme" && (
              <input value={theme} onChange={(e) => setTheme(e.target.value)}
                placeholder="ex: trafegopago, ecommerce, dropshipping"
                className="glass-input w-full rounded-lg px-3 py-2.5 text-sm" />
            )}
            {source === "url" && (
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="glass-input w-full rounded-lg px-3 py-2.5 text-sm" />
            )}

            <button onClick={handleSearch} disabled={loading}
              className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {source === "url" ? "Analisar" : "Buscar Virais"}
            </button>

            {error && (
              <div className="glass rounded-lg px-4 py-3 text-sm text-destructive border-destructive/30">{error}</div>
            )}

            <ViralResultsList posts={results} loading={loading} onPick={pickPost} skeletonCount={source === "url" ? 1 : 6} />
          </div>
        </div>
      )}

      {/* Etapa 1.5 — Extração de Copy */}
      {isExtractingCopy && pipeline.post_viral && (
        <CopyExtractionStep
          post={pipeline.post_viral}
          rawItem={getRaw(pipeline.post_viral.id) || pipeline.post_viral}
          onBack={() => setPipeline((s) => ({ ...s, post_viral: null, post_copy: null }))}
          onApprove={(copy) => {
            setPipeline((s) => ({ ...s, post_copy: copy, etapa_atual: 1 }));
            toast({ title: "Copy do post salva", description: "Avançando para a Pesquisa" });
          }}
        />
      )}

      {/* Etapa 2 — Resumo */}
      {pipeline.etapa_atual === 1 && pipeline.post_copy && (
        <ResearchStep
          copyConsolidada={pipeline.post_copy.copy_consolidada}
          tema={pipeline.tema || ""}
          onApprove={(tema) => {
            setPipeline((s) => ({ ...s, tema, etapa_atual: 2 }));
            toast({ title: "Tema confirmado", description: "Avançando para Template" });
          }}
        />
      )}

      {/* Etapa 3 — Template */}
      {pipeline.etapa_atual === 2 && pipeline.tema?.trim() && (
        quickBusy ? (
          <GlassCard className="max-w-2xl mx-auto text-center py-16">
            <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1">Criando seu post…</h2>
            <p className="text-sm text-white/60">
              {quickBusy.step === "copy"
                ? "Gerando a copy final…"
                : `Gerando imagens ${Math.min(quickBusy.done + 1, quickBusy.total)}/${quickBusy.total}…`}
            </p>
            <p className="text-xs text-white/35 mt-2">Template, copy, imagens e arte final — tudo automático. Pode levar 1–2 min.</p>
            <div className="mt-6 w-full max-w-md mx-auto h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${quickBusy.step === "copy" ? 15 : 20 + (quickBusy.done / Math.max(1, quickBusy.total)) * 80}%` }}
              />
            </div>
          </GlassCard>
        ) : (
          <FormatPicker
            onConfirm={(template, num_slides) => {
              setPipeline((s) => ({
                ...s, selected_template: template, pattern_id: template.baseLayout, num_slides, etapa_atual: 3,
              }));
              toast({ title: "Template selecionado", description: "Avançando para Copy Final" });
            }}
            onQuickCreate={quickCreate}
          />
        )
      )}



      {/* Etapa 4 — Copy Final */}
      {pipeline.etapa_atual === 3 && pipeline.tema?.trim() && pipeline.pattern_id && pipeline.post_copy && (
        <FormatStep
          tema={pipeline.tema}
          briefing={pipeline.post_copy.copy_consolidada}
          copyReferencia={pipeline.post_copy.copy_consolidada}
          pattern_id={pipeline.pattern_id}
          num_slides={pipeline.num_slides}
          templatePrompt={templatePrompt}
          onApprove={(pattern_id, num_slides, copy) => {
            setPipeline((s) => ({
              ...s, pattern_id, num_slides, copy_aprovada: copy, etapa_atual: 4,
            }));
            toast({
              title: "Copy aprovada",
              description: pattern_id === "3" ? "Reel finalizado" : "Avançando para Imagens",
            });
          }}
        />
      )}

      {/* Etapa 5 — Imagens (ou final do Reel) */}
      {pipeline.etapa_atual === 4 && pipeline.copy_aprovada && pipeline.pattern_id && (
        isReel ? (
          <ReelFinalStep tema={pipeline.tema || ""} copy={pipeline.copy_aprovada} />
        ) : (
          <ImageStep
            patternId={pipeline.pattern_id}
            tema={pipeline.tema || ""}
            copy={pipeline.copy_aprovada}
            initial={pipeline.imagens || undefined}
            onApprove={(imagens) => {
              setPipeline((s) => ({ ...s, imagens, etapa_atual: 5 }));
              toast({ title: "Imagens aprovadas", description: "Avançando para Design" });
            }}
          />
        )
      )}

      {/* Etapa 6 — Design */}
      {pipeline.etapa_atual === 5 && pipeline.copy_aprovada && (
        isReel ? (
          <GlassCard className="text-center py-16">
            <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 6 · Design</div>
            <h2 className="text-xl font-semibold mb-2">Reels não geram slides</h2>
            <p className="text-sm text-white/50">Use o roteiro entregue na etapa anterior.</p>
          </GlassCard>
        ) : (
          <DesignStep
            tema={pipeline.tema || ""}
            copy={pipeline.copy_aprovada}
            imagens={pipeline.imagens || []}
            patternId={pipeline.pattern_id}
            designCode={pipeline.selected_template?.designCode}
            onFinish={() => {
              toast({ title: "Carrossel finalizado!", description: "Pipeline completo." });
              setPipeline({
                etapa_atual: 0, post_viral: null, post_copy: null,
                tema: null, pattern_id: null, num_slides: 0, selected_template: null, copy_aprovada: null, imagens: null,
              });
            }}
          />
        )
      )}

    </div>
  );
}
