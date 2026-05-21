// Template 1 — Carrossel Dark/Light Editorial
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";
import { Grain, Copyright, Footer, AvatarRing, accentLine, accentText, AccentTitle } from "./parts";

interface Props extends TemplateSlideProps { mode?: "dark" | "light" }

const root = (mode: "dark" | "light"): CSSProperties => ({
  width: 1080, height: 1350, position: "relative", overflow: "hidden",
  background: mode === "dark" ? C.black : C.offWhite,
  color: mode === "dark" ? C.white : C.black,
  fontFamily: F.body,
});

export function Template1({ slideIndex, total, titulo, corpo, imgUrl, formato, profile, mode = "dark" }: Props) {
  const light = mode === "light";
  const showArrow = slideIndex < total - 1;

  // COVER — always dark with photo
  if (formato === "cover") {
    return (
      <div style={{
        ...root("dark"),
        backgroundImage: imgUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.85) 78%, rgba(0,0,0,0.95) 100%), url('${imgUrl}')`
          : "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <Grain opacity={0.15} />
        <Copyright />
        <div style={{ position: "absolute", left: 0, right: 0, top: 540, display: "flex", justifyContent: "center", zIndex: 4 }}>
          <AvatarRing url={profile.avatarUrl} size={96} />
        </div>
        <div style={{
          position: "absolute", left: 60, right: 60, bottom: 140, zIndex: 4,
          fontFamily: F.display, fontSize: 84, lineHeight: 0.92, color: C.white,
          textAlign: "center", letterSpacing: "0.01em",
        }}>
          {titulo.toUpperCase()}
        </div>
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 48, textAlign: "center",
          fontFamily: F.body, fontSize: 22, color: "rgba(255,255,255,0.55)", zIndex: 4,
        }}>
          Arraste para o lado ›
        </div>
      </div>
    );
  }

  // TENSION — always dark, dramatic
  if (formato === "tension") {
    return (
      <div style={{ ...root("dark"), background: C.blackDeep }}>
        <Grain opacity={0.09} />
        <Copyright />
        <div style={{ position: "absolute", top: 240, left: 60, right: 60 }}>
          <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg,#FD4638,transparent)", marginBottom: 36 }} />
          <div style={{ fontFamily: F.display, fontSize: 104, lineHeight: 0.88, color: C.white, letterSpacing: "0.01em" }}>
            {titulo.toUpperCase()}
          </div>
          <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg,#FD4638,transparent)", marginTop: 36, marginBottom: 36 }} />
          {corpo && (
            <div style={{ fontFamily: F.body, fontStyle: "italic", fontSize: 40, lineHeight: 1.4, color: "#777" }}>
              {corpo}
            </div>
          )}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  // STATEMENT
  if (formato === "statement") {
    return (
      <div style={root(mode)}>
        <Grain opacity={light ? 0.04 : 0.09} />
        {!light && (
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(circle at 50% 35%, rgba(253,70,56,0.08) 0%, transparent 60%)",
          }} />
        )}
        <Copyright light={light} />
        <div style={{
          position: "absolute", top: 0, bottom: 200, left: 60, right: 60,
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", zIndex: 4,
        }}>
          <div style={{ ...accentLine, marginBottom: 32 }} />
          <AccentTitle text={titulo.toUpperCase()} style={{
            fontFamily: F.display, fontSize: 92, lineHeight: 0.94, letterSpacing: "0.01em",
            color: light ? C.black : C.white, marginBottom: 32,
          }} />
          {corpo && (
            <div style={{ fontFamily: F.body, fontSize: 38, lineHeight: 1.45, color: light ? "#444" : "#AAA", maxWidth: 880 }}>
              {corpo}
            </div>
          )}
        </div>
        <Footer handle={profile.handle} light={light} showArrow={showArrow} />
      </div>
    );
  }

  // CTA
  if (formato === "cta") {
    return (
      <div style={{ ...root("dark"), background: "linear-gradient(180deg,#1A0800 0%,#2D0F0F 25%,#0A0A0A 70%)" }}>
        <Grain opacity={0.12} />
        {imgUrl && (
          <div style={{
            position: "absolute", top: 140, left: 60, right: 60, height: 460, borderRadius: 24,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%), url('${imgUrl}')`,
            backgroundSize: "cover", backgroundPosition: "center", overflow: "hidden",
          }} />
        )}
        <div style={{ position: "absolute", left: 60, right: 60, top: imgUrl ? 660 : 280, zIndex: 4 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px",
            background: "rgba(253,70,56,0.15)", border: `1px solid ${C.orange}`, borderRadius: 30,
            color: C.orange, fontFamily: F.body, fontWeight: 700, fontSize: 22, letterSpacing: "0.08em", marginBottom: 28,
          }}>
            ★ COMENTA "QUERO"
          </div>
          <AccentTitle text={titulo.toUpperCase()} style={{
            fontFamily: F.display, fontSize: 76, lineHeight: 0.95, color: C.white, letterSpacing: "0.01em",
          }} />
          {corpo && (
            <div style={{ fontFamily: F.body, fontSize: 32, lineHeight: 1.4, color: "#AAA", marginTop: 24 }}>
              {corpo}
            </div>
          )}
        </div>
        <Footer handle={profile.handle} showArrow={false} />
      </div>
    );
  }

  // CONTENT (default)
  return (
    <div style={root(mode)}>
      <Grain opacity={light ? 0.04 : 0.08} />
      <Copyright light={light} />
      <div style={{ position: "absolute", top: 100, left: 60, right: 60 }}>
        <div style={{ fontFamily: F.display, fontSize: 78, lineHeight: 0.94, color: light ? C.black : C.white, letterSpacing: "0.01em" }}>
          {titulo.toUpperCase()}
        </div>
      </div>
      {imgUrl && (
        <div style={{
          position: "absolute", top: 360, left: 60, right: 60, height: 460,
          borderRadius: 20, overflow: "hidden",
          border: `1px solid ${light ? C.borderLight : C.borderDark}`,
          backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center",
        }}>
          <Grain opacity={0.1} />
        </div>
      )}
      {corpo && (
        <div style={{
          position: "absolute", left: 60, right: 60, bottom: 180,
          fontFamily: F.body, fontSize: 36, lineHeight: 1.45, color: light ? "#444" : "#AAA",
        }}>
          {corpo}
        </div>
      )}
      <Footer handle={profile.handle} light={light} showArrow={showArrow} />
    </div>
  );
}
