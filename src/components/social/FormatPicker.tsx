import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Slider } from "@/components/ui/slider";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Formato } from "@/types/social";

interface Props {
  onConfirm: (formato: Formato, num_slides: number) => void;
}

const FORMATS: { id: Formato; emoji: string; nome: string; desc: string; carrossel?: boolean }[] = [
  { id: "carrossel_imagem", emoji: "📑", nome: "Carrossel com Imagem", desc: "Slides com foto de fundo + texto sobreposto", carrossel: true },
  { id: "carrossel_texto", emoji: "🖤", nome: "Carrossel Texto", desc: "Fundo sólido, tipografia grande, sem foto", carrossel: true },
  { id: "carrossel_lista", emoji: "📋", nome: "Carrossel Lista", desc: "Lista numerada / bullets", carrossel: true },
  { id: "post_unico", emoji: "🎯", nome: "Post Único", desc: "Uma única imagem impactante" },
  { id: "reel", emoji: "🎬", nome: "Reel", desc: "Roteiro de vídeo curto 15-30s" },
];

export function FormatPicker({ onConfirm }: Props) {
  const [selected, setSelected] = useState<Formato | null>(null);
  const [numSlides, setNumSlides] = useState(7);

  const isCarrossel = selected?.startsWith("carrossel");

  return (
    <GlassCard className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-xs uppercase tracking-wider text-accent mb-2">Etapa 3 · Formato</div>
        <h2 className="text-xl font-semibold">Qual formato você quer criar?</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {FORMATS.map((f) => {
          const active = selected === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={cn(
                "glass rounded-xl p-4 text-left transition-all",
                active ? "border-accent/60 bg-accent/10 accent-glow" : "hover:bg-white/5",
              )}
            >
              <div className="text-3xl mb-2">{f.emoji}</div>
              <div className="text-sm font-semibold text-white mb-1">{f.nome}</div>
              <p className="text-xs text-white/50">{f.desc}</p>
            </button>
          );
        })}
      </div>

      {isCarrossel && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/80">Número de slides</span>
            <span className="text-sm font-semibold text-accent">{numSlides}</span>
          </div>
          <Slider
            value={[numSlides]}
            onValueChange={(v) => setNumSlides(v[0])}
            min={5}
            max={10}
            step={1}
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={!selected}
          onClick={() => selected && onConfirm(selected, isCarrossel ? numSlides : 1)}
          className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="h-4 w-4" />
          Gerar Copy →
        </button>
      </div>
    </GlassCard>
  );
}
