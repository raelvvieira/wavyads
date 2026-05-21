// Shared UI primitives for Wavy templates
import { type CSSProperties, useId } from "react";
import { C, F, type SocialProfile } from "./shared";

export function Grain({ opacity = 0.08 }: { opacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none", zIndex: 10, mixBlendMode: "overlay" }}
      aria-hidden
    >
      <filter id={`g-${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g-${id})`} />
    </svg>
  );
}

export function Copyright({ light = false }: { light?: boolean }) {
  return (
    <div
      style={{
        position: "absolute", top: 36, right: 60, fontFamily: F.body, fontWeight: 400, fontSize: 20,
        color: light ? "#CCCCCC" : "#444", textAlign: "right", lineHeight: 1.35, zIndex: 5,
      }}
    >
      Copyright ©<br />2026
    </div>
  );
}

export function PillWavy() {
  return (
    <div
      style={{
        padding: "14px 28px", borderRadius: 50, background: C.gradOrange, color: C.white,
        fontFamily: F.body, fontSize: 22, fontWeight: 800, letterSpacing: "0.06em",
      }}
    >
      WAVY
    </div>
  );
}

export function PillHandle({ handle, light = false }: { handle: string; light?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 28px", borderRadius: 50, background: "transparent",
        border: light ? `1px solid ${C.borderLight}` : "1px solid #2A2A2A",
        fontFamily: F.body, fontSize: 22, color: light ? "#999999" : "#666666",
      }}
    >
      {handle}
    </div>
  );
}

export function Footer({ handle, light = false, showArrow = false }: { handle: string; light?: boolean; showArrow?: boolean }) {
  return (
    <div
      style={{
        position: "absolute", bottom: 40, left: 60, right: 60, display: "flex",
        alignItems: "center", justifyContent: "space-between", zIndex: 5,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <PillWavy />
        <PillHandle handle={handle} light={light} />
      </div>
      {showArrow && (
        <div style={{ fontFamily: F.body, fontSize: 22, color: light ? "#999" : "#666" }}>
          Arraste &rsaquo;
        </div>
      )}
    </div>
  );
}

export function AvatarRing({ url, size = 80, light = false }: { url: string; size?: number; light?: boolean }) {
  const inner = size - 8;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "conic-gradient(#FD4638,#E8102A,#FD4638)",
        position: "relative", flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute", inset: 4, borderRadius: "50%",
          background: `url('${url}') center/cover, ${C.black}`,
          border: `3px solid ${light ? C.offWhite : C.black}`,
          boxSizing: "border-box", width: inner, height: inner,
        }}
      />
    </div>
  );
}

export const accentText: CSSProperties = {
  background: C.gradOrange,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export const accentLine: CSSProperties = {
  width: 32, height: 3, borderRadius: 2, background: C.gradOrange,
};

export function HeaderAvatar({ profile, light = false }: { profile: SocialProfile; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <AvatarRing url={profile.avatarUrl} size={80} light={light} />
      <div>
        <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 28, color: light ? C.black : C.white, display: "flex", alignItems: "center", gap: 8 }}>
          {profile.nome}
          <span
            style={{
              width: 24, height: 24, borderRadius: "50%", background: C.twBlue, color: C.white,
              fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✓
          </span>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 22, color: light ? "#777" : "#aaa" }}>{profile.handle}</div>
      </div>
    </div>
  );
}

// Highlight a keyword inside a title — last 2 words get orange gradient
export function AccentTitle({ text, style, mode = "lastWord" }: { text: string; style: CSSProperties; mode?: "lastWord" | "none" }) {
  if (mode === "none") return <div style={style}>{text}</div>;
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <div style={style}>{text}</div>;
  const head = words.slice(0, -1).join(" ");
  const tail = words[words.length - 1];
  return (
    <div style={style}>
      {head}{" "}
      <span style={accentText}>{tail}</span>
    </div>
  );
}
