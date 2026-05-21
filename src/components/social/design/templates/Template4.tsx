// Template 4 — Carrossel Frase Mestre (5 slides interdependentes)
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";
import { Grain, Copyright, Footer, accentText, AccentTitle } from "./parts";

const ICONS = ["📉", "📍", "⏱", "↗", "✓"]; // gráfico caindo / pin / relógio / seta / check

export function Template4({ slideIndex, total, titulo, corpo, imgUrl, profile }: TemplateSlideProps) {
  // Slide 1 — cover atmosférico
  if (slideIndex === 0) {
    return (
      <div style={{
        width: 1080, height: 1350, position: "relative", overflow: "hidden",
        background: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
        color: C.white, fontFamily: F.body,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 30%, rgba(253,70,56,0.10) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)" }} />
        <Grain opacity={0.2} />
        <Copyright />
        <div style={{ position: "absolute", top: 140, left: 60, right: 60, fontFamily: F.display, fontSize: 132, lineHeight: 0.9, letterSpacing: "0.01em", color: C.white, maxWidth: "85%" }}>
          {titulo.toUpperCase()}
        </div>
        {corpo && (
          <div style={{ position: "absolute", top: 720, right: 60, left: 280, fontFamily: F.display, fontSize: 72, lineHeight: 0.96, color: "rgba(255,255,255,0.65)", textAlign: "right" }}>
            {corpo.toUpperCase()}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 96, right: 60, fontFamily: F.body, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>{profile.handle}</div>
        <div style={{ position: "absolute", bottom: 42, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 4 }}>
          <div style={{ fontFamily: F.body, fontSize: 22, color: "rgba(255,255,255,0.55)" }}>Arraste para o lado.</div>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>›</div>
        </div>
      </div>
    );
  }

  // Slide 4 (índice 3) — virada com dados (when 5+ slides)
  if (slideIndex === 3 && total >= 5) {
    return (
      <div style={{
        width: 1080, height: 1350, position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg,#0D1520 0%,#1A2535 50%,#0A0F18 100%)",
        color: C.white, fontFamily: F.body,
      }}>
        <Grain opacity={0.16} />
        <Copyright />
        {imgUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 540,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.92) 100%), url('${imgUrl}')`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        )}
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 320 }}>
          <AccentTitle text={titulo.toUpperCase()} style={{ fontFamily: F.display, fontSize: 88, lineHeight: 0.94, color: C.white, letterSpacing: "0.01em" }} />
        </div>
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 140, display: "flex", justifyContent: "space-between", gap: 20 }}>
          {(corpo || "").split("|").slice(0, 3).map((part, i) => {
            const [num, ...rest] = part.trim().split(" ");
            return (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ fontFamily: F.display, fontSize: 76, ...accentText, letterSpacing: "0.01em" }}>{num || "—"}</div>
                <div style={{ fontFamily: F.body, fontSize: 24, color: "#888", marginTop: 6 }}>{rest.join(" ")}</div>
              </div>
            );
          })}
        </div>
        <Footer handle={profile.handle} showArrow />
      </div>
    );
  }

  // Last slide — conclusão + logo
  if (slideIndex === total - 1) {
    return (
      <div style={{ width: 1080, height: 1350, position: "relative", overflow: "hidden", background: C.offWhite, color: C.black, fontFamily: F.body }}>
        <Grain opacity={0.04} />
        <Copyright light />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 60px" }}>
          <AccentTitle text={titulo.toUpperCase()} style={{ fontFamily: F.display, fontSize: 96, lineHeight: 0.94, color: C.black, letterSpacing: "0.01em", marginBottom: 32 }} />
          <div style={{ width: 40, height: 2, background: C.orange, marginBottom: 36 }} />
          <div style={{ width: 120, height: 120, borderRadius: 32, background: C.gradOrange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 70, color: C.white, marginBottom: 20 }}>W</div>
          <div style={{ fontFamily: F.display, fontSize: 52, color: C.black, letterSpacing: "0.08em", marginBottom: 16 }}>WAVY DIGITAL</div>
          {corpo && <div style={{ fontFamily: F.body, fontStyle: "italic", fontSize: 32, color: "#888", maxWidth: 720 }}>{corpo}</div>}
        </div>
      </div>
    );
  }

  // Slides intermediários (2, 3, ...) — fundo claro + ícone
  const iconIdx = (slideIndex - 1) % ICONS.length;
  return (
    <div style={{ width: 1080, height: 1350, position: "relative", overflow: "hidden", background: C.offWhite, color: C.black, fontFamily: F.body }}>
      <Grain opacity={0.04} />
      <Copyright light />
      <div style={{ position: "absolute", top: 100, left: 60, right: 60, fontFamily: F.display, fontSize: 104, lineHeight: 0.92, color: C.black, letterSpacing: "0.01em" }}>
        {titulo.toUpperCase()}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center", fontSize: 160, color: C.orange, lineHeight: 1 }}>
        {ICONS[iconIdx]}
      </div>
      {corpo && (
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 180, fontFamily: F.body, fontWeight: 500, fontSize: 40, lineHeight: 1.4, color: "#333" }}>
          {corpo}
        </div>
      )}
      <Footer handle={profile.handle} light showArrow />
    </div>
  );
}
