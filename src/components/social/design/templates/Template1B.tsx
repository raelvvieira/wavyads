// Template 1B — Carrossel Conflito de Dois Mundos
// Dark, com slide de contraste numérico em 2 colunas (mesma partida, resultados opostos).
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";
import { Grain, Copyright, Footer, accentText, AccentTitle } from "./parts";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative", overflow: "hidden",
  background: C.blackDeep, color: C.white, fontFamily: F.body,
};

/** Tenta dividir o corpo em 2 lados (separador "|" ou " vs "). */
function splitContrast(corpo: string): [string, string] | null {
  const sep = /\s*\|\s*|\s+vs\s+/i;
  if (!sep.test(corpo)) return null;
  const [a, b] = corpo.split(sep);
  if (!a || !b) return null;
  return [a.trim(), b.trim()];
}

export function Template1B({ slideIndex, total, titulo, corpo, imgUrl, formato, profile }: TemplateSlideProps) {
  const showArrow = slideIndex < total - 1;

  // COVER — provocação + pergunta que divide
  if (formato === "cover") {
    return (
      <div style={{
        ...root,
        backgroundImage: imgUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.92) 75%), url('${imgUrl}')`
          : "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)",
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <Grain opacity={0.16} />
        <Copyright />
        <div style={{ position: "absolute", top: 200, left: 60, right: 60, zIndex: 4 }}>
          <div style={{ ...accentText, fontFamily: F.body, fontWeight: 800, fontSize: 22, letterSpacing: "0.18em", marginBottom: 20 }}>
            CONFLITO
          </div>
          <AccentTitle text={titulo.toUpperCase()} style={{
            fontFamily: F.display, fontSize: 110, lineHeight: 0.9, color: C.white, letterSpacing: "0.01em",
          }} />
        </div>
        {corpo && (
          <div style={{
            position: "absolute", left: 60, right: 60, bottom: 180, fontFamily: F.body, fontSize: 32, lineHeight: 1.4,
            color: "rgba(255,255,255,0.7)", borderLeft: `3px solid ${C.orange}`, paddingLeft: 22, zIndex: 4,
          }}>
            {corpo}
          </div>
        )}
        <Footer handle={profile.handle} showArrow />
      </div>
    );
  }

  // STATEMENT — slide de contraste numérico (2 colunas)
  if (formato === "statement") {
    const split = splitContrast(corpo || "");
    if (split) {
      const [left, right] = split;
      return (
        <div style={{ ...root, background: "linear-gradient(180deg,#0A0A0A 0%,#15090C 100%)" }}>
          <Grain opacity={0.1} />
          <Copyright />
          <div style={{ position: "absolute", top: 120, left: 60, right: 60, fontFamily: F.display, fontSize: 64, lineHeight: 0.96, color: C.white, letterSpacing: "0.01em", textAlign: "center" }}>
            {titulo.toUpperCase()}
          </div>
          <div style={{ position: "absolute", top: 380, left: 0, right: 0, bottom: 200, display: "flex", alignItems: "stretch" }}>
            <div style={{ flex: 1, padding: "0 50px", borderRight: `1px solid rgba(255,255,255,0.08)`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 22, color: "rgba(255,255,255,0.4)", letterSpacing: "0.18em", marginBottom: 24 }}>ANTES</div>
              <div style={{ fontFamily: F.display, fontSize: 88, lineHeight: 1, color: "#777", letterSpacing: "0.01em" }}>{left}</div>
            </div>
            <div style={{ flex: 1, padding: "0 50px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 22, ...accentText, letterSpacing: "0.18em", marginBottom: 24 }}>DEPOIS</div>
              <div style={{ fontFamily: F.display, fontSize: 88, lineHeight: 1, color: C.white, letterSpacing: "0.01em" }}>{right}</div>
            </div>
          </div>
          <Footer handle={profile.handle} showArrow={showArrow} />
        </div>
      );
    }
    // sem separador → centraliza
    return (
      <div style={root}>
        <Grain opacity={0.09} />
        <Copyright />
        <div style={{ position: "absolute", top: 0, bottom: 200, left: 60, right: 60, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <AccentTitle text={titulo.toUpperCase()} style={{
            fontFamily: F.display, fontSize: 96, lineHeight: 0.94, color: C.white, letterSpacing: "0.01em", marginBottom: 28,
          }} />
          {corpo && <div style={{ fontFamily: F.body, fontSize: 36, color: "#AAA", lineHeight: 1.4 }}>{corpo}</div>}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  // TENSION — vilão nomeado
  if (formato === "tension") {
    return (
      <div style={root}>
        <Grain opacity={0.09} />
        <Copyright />
        <div style={{ position: "absolute", top: 200, left: 60, right: 60 }}>
          <div style={{ ...accentText, fontFamily: F.body, fontWeight: 800, fontSize: 22, letterSpacing: "0.2em", marginBottom: 20 }}>
            O VILÃO
          </div>
          <div style={{ fontFamily: F.display, fontSize: 96, lineHeight: 0.92, color: C.white, letterSpacing: "0.01em" }}>
            {titulo.toUpperCase()}
          </div>
        </div>
        {corpo && (
          <div style={{
            position: "absolute", left: 60, right: 60, bottom: 200, padding: "28px 32px",
            background: "rgba(253,70,56,0.06)", borderLeft: `3px solid ${C.orange}`,
            fontFamily: F.body, fontStyle: "italic", fontSize: 32, lineHeight: 1.5, color: "#CCC",
          }}>
            {corpo}
          </div>
        )}
        <Footer handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  // CTA — palavra-chave
  if (formato === "cta") {
    return (
      <div style={{ ...root, background: "linear-gradient(180deg,#1A0800 0%,#2D0F0F 30%,#0A0A0A 80%)" }}>
        <Grain opacity={0.12} />
        <Copyright />
        <div style={{ position: "absolute", top: 280, left: 60, right: 60, zIndex: 4 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 22px",
            background: "rgba(253,70,56,0.18)", border: `1px solid ${C.orange}`, borderRadius: 30,
            color: C.orange, fontFamily: F.body, fontWeight: 800, fontSize: 22, letterSpacing: "0.12em", marginBottom: 32,
          }}>
            ★ COMENTA "MÉTODO"
          </div>
          <AccentTitle text={titulo.toUpperCase()} style={{
            fontFamily: F.display, fontSize: 88, lineHeight: 0.94, color: C.white, letterSpacing: "0.01em",
          }} />
          {corpo && <div style={{ fontFamily: F.body, fontSize: 32, lineHeight: 1.4, color: "#AAA", marginTop: 24 }}>{corpo}</div>}
        </div>
        <Footer handle={profile.handle} showArrow={false} />
      </div>
    );
  }

  // CONTENT
  return (
    <div style={root}>
      <Grain opacity={0.08} />
      <Copyright />
      <div style={{ position: "absolute", top: 140, left: 60, right: 60 }}>
        <div style={{ fontFamily: F.display, fontSize: 82, lineHeight: 0.94, color: C.white, letterSpacing: "0.01em" }}>
          {titulo.toUpperCase()}
        </div>
      </div>
      {corpo && (
        <div style={{
          position: "absolute", left: 60, right: 60, bottom: 200,
          fontFamily: F.body, fontSize: 36, lineHeight: 1.45, color: "#BBB",
        }}>
          {corpo}
        </div>
      )}
      <Footer handle={profile.handle} showArrow={showArrow} />
    </div>
  );
}
