import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { Pencil, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyTemplates } from "@/hooks/useCopyTemplates";
import { TemplatePreview } from "./TemplatePreview";
import { CopyTemplatesEditor } from "./CopyTemplatesEditor";
import type { CopyTemplate } from "@/lib/copyTemplates";

interface Props {
  onConfirm: (template: CopyTemplate, num_slides: number) => void;
  /** Cria o post inteiro (copy + imagens + arte) automaticamente a partir do template. */
  onQuickCreate?: (template: CopyTemplate, num_slides: number) => void;
}

export function FormatPicker({ onConfirm, onQuickCreate }: Props) {
  const { templates, saveTemplate, createTemplate, deleteTemplate, resetTemplate } = useCopyTemplates();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [numSlides, setNumSlides] = useState(7);
  const [editing, setEditing] = useState(false);

  const selected = templates.find((t) => t.key === selectedKey) || null;

  const selectTemplate = (t: CopyTemplate) => {
    setSelectedKey(t.key);
    setNumSlides(t.slidesDefault || 7);
  };

  const confirmNum = (t: CopyTemplate) => (t.carrossel ? numSlides : t.baseLayout === "3" ? 0 : 1);

  if (editing) {
    return (
      <CopyTemplatesEditor
        templates={templates}
        onSave={saveTemplate}
        onCreate={createTemplate}
        onDelete={deleteTemplate}
        onReset={resetTemplate}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · Template</div>
          <h2 className="text-xl font-semibold text-white">Escolha o template</h2>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="glass rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-white/10 shrink-0"
        >
          <Pencil className="h-4 w-4" /> Editar Templates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Grid de templates */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {templates.map((t) => {
              const isSel = selectedKey === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => selectTemplate(t)}
                  className={cn(
                    "rounded-xl border px-4 py-5 text-left transition-all duration-200 flex flex-col gap-1 justify-center min-h-[78px]",
                    isSel
                      ? "border-accent/50 bg-accent/[0.07]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="text-sm font-semibold text-white leading-tight">{t.nome}</div>
                  <div className="text-[11px] text-white/40">
                    {t.carrossel ? `${t.slidesDefault} slides` : t.baseLayout === "3" ? "Reel" : "Post único"}
                  </div>
                </button>
              );
            })}
          </div>

          {selected?.carrossel && (
            <GlassCard>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-sm font-semibold text-white">Número de slides</span>
                <span className="text-sm font-bold text-accent">{numSlides}</span>
              </div>
              <Slider
                value={[numSlides]}
                onValueChange={(v) => setNumSlides(v[0])}
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

          {onQuickCreate && (
            <button
              type="button"
              onClick={() => selected && onQuickCreate(selected, confirmNum(selected))}
              disabled={!selected}
              className={cn(
                "w-full rounded-lg px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors",
                selected
                  ? "btn-accent"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
              )}
            >
              <Zap className="h-4 w-4" />
              Criar post rápido (copy + imagens + arte)
            </button>
          )}
          <button
            type="button"
            onClick={() => selected && onConfirm(selected, confirmNum(selected))}
            disabled={!selected}
            className={cn(
              "w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
              selected
                ? "glass hover:bg-white/5 text-white"
                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
            )}
          >
            {selected ? "Ou seguir passo a passo →" : "Selecione um template"}
          </button>
        </div>

        {/* Painel de preview */}
        <GlassCard className="lg:sticky lg:top-4 h-fit">
          {selected ? (
            <TemplatePreview template={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-2 text-white/40">
              <div className="text-3xl">👀</div>
              <p className="text-sm">Selecione um template para ver o preview de como ele organiza textos e imagens.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
