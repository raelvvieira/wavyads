import { useState } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { FormatPicker } from "./FormatPicker";
import { CopyEditor } from "./CopyEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { recordAiUsage } from "@/lib/aiUsageTracker";
import type { Formato, CopyAprovada } from "@/types/social";

interface Props {
  tema: string;
  briefing: string;
  onApprove: (formato: Formato, num_slides: number, copy: CopyAprovada) => void;
}

export function FormatStep({ tema, briefing, onApprove }: Props) {
  const [formato, setFormato] = useState<Formato | null>(null);
  const [numSlides, setNumSlides] = useState(7);
  const [loading, setLoading] = useState(false);
  const [copy, setCopy] = useState<CopyAprovada | null>(null);

  const generate = async (fmt: Formato, n: number) => {
    setFormato(fmt);
    setNumSlides(n);
    setLoading(true);
    setCopy(null);
    try {
      let mode = "";
      const body: any = { tema, briefing };
      if (fmt === "reel") mode = "reel";
      else if (fmt === "post_unico") mode = "post_unico";
      else {
        mode = "carrossel";
        body.formato = fmt;
        body.num_slides = n;
      }
      body.mode = mode;

      const { data, error } = await supabase.functions.invoke("social-copy", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      recordAiUsage("text-claude-sonnet", 1);
      setCopy(data as CopyAprovada);
    } catch (e: any) {
      toast({ title: "Falha ao gerar copy", description: e.message, variant: "destructive" });
      setFormato(null);
    } finally {
      setLoading(false);
    }
  };

  if (!formato) {
    return <FormatPicker onConfirm={generate} />;
  }

  if (loading) {
    return (
      <GlassCard className="max-w-2xl mx-auto">
        <div className="text-center py-16">
          <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-base text-white/80">✍️ Gerando copy estratégica…</p>
          <p className="text-xs text-white/40 mt-2">Pode levar até 30 segundos</p>
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
        formato={formato}
        tema={tema}
        initial={copy}
        onRegenAll={() => generate(formato, numSlides)}
        onApprove={(c) => onApprove(formato, numSlides, c)}
      />
    );
  }

  return null;
}
