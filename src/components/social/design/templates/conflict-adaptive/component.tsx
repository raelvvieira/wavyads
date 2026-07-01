import type { CSSProperties, ReactNode } from "react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";
import { Copyright, Footer, Grain, accentText } from "../parts";

const root: CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  background: C.blackDeep,
  color: C.white,
  fontFamily: F.body,
};

function splitContrast(corpo: string): [string, string] | null {
  const sep = /\s*\|\s*|\s+vs\s+/i;
  if (!sep.test(corpo)) return null;
  const [a, b] = corpo.split(sep);
  if (!a || !b) return null;
  return [a.trim(), b.trim()];
}

function ConflictFrame({ children, templateKey }: { children: ReactNode; templateKey: string }) {
  return (
    <SlideFrame style={root} background={C.blackDeep} templateKey={templateKey}>
      <Grain opacity={0.1} />
      <Copyright />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "96px 60px 120px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {children}
      </div>
    </SlideFrame>
  );
}

export function ConflictAdaptiveTemplate(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, profile } = props;
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <ConflictFrame templateKey="conflict-adaptive">
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: imgUrl
              ? `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.92) 75%), url('${imgUrl}')`
              : "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentText, fontSize: 20, letterSpacing: "0.18em", fontWeight: 800 }}>CONFLITO</div>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={52}
            maxFontSize={104}
            lineHeight={0.92}
            color={C.white}
            style={{ maxWidth: 900, maxHeight: 320, letterSpacing: "-0.01em" }}
          />
          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.48}
              fontWeight={400}
              color="rgba(255,255,255,0.78)"
              style={{ maxWidth: 820, maxHeight: 180, borderLeft: `3px solid ${C.orange}`, paddingLeft: 20 }}
            />
          ) : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </ConflictFrame>
    );
  }

  if (formato === "statement") {
    const split = splitContrast(corpo || "");
    if (split) {
      const [left, right] = split;
      return (
        <ConflictFrame templateKey="conflict-adaptive">
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.44)" }}>
              ANTES E DEPOIS
            </div>
            <AdaptiveText
              text={titulo}
              as="h1"
              minFontSize={48}
              maxFontSize={96}
              lineHeight={0.94}
              color={C.white}
              style={{ maxWidth: 920, maxHeight: 220, letterSpacing: "-0.01em" }}
            />
            <div style={{ display: "flex", alignItems: "stretch", gap: 24, flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, padding: "0 8px 0 0", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 18 }}>ANTES</div>
                <AdaptiveText
                  text={left}
                  as="p"
                  minFontSize={30}
                  maxFontSize={72}
                  lineHeight={1.02}
                  color="#777"
                  style={{ maxWidth: 430, maxHeight: 340 }}
                />
              </div>
              <div style={{ flex: 1, padding: "0 0 0 8px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: C.orange, marginBottom: 18 }}>DEPOIS</div>
                <AdaptiveText
                  text={right}
                  as="p"
                  minFontSize={30}
                  maxFontSize={72}
                  lineHeight={1.02}
                  color={C.white}
                  style={{ maxWidth: 430, maxHeight: 340 }}
                />
              </div>
            </div>
          </div>
          <Footer handle={profile.handle} showArrow={showArrow} />
        </ConflictFrame>
      );
    }

    return (
      <ConflictFrame templateKey="conflict-adaptive">
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0, justifyContent: "center" }}>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={48}
            maxFontSize={96}
            lineHeight={0.94}
            color={C.white}
            style={{ maxWidth: 920, maxHeight: 260, letterSpacing: "-0.01em" }}
          />
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 880, maxHeight: 220 }} /> : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </ConflictFrame>
    );
  }

  if (formato === "tension") {
    return (
      <ConflictFrame templateKey="conflict-adaptive">
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentText, fontSize: 20, letterSpacing: "0.2em", fontWeight: 800 }}>O VILAO</div>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={48}
            maxFontSize={98}
            lineHeight={0.92}
            color={C.white}
            style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }}
          />
          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.52}
              fontWeight={400}
              color="#CCC"
              style={{ maxWidth: 860, maxHeight: 220, borderLeft: `3px solid ${C.orange}`, paddingLeft: 20 }}
            />
          ) : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </ConflictFrame>
    );
  }

  if (formato === "cta") {
    return (
      <ConflictFrame templateKey="conflict-adaptive">
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 26, flex: 1, minHeight: 0 }}>
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 9"
              minHeight={280}
              maxHeight={440}
              templateKey="conflict-adaptive"
              style={{ width: "100%", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "#111" }}
            />
          ) : null}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              alignSelf: "flex-start",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(253,70,56,0.18)",
              border: `1px solid ${C.orange}`,
              color: C.orange,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Comenta "Metodo"
          </div>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={44}
            maxFontSize={88}
            lineHeight={0.94}
            color={C.white}
            style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }}
          />
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 860, maxHeight: 220 }} /> : null}
        </div>
        <Footer handle={profile.handle} showArrow={false} />
      </ConflictFrame>
    );
  }

  return (
    <ConflictFrame templateKey="conflict-adaptive">
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
        <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={92} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 260, letterSpacing: "-0.01em" }} />
        {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 880, maxHeight: 220 }} /> : null}
      </div>
      <Footer handle={profile.handle} showArrow={showArrow} />
    </ConflictFrame>
  );
}
