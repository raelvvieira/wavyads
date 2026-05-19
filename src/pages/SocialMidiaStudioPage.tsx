import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Search, Link2, Flame, ClipboardList, PlayCircle } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { StepIndicator } from "@/components/criativo/StepIndicator";
import { GlassCard } from "@/components/GlassCard";
import { MyBaseSidebar, useMyBase } from "@/components/social/MyBaseSidebar";
import { ViralResultsList } from "@/components/social/ViralResultsList";
import { ResearchStep } from "@/components/social/ResearchStep";
import { useViralScraper, type ViralSource, type ViralPost } from "@/hooks/useViralScraper";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEPS = ["Scraper", "Pesquisa", "Formato", "Copy", "Imagens", "Design"];
const SHORT = ["1", "2", "3", "4", "5", "6"];

interface Pipeline {
  etapa_atual: number;
  post_viral: ViralPost | null;
  briefing_texto: string | null;
  tema: string | null;
  formato: string | null;
  copy: string | null;
  imagens: string[] | null;
  template: string | null;
}

const SOURCE_CARDS: { id: ViralSource; emoji: string; icon: any; title: string; desc: string }[] = [
  { id: "base", emoji: "📋", icon: ClipboardList, title: "Minha Base", desc: "Últimos posts dos perfis salvos" },
  { id: "theme", emoji: "🔍", icon: Search, title: "Por Tema", desc: "Busca por hashtag" },
  { id: "url", emoji: "🔗", icon: Link2, title: "Link Direto", desc: "Cole a URL do post" },
  { id: "top", emoji: "🔥", icon: Flame, title: "Top Viral Geral", desc: "Mais vistos da base" },
];

export default function SocialMidiaStudioPage() {
  const { isAdmin, isLoading } = useRole();
  const { profiles, add, remove } = useMyBase();
  const { loading, results, error, search } = useViralScraper();

  const [pipeline, setPipeline] = useState<Pipeline>({
    etapa_atual: 0,
    post_viral: null,
    briefing_texto: null,
    tema: null,
    formato: null,
    copy: null,
    imagens: null,
    template: null,
  });
  const [source, setSource] = useState<ViralSource>("base");
  const [theme, setTheme] = useState("");
  const [url, setUrl] = useState("");

  const completed = useMemo(
    () => STEPS.map((_, i) => i < pipeline.etapa_atual),
    [pipeline.etapa_atual],
  );

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
    setPipeline((s) => ({ ...s, post_viral: p, etapa_atual: Math.max(s.etapa_atual, 1) }));
    toast({ title: "Referência selecionada", description: `@${p.username}` });
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
            <p className="text-sm text-white/50">Pipeline viral → conteúdo pronto em 6 etapas</p>
          </div>
        </div>
      </header>

      <div className="mb-6">
        <StepIndicator
          steps={STEPS}
          shortSteps={SHORT}
          current={pipeline.etapa_atual}
          completed={completed}
          onJump={(i) => setPipeline((s) => ({ ...s, etapa_atual: i }))}
        />
      </div>

      {pipeline.etapa_atual === 0 && (
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
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="ex: trafegopago, ecommerce, dropshipping"
                className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
              />
            )}
            {source === "url" && (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
              />
            )}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar Virais
            </button>

            {error && (
              <div className="glass rounded-lg px-4 py-3 text-sm text-destructive border-destructive/30">
                {error}
              </div>
            )}

            <ViralResultsList posts={results} loading={loading} onPick={pickPost} />
          </div>
        </div>
      )}

      {pipeline.etapa_atual === 1 && (
        <ResearchStep
          post={pipeline.post_viral}
          initialTema={pipeline.tema || undefined}
          onApprove={(briefing, tema) => {
            setPipeline((s) => ({
              ...s,
              briefing_texto: briefing,
              tema,
              etapa_atual: Math.max(s.etapa_atual, 2),
            }));
            toast({ title: "Briefing salvo", description: "Avançando para Formato" });
          }}
        />
      )}

      {pipeline.etapa_atual > 1 && (
        <GlassCard className="text-center py-16">
          <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa {pipeline.etapa_atual + 1}</div>
          <h2 className="text-xl font-semibold mb-2">{STEPS[pipeline.etapa_atual]}</h2>
          <p className="text-sm text-white/50 mb-4">Em breve</p>
          {pipeline.post_viral && (
            <p className="text-xs text-white/40">
              Referência: <span className="text-white/70">@{pipeline.post_viral.username}</span>
              {pipeline.tema && <> · Tema: <span className="text-white/70">{pipeline.tema}</span></>}
            </p>
          )}
        </GlassCard>
      )}
    </div>
  );
}
