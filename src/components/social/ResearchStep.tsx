import { useState, useEffect } from "react";
import { Loader2, Search, RotateCw, Check, SkipForward, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { ViralPost } from "@/hooks/useViralScraper";

interface Props {
  post: ViralPost | null;
  initialTema?: string;
  initialAngulo?: string;
  copyReferencia?: string;
  onApprove: (briefing: string, tema: string) => void;
}

function captionFallback(post: ViralPost | null): string {
  if (!post) return "";
  const caption = (post.caption || "").replace(/\s+/g, " ").trim();
  return caption ? caption.split(" ").slice(0, 12).join(" ") : `Conteúdo de @${post.username}`;
}

export function ResearchStep({ post, initialTema, initialAngulo, copyReferencia, onApprove }: Props) {
  const [tema, setTema] = useState(initialTema || captionFallback(post));
  const [generatingTema, setGeneratingTema] = useState(false);
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBriefing("");
    setError(null);

    // If initialTema is set (user returning to this step), use it as-is
    if (initialTema) {
      setTema(initialTema);
      return;
    }

    const copy = copyReferencia?.trim() || "";
    const isMeaningfulCopy = copy.length > 50 && !copy.startsWith("[");

    if (post?.id && isMeaningfulCopy) {
      setGeneratingTema(true);
      setTema("");
      supabase.functions
        .invoke("social-tema-gen", { body: { copy_consolidada: copy } })
        .then(({ data, error: fnErr }) => {
          if (!fnErr && !data?.error && data?.tema) {
            setTema(data.tema);
          } else {
            setTema(captionFallback(post));
          }
        })
        .catch(() => setTema(captionFallback(post)))
        .finally(() => setGeneratingTema(false));
      return;
    }

    setTema(captionFallback(post));
  }, [post, initialTema, copyReferencia]);

  const run = async () => {
    if (!tema.trim()) {
      toast({ title: "Defina um tema", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    setBriefing("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("social-research", {
        body: { tema: tema.trim(), angulo: initialAngulo || "", copy_referencia: copyReferencia || "" },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setBriefing(data?.briefing || "");
      if (data?.briefing) recordAiUsage("text-claude-websearch", 1);
      if (!data?.briefing) setError("A pesquisa retornou vazia. Tente novamente.");
    } catch (e: any) {
      setError(e?.message || "Falha ao pesquisar");
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    if (!tema.trim()) {
      toast({ title: "Defina um tema antes de pular", variant: "destructive" });
      return;
    }
    const fallback = (copyReferencia && copyReferencia.trim())
      ? `[Pesquisa pulada — usando copy do post viral como referência]\n\nTema: ${tema.trim()}\n\n${copyReferencia.trim()}`
      : `[Pesquisa pulada — sem briefing externo]\n\nTema: ${tema.trim()}`;
    onApprove(fallback, tema.trim());
  };

  // estado: gerando tema via IA
  if (generatingTema) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" />
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
          <p className="text-base text-white/80">Analisando post viral e extraindo tema…</p>
          <p className="text-xs text-white/40 mt-2">Identificando assunto com precisão técnica</p>
        </div>
      </GlassCard>
    );
  }

  // estado: pré-pesquisa
  if (!loading && !briefing) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-6">
          <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 2 · Pesquisa</div>
          <h2 className="text-xl font-semibold mb-1">Tema detectado</h2>
          <p className="text-xs text-white/40 mb-4">
            {copyReferencia ? "Gerado a partir da copy extraída — ajuste se necessário." : "Você pode ajustar o tema antes de pesquisar."}
          </p>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-3 text-sm mb-6 text-center"
            placeholder="Sobre o que pesquisar?"
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={run}
              className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" /> Iniciar Pesquisa
            </button>
            <button
              onClick={skip}
              className="glass rounded-lg px-6 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-white/5"
              title="Pula a pesquisa e usa só a copy extraída do post viral"
            >
              <SkipForward className="h-4 w-4" /> Pular pesquisa
            </button>
          </div>
          {copyReferencia && (
            <p className="text-[11px] text-white/40 mt-3">
              Ao pular, a copy extraída do post viral será usada como referência.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </GlassCard>
    );
  }

  // estado: loading pesquisa
  if (loading) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-base text-white/80">
            🔍 Pesquisando sobre <span className="text-accent font-semibold">"{tema}"</span> na internet…
          </p>
          <p className="text-xs text-white/40 mt-2">Isso pode levar alguns segundos</p>
        </div>
      </GlassCard>
    );
  }

  // estado: resultado
  return (
    <GlassCard className="max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider text-accent mb-1">Etapa 2 · Pesquisa</div>
        <h2 className="text-lg font-semibold">📋 Briefing de pesquisa — {tema}</h2>
      </div>

      <textarea
        value={briefing}
        onChange={(e) => setBriefing(e.target.value)}
        className="w-full min-h-[360px] rounded-lg bg-white/[0.03] border border-white/10 px-5 py-4 text-sm leading-relaxed text-white/90 focus:outline-none focus:border-accent/40 transition-colors resize-y"
      />

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 justify-between mt-5">
        <button
          onClick={run}
          disabled={loading}
          className="glass rounded-lg px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
        >
          <RotateCw className="h-4 w-4" /> Pesquisar novamente
        </button>
        <button
          onClick={() => onApprove(briefing.trim(), tema.trim())}
          disabled={!briefing.trim()}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Usar este briefing
        </button>
      </div>
    </GlassCard>
  );
}
