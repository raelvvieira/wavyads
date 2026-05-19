import type { TemplateId } from "./templates/shared";
import { cn } from "@/lib/utils";

interface Props {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}

const OPTIONS: { id: TemplateId; label: string; desc: string; preview: string }[] = [
  { id: "A", label: "Dark Cinematográfico", desc: "Preto + gradiente laranja/rosa", preview: "linear-gradient(135deg,#0a0a0a 0%,#1a0a14 50%,#FF3366 100%)" },
  { id: "B", label: "Light Twitter", desc: "Cinza claro, avatar com ring", preview: "linear-gradient(135deg,#EBEBEB 0%,#d0d4dc 100%)" },
  { id: "C", label: "Editorial Verde", desc: "Minimalista, accent WAVY", preview: "linear-gradient(135deg,#0a0a0a 0%,#0a1a14 50%,#1ACD8A 100%)" },
];

export function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "glass rounded-xl p-3 text-left transition-all",
            value === o.id ? "border-accent/60 bg-accent/10 accent-glow" : "hover:bg-white/5",
          )}
        >
          <div className="h-16 rounded-lg mb-2" style={{ background: o.preview }} />
          <div className="text-xs font-semibold text-white">{o.label}</div>
          <div className="text-[11px] text-white/40">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}
