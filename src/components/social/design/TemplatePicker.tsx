import { useEffect } from "react";
import type { TemplateId } from "./templates/shared";
import { FONT_LINKS } from "./templates/shared";
import { cn } from "@/lib/utils";

interface Props {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}

const OPTIONS: { id: TemplateId; label: string; desc: string; preview: string; textColor: string }[] = [
  { id: "1",  label: "1 · Editorial Dark/Light", desc: "Carrossel viral storytelling", preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#FD4638 100%)", textColor: "#fff" },
  { id: "2A", label: "2A · Twitter Elaborado",   desc: "Tutorial / Conflito",          preview: "linear-gradient(135deg,#F5F2EE 0%,#E8E5E0 100%)", textColor: "#0A0A0A" },
  { id: "2B", label: "2B · Twitter Puro",        desc: "Tweet réplica fiel",           preview: "linear-gradient(135deg,#FFFFFF 0%,#F3F5F7 100%)", textColor: "#0F1419" },
  { id: "3",  label: "3 · Post Frase",           desc: "1 imagem + frase mestre",      preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)", textColor: "#fff" },
  { id: "4",  label: "4 · Frase Mestre",         desc: "5 slides interdependentes",    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)", textColor: "#fff" },
];

export function TemplatePicker({ value, onChange }: Props) {
  // Load Wavy fonts once
  useEffect(() => {
    FONT_LINKS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      document.head.appendChild(l);
    });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "glass rounded-xl p-2.5 text-left transition-all",
            value === o.id ? "border-accent/60 bg-accent/10 accent-glow" : "hover:bg-white/5",
          )}
        >
          <div className="h-14 rounded-lg mb-2 flex items-end justify-end p-1.5" style={{ background: o.preview }}>
            <span className="text-[10px] font-bold opacity-70" style={{ color: o.textColor, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>WAVY</span>
          </div>
          <div className="text-[11px] font-semibold text-white leading-tight">{o.label}</div>
          <div className="text-[10px] text-white/40 leading-tight mt-0.5">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}
