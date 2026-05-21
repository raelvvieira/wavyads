// Template 3 — Post Frase (foto fundo + frase grande)
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";
import { Grain, Copyright, accentText, AccentTitle } from "./parts";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative", overflow: "hidden",
  background: C.black, color: C.white, fontFamily: F.body,
};

const textShadow = "0 1px 4px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.7)";

export function Template3({ titulo, corpo, imgUrl, profile }: TemplateSlideProps) {
  return (
    <div style={{
      ...root,
      backgroundImage: imgUrl
        ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.10) 45%, rgba(0,0,0,0.92) 100%), url('${imgUrl}')`
        : "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <Grain opacity={0.18} />
      <div style={{ position: "absolute", top: 36, left: 60, fontFamily: F.body, fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,0.55)", zIndex: 5 }}>
        {profile.nome}
      </div>
      <div style={{ position: "absolute", top: 36, right: 60, fontFamily: F.body, fontSize: 20, color: "rgba(255,255,255,0.4)", textAlign: "right", zIndex: 5 }}>
        Wavy Digital
      </div>
      <div style={{
        position: "absolute", left: 60, right: 60, bottom: 160, zIndex: 4,
      }}>
        <AccentTitle text={titulo.toUpperCase()} style={{
          fontFamily: F.display, fontSize: 144, lineHeight: 0.92, color: C.white,
          letterSpacing: "0.01em", textShadow,
        }} />
        {corpo && (
          <div style={{
            fontFamily: F.body, fontSize: 30, lineHeight: 1.4, color: "rgba(255,255,255,0.8)",
            marginTop: 28, textShadow, maxWidth: 720,
          }}>
            {corpo}
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 42, left: 60, fontFamily: F.body, fontSize: 22, color: "rgba(255,255,255,0.65)", zIndex: 5 }}>
        {profile.handle}
      </div>
      <div style={{
        position: "absolute", bottom: 42, right: 60, display: "flex", alignItems: "center", gap: 12, zIndex: 5,
        fontFamily: F.body, fontSize: 22, color: "rgba(255,255,255,0.85)",
      }}>
        Leia a legenda.
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>↓</div>
      </div>
    </div>
  );
}
