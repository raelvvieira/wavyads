import { useState, useEffect } from "react";
import { Loader2, Search, RotateCw, Check } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ViralPost } from "@/hooks/useViralScraper";

interface Props {
  post: ViralPost | null;
  initialTema?: string;
  initialAngulo?: string;
  copyReferencia?: string;
  onApprove: (briefing: string, tema: string) => void;
}


function deriveTema(post: ViralPost | null, initialTema?: string): string {
  if (initialTema) return initialTema;
  if (!post) return "";
  const caption = (post.caption || "").replace(/\s+/g, " ").trim();
  if (!caption) return `Conteúdo de @${post.username}`;
  // primeiras 12 palavras como tema base
  return caption.split(" ").slice(0, 12).join(" ");
}

export function ResearchStep({ post, initialTema, initialAngulo, copyReferencia, onApprove }: Props) {
  const [tema, setTema] = useState(() => deriveTema(post, initialTema));
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTema(deriveTema(post, initialTema));
    setBriefing("");
    setError(null);
  }, [post, initialTema]);

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
      if (!data?.briefing) setError("A pesquisa retornou vazia. Tente novamente.");

    } catch (e: any) {
      setError(e?.message || "Falha ao pesquisar");
    } finally {
      setLoading(false);
    }
  };

  // estado: pré-pesquisa
  if (!loading && !briefing) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-6">
          <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 2 · Pesquisa</div>
          <h2 className="text-xl font-semibold mb-4">Tema detectado</h2>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-3 text-sm mb-2 text-center"
            placeholder="Sobre o que pesquisar?"
          />
          <p className="text-xs text-white/40 mb-6">Você pode ajustar o tema antes de pesquisar.</p>
          <button
            onClick={run}
            className="btn-accent rounded-lg px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
          >
            <Search className="h-4 w-4" /> Iniciar Pesquisa
          </button>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </GlassCard>
    );
  }

  // estado: loading
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
