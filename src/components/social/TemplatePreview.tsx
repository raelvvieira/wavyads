import { ImageIcon } from "lucide-react";
import type { CopyTemplate, PreviewSlide } from "@/lib/copyTemplates";

/** Zonas abstratas de um mini-slide, conforme o layout. Só visualização. */
function MiniSlide({ slide, index }: { slide: PreviewSlide; index: number }) {
  const bar = (w: string, dim = false) => (
    <div className={`h-1.5 rounded-full ${dim ? "bg-white/15" : "bg-white/35"}`} style={{ width: w }} />
  );

  return (
    <div className="shrink-0 w-[86px]">
      <div className="aspect-[3/4] rounded-md border border-white/10 bg-white/[0.03] p-2 flex flex-col gap-1.5 relative overflow-hidden">
        {slide.hasImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        {slide.layout === "cover" && (
          <>
            {bar("90%")}
            {bar("70%")}
            <div className="mt-auto space-y-1">{bar("55%", true)}</div>
          </>
        )}

        {slide.layout === "steps" && (
          <>
            <div className="text-[7px] font-bold text-accent">PASSO {index}</div>
            {bar("80%")}
            <div className="space-y-1 mt-0.5">{bar("95%", true)}{bar("85%", true)}{bar("60%", true)}</div>
          </>
        )}

        {slide.layout === "statement" && (
          <>
            {bar("85%")}
            <div className="space-y-1 mt-1">{bar("95%", true)}{bar("90%", true)}{bar("70%", true)}</div>
          </>
        )}

        {slide.layout === "contrast" && (
          <div className="flex-1 flex gap-1">
            <div className="flex-1 rounded bg-white/[0.06] flex flex-col justify-center gap-1 p-1">{bar("80%", true)}{bar("60%", true)}</div>
            <div className="w-px bg-accent/40" />
            <div className="flex-1 rounded bg-accent/[0.08] flex flex-col justify-center gap-1 p-1">{bar("80%", true)}{bar("60%", true)}</div>
          </div>
        )}

        {slide.layout === "cta" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
            {bar("70%")}
            <div className="h-3 w-14 rounded-full bg-accent/70" />
          </div>
        )}

        {slide.layout === "single" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
            {bar("80%")}
            {bar("65%")}
          </div>
        )}

        {slide.layout === "reel" && (
          <div className="flex-1 flex flex-col justify-center gap-1">
            {["0-3s", "3-15s", "15-35s", "35-50s", "50-60s"].map((t) => (
              <div key={t} className="flex items-center gap-1">
                <span className="text-[6px] text-accent font-mono w-7">{t}</span>
                {bar("70%", true)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-[9px] text-white/40 text-center mt-1 truncate">{slide.role}</div>
    </div>
  );
}

export function TemplatePreview({ template }: { template: CopyTemplate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{template.emoji}</span>
        <div>
          <div className="text-sm font-semibold text-white">{template.nome}</div>
          <div className="text-[11px] text-white/45">
            {template.carrossel ? `Carrossel · ${template.slidesDefault} slides` : template.baseLayout === "3" ? "Reel" : "Post único"}
          </div>
        </div>
      </div>

      <div className="text-[10px] uppercase tracking-wider text-white/40">Como organiza os slides</div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {template.structure.map((s, i) => (
          <MiniSlide key={i} slide={s} index={i + 1} />
        ))}
      </div>

      <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Estrutura</div>
        <div className="flex flex-wrap gap-1">
          {template.structure.map((s, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60">
              {s.role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
