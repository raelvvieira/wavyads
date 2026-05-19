import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Check, Download, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { CopyAprovada } from "@/types/social";

interface Props {
  tema: string;
  copy: CopyAprovada;
}

export function ReelFinalStep({ tema, copy }: Props) {
  const copyAll = () => {
    const fullText = [
      `🎬 ROTEIRO — ${tema}`,
      "",
      ...(copy.roteiro || []).map((c, i) => `Cena ${i + 1} (${c.tempo})\nVisual: ${c.cena}\nFala: ${c.fala}`),
      "",
      "📝 LEGENDA:",
      copy.legenda,
      "",
      copy.hashtags.join(" "),
    ].join("\n");
    navigator.clipboard.writeText(fullText);
    toast({ title: "Roteiro copiado!" });
  };

  const downloadTxt = () => {
    const text = [
      `Tema: ${tema}`, "",
      "ROTEIRO:",
      ...(copy.roteiro || []).map((c, i) => `\nCena ${i + 1} (${c.tempo})\n  Visual: ${c.cena}\n  Fala: ${c.fala}`),
      "", "LEGENDA:", copy.legenda,
      "", "HASHTAGS:", copy.hashtags.join(" "),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reel-${tema.slice(0, 30).replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <GlassCard>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-accent">Reel pronto</div>
            <h2 className="text-lg font-semibold">{tema}</h2>
          </div>
        </div>
        <p className="text-sm text-white/50">
          Reel não precisa de imagens — o roteiro abaixo é o entregável final.
        </p>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">🎬 Roteiro</h3>
        <div className="space-y-3">
          {(copy.roteiro || []).map((c, i) => (
            <div key={i} className="border-l-2 border-accent/40 pl-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                  Cena {i + 1}
                </Badge>
                <span className="text-xs text-white/50">{c.tempo}</span>
              </div>
              <p className="text-xs text-white/60 mb-1"><span className="text-white/40">Visual:</span> {c.cena}</p>
              <p className="text-sm text-white/90"><span className="text-white/40">Fala:</span> {c.fala}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-2">📝 Legenda</h3>
        <p className="text-sm text-white/80 whitespace-pre-wrap">{copy.legenda}</p>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-2">#️⃣ Hashtags</h3>
        <div className="flex flex-wrap gap-2">
          {copy.hashtags.map((h, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs text-accent">
              {h}
            </span>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
        <button onClick={copyAll} className="glass rounded-lg px-4 py-2.5 text-sm inline-flex items-center gap-2 hover:bg-white/5">
          <Copy className="h-4 w-4" /> Copiar tudo
        </button>
        <button onClick={downloadTxt} className="btn-accent rounded-lg px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Baixar .txt
        </button>
      </div>
    </div>
  );
}
