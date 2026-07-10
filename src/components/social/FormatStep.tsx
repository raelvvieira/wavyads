import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FormatPicker } from "./FormatPicker";
import { CopyEditor } from "./CopyEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { CopyPatternId, CopyAprovada, CopyIntensificacao } from "@/types/social";

interface Props {
  tema: string;
  briefing: CopyIntensificacao;
  copyReferencia?: string;
  pattern_id?: CopyPatternId;
  num_slides?: number;
  onApprove: (pattern_id: CopyPatternId, num_slides: number, copy: CopyAprovada) => void;
}

export function FormatStep({ tema, briefing, copyReferencia, pattern_id: prePat, num_slides: preNum, onApprove }: Props) {
  const [pattern, setPattern] = useState<CopyPatternId | null>(prePat || null);
  const [numSlides, setNumSlides] = useState(preNum || 7);
  const [loading, setLoading] = useState(false);
  const [copy, setCopy] = useState<CopyAprovada | null>(null);

  const generate = async (pat: CopyPatternId, n: number) => {
    // Validação client-side antes de chamar
    if (!tema || tema.trim().length === 0) {
      toast({
        title: "Tema vazio",
        description: "O tema não pode estar vazio. Volte para a etapa anterior e complete o briefing.",
        variant: "destructive"
      });
      return;
    }

    if (!briefing?.briefing_texto || briefing.briefing_texto.trim().length === 0) {
      toast({
        title: "Briefing incompleto",
        description: "O briefing não foi completado. Volte para a etapa anterior e execute 'Intensificar copy'.",
        variant: "destructive"
      });
      return;
    }

    setPattern(pat);
    setNumSlides(n);
    setLoading(true);
    setCopy(null);
    try {
      const { data, error } = await supabase.functions.invoke("social-copy", {
        body: { mode: "pattern", pattern_id: pat, tema, briefing, num_slides: n, copy_referencia: copyReferencia || "" },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Erro ao chamar edge function: ${error.message}`);
      }

      if (data?.error) {
        console.error("API error response:", data.error);
        // Diferencia erro de configuração de erro de API
        if (data.error.includes("ANTHROPIC_API_KEY")) {
          throw new Error("Erro de configuração: Chave da API não está disponível. Contate o administrador.");
        }
        throw new Error(data.error);
      }

      recordAiUsage("text-claude-sonnet", 1);
      setCopy({ ...(data as CopyAprovada), pattern_id: pat });
    } catch (e: any) {
      const errorMessage = e?.message || "Erro desconhecido ao gerar copy";
      console.error("Generate copy error:", errorMessage);
      toast({
        title: "Falha ao gerar copy",
        description: errorMessage,
        variant: "destructive"
      });
      setPattern(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate if pattern is pre-selected
  useEffect(() => {
    if (prePat && !copy && !loading) {
      generate(prePat, preNum || 7);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!pattern) {
    return (
      <>
        <GlassCard className="max-w-4xl mx-auto mb-4">
          <div className="text-xs uppercase tracking-wider text-accent mb-1">Etapa 3 · Template + Copy final</div>
          <h2 className="text-lg font-semibold mb-2">A copy final nasce da intensificação + template</h2>
          <p className="text-sm leading-relaxed text-white/60">
            {briefing.briefing_texto}
          </p>
        </GlassCard>
        <FormatPicker onConfirm={generate} />
      </>
    );
  }

  if (loading) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-base text-white/80">Gerando a copy final a partir da intensificação…</p>
          <p className="text-xs text-white/40 mt-2">Template Wavy {pattern} · Pode levar até 30s</p>
          <div className="mt-6 w-full max-w-md mx-auto h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </GlassCard>
    );
  }

  if (copy) {
    return (
      <CopyEditor
        patternId={pattern}
        tema={tema}
        initial={copy}
        onRegenAll={() => generate(pattern, numSlides)}
        onApprove={(c) => onApprove(pattern, numSlides, c)}
      />
    );
  }

  return null;
}
