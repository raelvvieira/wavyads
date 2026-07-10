import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { CopyEditor } from "./CopyEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { CopyPatternId, CopyAprovada } from "@/types/social";

interface Props {
  tema: string;
  briefing: string;
  copyReferencia?: string;
  pattern_id: CopyPatternId;
  num_slides: number;
  onApprove: (pattern_id: CopyPatternId, num_slides: number, copy: CopyAprovada) => void;
}

export function FormatStep({ tema, briefing, copyReferencia, pattern_id: prePat, num_slides: preNum, onApprove }: Props) {
  const [pattern] = useState<CopyPatternId>(prePat);
  const [numSlides, setNumSlides] = useState(preNum);
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

    if (!briefing || briefing.trim().length === 0) {
      toast({
        title: "Briefing incompleto",
        description: "A copy extraída não foi encontrada. Volte para a etapa anterior.",
        variant: "destructive"
      });
      return;
    }

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
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate a partir do template selecionado na etapa anterior
  useEffect(() => {
    if (!copy && !loading) {
      generate(prePat, preNum);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
