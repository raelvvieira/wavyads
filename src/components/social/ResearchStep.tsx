import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  copyConsolidada: string;
  tema: string;
  onApprove: (tema: string) => void;
}

interface AnalisisTema {
  tom: string;
  tema_central: string;
  evitar: string;
  estrategia: string;
}

export function ResearchStep({ copyConsolidada, tema, onApprove }: Props) {
  const [temaEditado, setTemaEditado] = useState(tema);
  const [analise, setAnalise] = useState<AnalisisTema | null>(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);

  const canApprove = copyConsolidada.trim() && temaEditado.trim();

  useEffect(() => {
    if (!temaEditado.trim() || !copyConsolidada.trim()) {
      setAnalise(null);
      return;
    }

    const analisarTema = async () => {
      setLoadingAnalise(true);
      try {
        const { data, error } = await supabase.functions.invoke("social-tema-analise", {
          body: {
            tema: temaEditado.trim(),
            copy_consolidada: copyConsolidada.trim(),
          },
        });

        if (error) throw error;
        if (data?.analise) {
          setAnalise(data.analise);
        }
      } catch (e) {
        console.error("Erro ao analisar tema:", e);
        setAnalise(null);
      } finally {
        setLoadingAnalise(false);
      }
    };

    const timeout = setTimeout(analisarTema, 800);
    return () => clearTimeout(timeout);
  }, [temaEditado, copyConsolidada]);

  return (
    <GlassCard className="mx-auto max-w-2xl overflow-hidden">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-accent">Etapa 2 · Resumo</div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Revise a copy e confirme o tema</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/55">
            Leia a copy extraída do post viral e confirme (ou ajuste) o tema principal.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
              📋 Copy Extraída
            </label>
            <div className="w-full min-h-[180px] rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 overflow-y-auto">
              {copyConsolidada || <span className="text-white/30">Nenhuma copy disponível</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
              📝 Tema
            </label>
            <input
              value={temaEditado}
              onChange={(e) => setTemaEditado(e.target.value)}
              className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 border border-white/10 focus:border-accent/50 focus:outline-none transition-colors"
              placeholder="Qual é o tema central?"
            />
          </div>

          {loadingAnalise && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analisando tema...
            </div>
          )}

          {analise && !loadingAnalise && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 space-y-2">
              <p className="text-xs leading-relaxed text-white/80">
                <span className="font-semibold text-accent">Análise:</span> {analise.estrategia}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-white/50">Tom:</span>
                  <p className="text-white/80">{analise.tom}</p>
                </div>
                <div>
                  <span className="text-white/50">Evitar:</span>
                  <p className="text-white/80">{analise.evitar}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => canApprove && onApprove(temaEditado.trim())}
          disabled={!canApprove}
          className={`w-full rounded-lg px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
            canApprove
              ? "btn-accent"
              : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35"
          }`}
        >
          <Check className="h-4 w-4" />
          {canApprove ? "Próximo → Template" : "Confirme o tema"}
        </button>
      </div>
    </GlassCard>
  );
}
