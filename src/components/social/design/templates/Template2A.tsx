// Template 2A — Carrossel Light Twitter Elaborado
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";
import { Grain, Copyright, Footer, AvatarRing, accentLine, accentText, AccentTitle } from "./parts";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative", overflow: "hidden",
  background: C.offWhite, color: C.black, fontFamily: F.body,
};

function Header({ profile, tag }: { profile: { nome: string; handle: string; avatarUrl: string }; tag?: string }) {
  return (
    <div style={{ position: "absolute", top: 80, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <AvatarRing url={profile.avatarUrl} size={72} light />
        <div>
          <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 26, color: C.black }}>{profile.nome}</div>
          <div style={{ fontFamily: F.body, fontSize: 20, color: "#888" }}>{profile.handle}</div>
        </div>
      </div>
      {tag && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.orange, fontFamily: F.body, fontWeight: 700, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} /> {tag}
        </div>
      )}
    </div>
  );
}

export function Template2A({ slideIndex, total, titulo, corpo, imgUrl, formato, profile }: TemplateSlideProps) {
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <div style={root}>
        <Grain opacity={0.04} />
        <Copyright light />
        <Header profile={profile} tag={slideIndex === 0 ? "Novo" : undefined} />
        <div style={{ position: "absolute", top: 240, left: 60, right: 60 }}>
          <AccentTitle text={titulo} style={{ fontFamily: F.display, fontSize: 68, lineHeight: 0.96, color: C.black, letterSpacing: "0.01em", marginBottom: 28 }} />
          {corpo && <div style={{ fontFamily: F.body, fontSize: 36, lineHeight: 1.5, color: "#444" }}>{corpo}</div>}
        </div>
        {imgUrl && (
          <div style={{ position: "absolute", left: 60, right: 60, bottom: 200, height: 380, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.borderLight}`, backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <Grain opacity={0.1} />
          </div>
        )}
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "tension" || formato === "statement") {
    return (
      <div style={root}>
        <Grain opacity={0.04} />
        <Copyright light />
        <Header profile={profile} />
        <div style={{ position: "absolute", top: 0, bottom: 200, left: 60, right: 60, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ ...accentLine, marginBottom: 28 }} />
          <AccentTitle text={titulo} style={{ fontFamily: F.display, fontSize: 78, lineHeight: 0.94, color: C.black, letterSpacing: "0.01em", marginBottom: 28 }} />
          <div style={{ width: 60, height: 1, background: C.borderLight, marginBottom: 24 }} />
          {corpo && <div style={{ fontFamily: F.body, fontSize: 34, lineHeight: 1.5, color: "#555" }}>{corpo}</div>}
        </div>
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "cta") {
    return (
      <div style={root}>
        <Grain opacity={0.04} />
        <Copyright light />
        <Header profile={profile} tag="Última chamada" />
        <div style={{ position: "absolute", top: 280, left: 60, right: 60 }}>
          <AccentTitle text={titulo} style={{ fontFamily: F.display, fontSize: 70, lineHeight: 0.96, color: C.black, letterSpacing: "0.01em", marginBottom: 24 }} />
          <div style={{ height: 1, background: C.borderLight, margin: "24px 0" }} />
          {corpo && (
            <div style={{ background: C.white, borderLeft: `3px solid ${C.orange}`, padding: "28px 32px", borderRadius: 12 }}>
              <div style={{ fontFamily: F.body, fontStyle: "italic", fontSize: 32, lineHeight: 1.5, color: "#333" }}>"{corpo}"</div>
              <div style={{ fontFamily: F.body, fontSize: 20, color: "#999", marginTop: 12 }}>— {profile.nome}</div>
            </div>
          )}
        </div>
        <Footer handle={profile.handle} light showArrow={false} />
      </div>
    );
  }

  // CONTENT — passo/tutorial
  return (
    <div style={root}>
      <Grain opacity={0.04} />
      <Copyright light />
      <Header profile={profile} />
      <div style={{ position: "absolute", top: 240, left: 60, right: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.orange, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 800, fontSize: 20 }}>{slideIndex}</div>
          <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 20, color: C.orange, letterSpacing: "0.1em" }}>PASSO {slideIndex}</div>
        </div>
        <AccentTitle text={titulo} style={{ fontFamily: F.display, fontSize: 60, lineHeight: 0.96, color: C.black, letterSpacing: "0.01em", marginBottom: 20 }} />
        <div style={{ height: 1, background: C.borderLight, margin: "20px 0" }} />
        {corpo && <div style={{ fontFamily: F.body, fontSize: 34, lineHeight: 1.5, color: "#444" }}>{corpo}</div>}
      </div>
      {imgUrl && (
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 180, height: 280, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.borderLight}`, backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <Grain opacity={0.1} />
        </div>
      )}
      <Footer handle={profile.handle} light showArrow={showArrow} />
    </div>
  );
}
