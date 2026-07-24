import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { SlideCanvas } from "./SlideCanvas";
import { useCompiledDesign, DesignErrorBoundary } from "./useCompiledDesign";
import { AdaptiveCarouselProvider } from "./templates/adaptive";
import { DEFAULT_PROFILE, type TemplateSlideProps } from "./templates/shared";
import { cn } from "@/lib/utils";
import sampleImage from "@/assets/twitter-pure/twitter-pure-balanced.png";

// Cobre os 5 formatos reais (determinarFormato) e inclui imagem em parte das
// amostras — muitos padrões só desenham a foto em statement/tension/content,
// então sem essas amostras o preview nunca exercitava esse caminho.
const SAMPLES: { key: string; label: string; props: TemplateSlideProps }[] = [
  {
    key: "cover", label: "Capa",
    props: { slideIndex: 0, total: 6, titulo: "Título de exemplo da capa", corpo: "Subtítulo de apoio da capa.", imgUrl: sampleImage, tipoSlide: "cover", formato: "cover", profile: DEFAULT_PROFILE },
  },
  {
    key: "content", label: "Conteúdo",
    props: { slideIndex: 2, total: 6, titulo: "Passo 2: fazer algo", corpo: "Corpo de exemplo mostrando como o texto se comporta dentro deste layout de design em um slide de conteúdo.", imgUrl: sampleImage, tipoSlide: "solucao", formato: "content", profile: DEFAULT_PROFILE },
  },
  {
    key: "statement", label: "Prova",
    props: { slideIndex: 3, total: 6, titulo: "Título de exemplo do slide de prova", corpo: "Corpo de exemplo mostrando contraste ou dado numérico dentro do slide de prova.", imgUrl: sampleImage, tipoSlide: "prova", formato: "statement", profile: DEFAULT_PROFILE },
  },
  {
    key: "tension", label: "Tensão",
    props: { slideIndex: 1, total: 6, titulo: "Título de exemplo do slide de tensão", corpo: "Corpo de exemplo nomeando o vilão dentro do slide de agitação.", imgUrl: undefined, tipoSlide: "agitacao", formato: "tension", profile: DEFAULT_PROFILE },
  },
  {
    key: "cta", label: "CTA",
    props: { slideIndex: 5, total: 6, titulo: "Comenta MÉTODO", corpo: "Chamada final para ação.", imgUrl: sampleImage, tipoSlide: "cta", formato: "cta", profile: DEFAULT_PROFILE },
  },
];

/** Preview ao vivo do código de design, com debounce e captura de erros. */
export function DesignCodePreview({ code }: { code: string }) {
  const [debounced, setDebounced] = useState(code);
  const [renderErr, setRenderErr] = useState<string | null>(null);
  const [sampleKey, setSampleKey] = useState("cover");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(code), 400);
    return () => clearTimeout(t);
  }, [code]);

  useEffect(() => { setRenderErr(null); }, [debounced, sampleKey]);

  const { Comp, error, loading } = useCompiledDesign(debounced);
  const problem = error || renderErr;
  const sample = SAMPLES.find((s) => s.key === sampleKey) || SAMPLES[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-white/40">Preview ao vivo</div>
        <div className="flex gap-1 p-0.5 rounded-md bg-white/[0.04]">
          {SAMPLES.map((s) => (
            <button
              key={s.key}
              onClick={() => setSampleKey(s.key)}
              className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-colors", sampleKey === s.key ? "bg-accent/20 text-accent" : "text-white/45 hover:text-white")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 flex items-center justify-center min-h-[360px]">
        {loading ? (
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        ) : Comp && !problem ? (
          // Mesmo AdaptiveCarouselProvider da Etapa 5 real — sem ele, texto que usa
          // AdaptiveText/TextSlot cai no fallback pausado e nunca ajusta o tamanho.
          <AdaptiveCarouselProvider sessionKey={`${debounced}::${sampleKey}`}>
            <SlideCanvas scale={0.26}>
              <DesignErrorBoundary
                resetKey={`${debounced}::${sampleKey}`}
                onError={setRenderErr}
                fallback={<div style={{ width: 1080, height: 1350 }} />}
              >
                <Comp {...sample.props} />
              </DesignErrorBoundary>
            </SlideCanvas>
          </AdaptiveCarouselProvider>
        ) : (
          <div className="text-center text-white/40 text-xs">Sem preview</div>
        )}
      </div>
      {problem && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-relaxed break-words">{problem}</p>
        </div>
      )}
    </div>
  );
}
