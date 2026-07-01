import { useEffect } from "react";
import type { TemplateId } from "./templates/shared";
import { FONT_LINKS } from "./templates/shared";
import { PRODUCTION_TEMPLATE_OPTIONS, type TemplatePickerOption } from "./templates";
import { cn } from "@/lib/utils";

interface Props {
  value: TemplateId;
  onChange: (t: TemplateId) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  useEffect(() => {
    FONT_LINKS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {PRODUCTION_TEMPLATE_OPTIONS.map((o: TemplatePickerOption) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "glass rounded-xl p-2.5 text-left transition-all",
            value === o.id ? "border-accent/60 bg-accent/10 accent-glow" : "hover:bg-white/5",
          )}
        >
          <div className="h-14 rounded-lg mb-2 flex items-end justify-end p-1.5" style={{ background: o.preview }}>
            <span
              className="text-[10px] font-bold opacity-70"
              style={{ color: o.textColor, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}
            >
              WAVY
            </span>
          </div>
          <div className="text-[11px] font-semibold text-white leading-tight">{o.label}</div>
          <div className="text-[10px] text-white/40 leading-tight mt-0.5">{o.description}</div>
        </button>
      ))}
    </div>
  );
}
