import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { Pencil, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormatCard } from "./FormatCard";
import { TemplatePreview } from "./TemplatePreview";
import type { CopyTemplate } from "@/lib/copyTemplates";

/**
 * Escolha do FORMATO — uma decisão só: estrutura de copy + design pareado.
 *
 * Antes eram duas escolhas separadas (template de copy aqui, template de design
 * na última etapa). Cada card mostra o visual real que vai sair.
 */
interface Props {
  templates: CopyTemplate[];
  selected: CopyTemplate | null;
  numSlides: number;
  onSelect: (t: CopyTemplate) => void;
  onNumSlides: (n: number) => void;
  onEditTemplates?: () => void;
  /** Ações renderizadas abaixo do seletor (quem usa decide os botões). */
  children?: React.ReactNode;
}

export function FormatChooser({
  templates, selected, numSlides, onSelect, onNumSlides, onEditTemplates, children,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Escolha o formato</h3>
          <p className="text-[11px] text-white/45">
            Cada formato traz sua estrutura de copy e o visual que combina com ela.
          </p>
        </div>
        {onEditTemplates && (
          <button
            onClick={onEditTemplates}
            className="glass rounded-lg px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/10 shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {templates.map((t) => (
          <FormatCard
            key={t.key}
            template={t}
            selected={selected?.key === t.key}
            onSelect={() => onSelect(t)}
          />
        ))}
      </div>

      {selected?.carrossel && (
        <GlassCard>
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-semibold text-white">Número de slides</span>
            <span className="text-sm font-bold text-accent">{numSlides}</span>
          </div>
          <Slider
            value={[numSlides]}
            onValueChange={(v) => onNumSlides(v[0])}
            min={selected.slidesMin || 5}
            max={selected.slidesMax || 10}
            step={1}
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-2">
            <span>{selected.slidesMin}</span>
            <span>{selected.slidesMax}</span>
          </div>
        </GlassCard>
      )}

      {selected && (
        <details className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <summary className="text-[11px] text-white/50 cursor-pointer hover:text-white/80">
            Ver a estrutura de {selected.nome}
          </summary>
          <div className="pt-3">
            <TemplatePreview template={selected} />
          </div>
        </details>
      )}

      {children}
    </div>
  );
}

/** Botão primário/secundário padrão das ações do seletor. */
export function FormatAction({
  variant = "primary", disabled, onClick, icon, children,
}: {
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors",
        disabled
          ? "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35"
          : variant === "primary"
          ? "btn-accent"
          : "glass hover:bg-white/5 text-white",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export { Zap as FormatQuickIcon };
