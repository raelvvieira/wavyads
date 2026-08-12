import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SlideCanvas } from "@/components/social/design/SlideCanvas";
import { AdaptiveCarouselProvider } from "@/components/social/design/templates/adaptive";
import { PATTERN_TEMPLATES, getProductionTemplate } from "@/components/social/design/templates";
import {
  DEFAULT_PROFILE, determinarFormato, type TemplateId, type TemplateSlideProps,
} from "@/components/social/design/templates/shared";
import type { CopyTemplate } from "@/lib/copyTemplates";

/**
 * Card de FORMATO — copy + design pareados numa escolha só.
 *
 * Mostra o design REAL em miniatura (não um wireframe cinza), porque a escolha
 * de formato agora decide também o visual: o usuário precisa ver o que vai sair.
 * Reusa as fixtures declaradas no manifest de cada design pra ter conteúdo
 * plausível, e o AdaptiveCarouselProvider pro auto-fit do texto valer aqui.
 */
interface Props {
  template: CopyTemplate;
  selected: boolean;
  onSelect: () => void;
}

const PREVIEW_SCALE = 0.155;

export function FormatCard({ template, selected, onSelect }: Props) {
  const designId = template.designTemplate as TemplateId | undefined;
  const Design = designId ? PATTERN_TEMPLATES[designId] : undefined;

  // Conteúdo do preview: a capa da fixture "short" do próprio design.
  const previewProps = useMemo<TemplateSlideProps | null>(() => {
    if (!designId) return null;
    const def = getProductionTemplate(designId);
    const slide = def?.fixtures?.short?.slides?.[0];
    if (!slide) return null;
    return {
      slideIndex: 0,
      total: 5,
      titulo: slide.titulo,
      corpo: slide.corpo,
      imgUrl: undefined,
      tipoSlide: slide.tipo,
      formato: determinarFormato(slide.tipo, 0, 5),
      profile: DEFAULT_PROFILE,
    };
  }, [designId]);

  const legenda = template.carrossel
    ? `${template.slidesDefault} slides`
    : template.baseLayout === "3" ? "Reel · roteiro" : "Post único";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group rounded-xl border p-3 text-left transition-colors duration-200 flex flex-col gap-2.5",
        selected
          ? "border-accent/60 bg-accent/[0.07] ring-1 ring-accent/30"
          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]",
      )}
    >
      {/* Miniatura do design real */}
      <div className="flex justify-center rounded-lg overflow-hidden bg-black/40">
        {Design && previewProps ? (
          <AdaptiveCarouselProvider sessionKey={`fmt-${template.key}-${designId}`}>
            <SlideCanvas scale={PREVIEW_SCALE}>
              <Design {...previewProps} />
            </SlideCanvas>
          </AdaptiveCarouselProvider>
        ) : (
          <div
            style={{ width: 1080 * PREVIEW_SCALE, height: 1350 * PREVIEW_SCALE }}
            className="flex items-center justify-center text-[10px] text-white/35 text-center px-2"
          >
            {template.baseLayout === "3" ? "Reel — sem arte, só roteiro" : "sem preview"}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold text-white leading-tight truncate">{template.nome}</div>
        <div className="text-[11px] text-white/40">{legenda}</div>
      </div>
    </button>
  );
}
