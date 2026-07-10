import { useState, useMemo } from "react";
import { Sparkles, Check } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { CopyPatternId } from "@/types/social";

interface Props {
  copyConsolidada: string;
  tema: string;
  onApprove: (copyEditada: string, tema: string, pattern_id: CopyPatternId, num_slides: number) => void;
}

interface Template {
  id: CopyPatternId;
  emoji: string;
  nome: string;
  desc: string;
  carrossel?: boolean;
  slidesMin?: number;
  slidesMax?: number;
  slidesDefault?: number;
}

type PatternMeta = {
  title: string;
  summary: string;
  preview: string;
};

const TEMPLATES: Template[] = [
  {
    id: "1A",
    emoji: "⚡",
    nome: "1A · Tutorial",
    desc: "Hook forte + passos executaveis + virada confessional + CTA direto.",
    carrossel: true,
    slidesMin: 5,
    slidesMax: 8,
    slidesDefault: 6,
  },
  {
    id: "1B",
    emoji: "⚡",
    nome: "1B · Conflito",
    desc: "Provoca, nomeia o vilao e contrasta resultados opostos.",
    carrossel: true,
    slidesMin: 5,
    slidesMax: 8,
    slidesDefault: 6,
  },
  {
    id: "2A",
    emoji: "📖",
    nome: "2A · Storytelling",
    desc: "Caso real de empresa como veiculo para um principio.",
    carrossel: true,
    slidesMin: 6,
    slidesMax: 10,
    slidesDefault: 7,
  },
  {
    id: "2B",
    emoji: "📖",
    nome: "2B · Editorial Dark",
    desc: "Tema filosofico, manchete longa e analogias fortes.",
    carrossel: true,
    slidesMin: 6,
    slidesMax: 10,
    slidesDefault: 7,
  },
  {
    id: "3",
    emoji: "🎬",
    nome: "3 · Reel",
    desc: "Video 15-60s com hook, agitacao, desenvolvimento, virada e CTA.",
    carrossel: false,
  },
  {
    id: "4",
    emoji: "🎯",
    nome: "4 · Post Frase",
    desc: "Imagem unica + frase forte. Legenda longa em 5 movimentos.",
    carrossel: false,
  },
  {
    id: "5",
    emoji: "🧠",
    nome: "5 · Frase Mestre",
    desc: "Argumento unico desdobrado em slides interdependentes.",
    carrossel: true,
    slidesMin: 6,
    slidesMax: 9,
    slidesDefault: 7,
  },
];

const PATTERN_META: Record<CopyPatternId, PatternMeta> = {
  "1A": {
    title: "1A · Tutorial",
    summary: "Hook forte + passos executaveis + virada confessional + CTA direto.",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)",
  },
  "1B": {
    title: "1B · Conflito de Dois Mundos",
    summary: "Provoca, nomeia o vilao e contrasta resultados opostos com mais tensao.",
    preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)",
  },
  "2A": {
    title: "2A · Storytelling Analitico",
    summary: "Caso real de empresa como veiculo para um principio maior.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
  },
  "2B": {
    title: "2B · Editorial Dark com Cinema",
    summary: "Tema filosofico, manchete longa e analogias fortes com clima de cinema.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
  },
  "3": {
    title: "3 · Reel",
    summary: "Roteiro falado e curto, feito para video com corte ritmico.",
    preview: "linear-gradient(135deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
  },
  "4": {
    title: "4 · Post Frase",
    summary: "Uma frase central domina e a legenda apoia o impacto.",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A2D40 55%,#FD4638 100%)",
  },
  "5": {
    title: "5 · Frase Mestre",
    summary: "Tese, antitese e prova social se encadeiam em um manifesto visual.",
    preview: "linear-gradient(135deg,#0D1520 0%,#1A2535 45%,#F5F2EE 100%)",
  },
};

function selectTemplateStyle(selected: boolean) {
  return cn(
    "group rounded-2xl border p-4 text-left transition-all duration-200",
    "min-h-[176px] flex flex-col justify-between",
    selected
      ? "border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgba(253,70,56,0.2)]"
      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
  );
}

export function ResearchStep({ copyConsolidada, tema, onApprove }: Props) {
  const [copyEditada, setCopyEditada] = useState(copyConsolidada);
  const [temaEditado, setTemaEditado] = useState(tema);
  const [selectedPattern, setSelectedPattern] = useState<CopyPatternId | null>(null);
  const [numSlides, setNumSlides] = useState(7);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedPattern) ?? null,
    [selectedPattern],
  );

  const activeMeta = useMemo(() => {
    if (selectedPattern) return PATTERN_META[selectedPattern];
    return null;
  }, [selectedPattern]);

  const selectTemplate = (t: Template) => {
    setSelectedPattern(t.id);
    setNumSlides(t.slidesDefault || 7);
  };

  const canApprove = !!selectedPattern && copyEditada.trim() && temaEditado.trim();

  const summaryPanel = (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      <div className="mb-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-accent">Template selecionado</div>
        <h3 className="mt-1 text-base font-semibold text-white">
          {activeMeta?.title || "Escolha um template"}
        </h3>
      </div>

      {activeMeta ? (
        <div className="space-y-4">
          <div className="h-20 rounded-xl border border-white/10 p-3" style={{ background: activeMeta.preview }}>
            <div className="flex h-full flex-col justify-between">
              <span className="inline-flex w-fit rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur">
                {selectedPattern}
              </span>
              <div className="max-w-[12rem] text-xs font-semibold leading-tight text-white drop-shadow">
                {activeMeta.summary}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-3 text-xs text-white/55">
          Selecione um template acima.
        </div>
      )}

      {selectedTemplate?.carrossel ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/80">Numero de slides</span>
            <span className="text-sm font-semibold text-accent">{numSlides}</span>
          </div>
          <div className="mt-3">
            <Slider
              value={[numSlides]}
              onValueChange={(v) => setNumSlides(v[0])}
              min={selectedTemplate.slidesMin || 5}
              max={selectedTemplate.slidesMax || 10}
              step={1}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>{selectedTemplate.slidesMin}</span>
            <span>{selectedTemplate.slidesMax}</span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => canApprove && onApprove(copyEditada.trim(), temaEditado.trim(), selectedPattern!, selectedTemplate?.carrossel ? numSlides : 1)}
        disabled={!canApprove}
        className={cn(
          "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
          canApprove ? "btn-accent" : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
        )}
      >
        <Check className="h-4 w-4" />
        {canApprove ? "Próximo → Copy Final" : "Escolha template e copy"}
      </button>
    </div>
  );

  return (
    <GlassCard className="mx-auto max-w-6xl overflow-hidden">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 2 · Consolidação + Template</div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Copy consolidada e estrutura</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/55">
              Revise a copy extraída e escolha o template que vai guiar a estrutura da sua mensagem.
            </p>
          </div>

          <div className="space-y-3">
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

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-2">
                📋 Copy Consolidada
              </label>
              <textarea
                value={copyEditada}
                onChange={(e) => setCopyEditada(e.target.value)}
                className="w-full min-h-[200px] rounded-lg bg-white/[0.03] border border-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 focus:outline-none focus:border-accent/40 transition-colors resize-y"
                placeholder="Copy consolidada do post..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block mb-3">
              🎯 Escolha o Template
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TEMPLATES.map((t) => {
                const meta = PATTERN_META[t.id];
                const selected = selectedPattern === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className={selectTemplateStyle(selected)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-3xl">{t.emoji}</div>
                        <div className="mt-2 text-sm font-semibold text-white">{t.nome}</div>
                        <p className="mt-1 text-xs leading-relaxed text-white/55">{t.desc}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                        {t.id}
                      </span>
                    </div>

                    <div className="mt-4 h-16 rounded-xl border border-white/10 p-3" style={{ background: meta.preview }}>
                      <div className="flex h-full items-end justify-between">
                        <div className="text-left text-[10px] uppercase tracking-[0.15em] text-white/70">
                          Template
                        </div>
                        <div className="max-w-[10rem] text-right text-sm font-semibold leading-tight text-white">
                          {meta.title}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:hidden">{summaryPanel}</div>
        </div>

        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">{summaryPanel}</aside>
      </div>
    </GlassCard>
  );
}
