import { useState } from "react";
import { Check } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

interface Props {
  copyConsolidada: string;
  tema: string;
  onApprove: (tema: string) => void;
}

export function ResearchStep({ copyConsolidada, tema, onApprove }: Props) {
  const [temaEditado, setTemaEditado] = useState(tema);

  const canApprove = copyConsolidada.trim() && temaEditado.trim();

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
