import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CopyPatternId, FormatoFamilia } from "@/types/social";

interface Props {
  onConfirm: (pattern_id: CopyPatternId, num_slides: number) => void;
}

interface Familia {
  id: FormatoFamilia;
  emoji: string;
  nome: string;
  desc: string;
  carrossel?: boolean;
  slidesMin?: number;
  slidesMax?: number;
  slidesDefault?: number;
  /** Variações dentro da família. Se `singlePattern`, avança direto. */
  singlePattern?: CopyPatternId;
  variacoes?: { id: CopyPatternId; nome: string; desc: string }[];
}

const FAMILIAS: Familia[] = [
  {
    id: "carrossel_direto",
    emoji: "⚡",
    nome: "Carrossel Direto",
    desc: "Hook BREAKING ou conflito de mundos. Alta conversão.",
    carrossel: true,
    slidesMin: 5, slidesMax: 8, slidesDefault: 6,
    variacoes: [
      {
        id: "1A",
        nome: "1A · Tutorial",
        desc: "Cover BREAKING + passos executáveis (Passo 1, Passo 2…) + virada confessional + CTA com palavra-chave. Estilo Rony Meisler.",
      },
      {
        id: "1B",
        nome: "1B · Conflito de Dois Mundos",
        desc: "Provoca + nomeia o vilão (comportamento/crença) + slide de contraste numérico (mesma partida, resultados opostos). Estilo Mazza Caio.",
      },
    ],
  },
  {
    id: "carrossel_narrativo",
    emoji: "📖",
    nome: "Carrossel Narrativo",
    desc: "Caso real ou tese filosófica desdobrada em slides editoriais.",
    carrossel: true,
    slidesMin: 6, slidesMax: 10, slidesDefault: 7,
    variacoes: [
      {
        id: "2A",
        nome: "2A · Storytelling Analítico",
        desc: "Caso real de empresa (ex: Nestlé) como veículo para princípio. Título conceitual curto + texto encadeado + foto editorial. Estilo Leo BRF.",
      },
      {
        id: "2B",
        nome: "2B · Editorial Dark com Cinema",
        desc: "Tema filosófico, foto cotidiana real, manchete provocadora longa, analogias poderosas + referência de filme icônico. Estilo Marketing Insider.",
      },
    ],
  },
  {
    id: "reel",
    emoji: "🎬",
    nome: "Reel",
    desc: "Vídeo 15-60s. Estrutura 0-3s hook → 3-15s agitação → 15-35s desenvolvimento → 35-50s virada → 50-60s CTA.",
    singlePattern: "3",
  },
  {
    id: "post_frase",
    emoji: "🎯",
    nome: "Post Frase",
    desc: "Imagem única + frase forte (contraste / diagnóstico / pergunta que divide). Legenda longa em 5 movimentos.",
    singlePattern: "4",
  },
  {
    id: "frase_mestre",
    emoji: "🧠",
    nome: "Frase Mestre",
    desc: "Argumento único desdobrado em slides interdependentes. Cover duplo tese/antítese + slides com ícone + virada com prova social.",
    carrossel: true,
    slidesMin: 6, slidesMax: 9, slidesDefault: 7,
    singlePattern: "5",
  },
];

export function FormatPicker({ onConfirm }: Props) {
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [pattern, setPattern] = useState<CopyPatternId | null>(null);
  const [numSlides, setNumSlides] = useState(7);

  // Resetar pattern e ajustar slides ao trocar de família
  const selectFamilia = (f: Familia) => {
    setFamilia(f);
    setPattern(f.singlePattern || null);
    setNumSlides(f.slidesDefault || 7);
  };

  const back = () => {
    setFamilia(null);
    setPattern(null);
  };

  // Tela 1 — escolha da família
  if (!familia) {
    return (
      <GlassCard className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 3 · Formato</div>
          <h2 className="text-xl font-semibold">Qual padrão Wavy você quer aplicar?</h2>
          <p className="text-xs text-white/50 mt-1">
            5 famílias, cada uma com sua intenção narrativa específica da skill de copy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FAMILIAS.map((f) => (
            <button
              key={f.id}
              onClick={() => selectFamilia(f)}
              className="glass rounded-xl p-4 text-left transition-all hover:bg-white/5 hover:border-accent/40"
            >
              <div className="text-3xl mb-2">{f.emoji}</div>
              <div className="text-sm font-semibold text-white mb-1">{f.nome}</div>
              <p className="text-xs text-white/50 leading-snug">{f.desc}</p>
              {f.variacoes && (
                <div className="text-[10px] text-accent mt-2 font-mono">
                  {f.variacoes.map((v) => v.id).join(" · ")}
                </div>
              )}
            </button>
          ))}
        </div>
      </GlassCard>
    );
  }

  const needsVariation = !!familia.variacoes && !pattern;

  // Tela 2 — seletor de variação (1A/1B ou 2A/2B)
  if (needsVariation) {
    return (
      <GlassCard className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={back} className="glass rounded-md p-1.5 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · {familia.nome}</div>
            <h2 className="text-lg font-semibold">Escolha a variação narrativa</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {familia.variacoes!.map((v) => (
            <button
              key={v.id}
              onClick={() => setPattern(v.id)}
              className="glass rounded-xl p-5 text-left transition-all hover:bg-white/5 hover:border-accent/40"
            >
              <div className="text-sm font-bold text-accent mb-2 font-mono">{v.nome}</div>
              <p className="text-xs text-white/60 leading-relaxed">{v.desc}</p>
            </button>
          ))}
        </div>
      </GlassCard>
    );
  }

  // Tela 3 — confirmação (slider de slides p/ carrosseis)
  const activePattern = pattern!;
  const variacaoAtual = familia.variacoes?.find((v) => v.id === activePattern);

  return (
    <GlassCard className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={back} className="glass rounded-md p-1.5 hover:bg-white/5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="text-xs uppercase tracking-wider text-accent">Etapa 3 · {familia.nome}</div>
          <h2 className="text-lg font-semibold">
            {variacaoAtual?.nome || familia.nome}
          </h2>
        </div>
      </div>

      <div className="glass rounded-xl p-4 mb-4">
        <p className="text-sm text-white/70 leading-relaxed">
          {variacaoAtual?.desc || familia.desc}
        </p>
      </div>

      {familia.carrossel && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/80">Número de slides</span>
            <span className="text-sm font-semibold text-accent">{numSlides}</span>
          </div>
          <Slider
            value={[numSlides]}
            onValueChange={(v) => setNumSlides(v[0])}
            min={familia.slidesMin || 5}
            max={familia.slidesMax || 10}
            step={1}
          />
          <div className="flex justify-between text-[10px] text-white/40 mt-1">
            <span>{familia.slidesMin}</span>
            <span>{familia.slidesMax}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(activePattern, familia.carrossel ? numSlides : 1)}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Gerar Copy →
        </button>
      </div>
    </GlassCard>
  );
}
