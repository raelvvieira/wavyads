import { useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyPatternId } from "@/types/social";

interface Props {
  onConfirm: (pattern_id: CopyPatternId, num_slides: number) => void;
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
  copySignals: string[];
  bestFor: string[];
  avoid: string[];
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
    copySignals: ["Passo a passo claro", "Ordem pratica", "CTA objetivo"],
    bestFor: ["Aula rapida", "Procedimento", "Conteudo aplicavel"],
    avoid: ["Textos muito literarios", "Metafora sem acao"],
  },
  "1B": {
    title: "1B · Conflito de Dois Mundos",
    summary: "Provoca, nomeia o vilao e contrasta resultados opostos com mais tensao.",
    preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)",
    copySignals: ["Choque de visoes", "Contraste numerico", "Frase de atrito"],
    bestFor: ["Polarizacao", "Mudar crença", "Fala de confronto"],
    avoid: ["Tom morno", "Texto sem oposicao"],
  },
  "2A": {
    title: "2A · Storytelling Analitico",
    summary: "Caso real de empresa como veiculo para um principio maior.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    copySignals: ["Narrativa com prova", "Conceito bem explicado", "Ritmo editorial"],
    bestFor: ["Cases", "Explicacao de tese", "Conteudo longo"],
    avoid: ["Quebra de linha solta", "Copy sem contexto"],
  },
  "2B": {
    title: "2B · Editorial Dark com Cinema",
    summary: "Tema filosofico, manchete longa e analogias fortes com clima de cinema.",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
    copySignals: ["Tese dramatica", "Frase editorial longa", "Atmosfera densa"],
    bestFor: ["Contraste", "Anuncio editorial", "Narrativa com peso"],
    avoid: ["Tom leve demais", "Texto sem profundidade"],
  },
  "3": {
    title: "3 · Reel",
    summary: "Roteiro falado e curto, feito para video com corte ritmico.",
    preview: "linear-gradient(135deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    copySignals: ["Falado", "Ritmo rapido", "Frases curtas"],
    bestFor: ["Video curto", "Hook oral", "Sequencia de cenas"],
    avoid: ["Paragrafos longos", "Textao de carrossel"],
  },
  "4": {
    title: "4 · Post Frase",
    summary: "Uma frase central domina e a legenda apoia o impacto.",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A2D40 55%,#FD4638 100%)",
    copySignals: ["Frase central", "Legenda curta/forte", "Impacto unico"],
    bestFor: ["Pensamento forte", "Diagnostico", "Pergunta polarizadora"],
    avoid: ["Estrutura em lista", "Explicacao extensa"],
  },
  "5": {
    title: "5 · Frase Mestre",
    summary: "Tese, antitese e prova social se encadeiam em um manifesto visual.",
    preview: "linear-gradient(135deg,#0D1520 0%,#1A2535 45%,#F5F2EE 100%)",
    copySignals: ["Argumento em camadas", "Fechamento forte", "Tese recorrente"],
    bestFor: ["Autoridade", "Manifesto", "Argumento profundo"],
    avoid: ["Copy genérica", "Mensagem sem progressao"],
  },
};

export function FormatPicker({ onConfirm }: Props) {
  const [selectedPattern, setSelectedPattern] = useState<CopyPatternId | null>(null);
  const [numSlides, setNumSlides] = useState(7);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedPattern) ?? null,
    [selectedPattern],
  );

  const selectTemplate = (t: Template) => {
    setSelectedPattern(t.id);
    setNumSlides(t.slidesDefault || 7);
  };

  const canApprove = !!selectedPattern;

  const fixedNumSlides = (id: CopyPatternId) => (id === "3" ? 0 : 1);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · Template</div>
        <h2 className="text-xl font-semibold text-white">Escolha o template</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {TEMPLATES.map((t) => {
          const meta = PATTERN_META[t.id];
          const selected = selectedPattern === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all duration-200 flex flex-col items-start gap-2",
                selected
                  ? "border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgba(253,70,56,0.2)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]",
              )}
            >
              <div className="text-2xl">{t.emoji}</div>
              <div className="text-sm font-semibold text-white leading-tight">{t.nome}</div>
              <div className="h-12 w-full rounded-lg border border-white/10" style={{ background: meta.preview }} />
            </button>
          );
        })}
      </div>

      {selectedTemplate?.carrossel && (
        <GlassCard>
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-semibold text-white">Número de slides</span>
            <span className="text-sm font-bold text-accent">{numSlides}</span>
          </div>
          <Slider
            value={[numSlides]}
            onValueChange={(v) => setNumSlides(v[0])}
            min={selectedTemplate.slidesMin || 5}
            max={selectedTemplate.slidesMax || 10}
            step={1}
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-2">
            <span>{selectedTemplate.slidesMin}</span>
            <span>{selectedTemplate.slidesMax}</span>
          </div>
        </GlassCard>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => canApprove && onConfirm(selectedPattern!, selectedTemplate?.carrossel ? numSlides : fixedNumSlides(selectedPattern!))}
          disabled={!canApprove}
          className={cn(
            "flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
            canApprove
              ? "btn-accent"
              : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/35",
          )}
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
