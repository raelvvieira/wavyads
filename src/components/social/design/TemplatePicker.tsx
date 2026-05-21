import { useEffect } from "react";
import type { TemplateId } from "./templates/shared";
import { FONT_LINKS } from "./templates/shared";
import { cn } from "@/lib/utils";

interface Props {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}

const OPTIONS: { id: TemplateId; label: string; desc: string; preview: string; textColor: string }[] = [
  { id: "1A", label: "1A · Tutorial",        desc: "BREAKING + passos executáveis",  preview: "linear-gradient(135deg,#F5F2EE 0%,#E8E5E0 100%)",   textColor: "#0A0A0A" },
  { id: "1B", label: "1B · Conflito",        desc: "Vilão + contraste numérico",     preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)", textColor: "#fff" },
  { id: "2A", label: "2A · Storytelling",    desc: "Caso real + editorial light",    preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)",   textColor: "#0A0A0A" },
  { id: "2B", label: "2B · Editorial Dark",  desc: "Filosófico + cena de filme",     preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#FD4638 100%)", textColor: "#fff" },
  { id: "4",  label: "4 · Post Frase",       desc: "1 imagem + frase mestre",        preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)", textColor: "#fff" },
  { id: "5",  label: "5 · Frase Mestre",     desc: "Slides interdependentes",        preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)", textColor: "#fff" },
];

export function TemplatePicker({ value, onChange }: Props) {
  useEffect(() => {
    FONT_LINKS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      document.head.appendChild(l);
    });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
