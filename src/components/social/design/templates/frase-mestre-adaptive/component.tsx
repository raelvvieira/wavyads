import type { CSSProperties, ReactNode } from "react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";
import { Copyright, Footer, Grain } from "../parts";

const ICONS = ["↓", "◉", "⏱", "↗", "✓"];

const root: CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  fontFamily: F.body,
};

function FraseFrame({
  children,
  templateKey,
  background,
  color,
}: {
  children: ReactNode;
  templateKey: string;
  background: CSSProperties["background"];
  color: string;
}) {
  return (
    <SlideFrame style={{ ...root, color }} background={background} templateKey={templateKey}>
      <Grain opacity={0.08} />
      <Copyright light={color === C.white} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>{children}</div>
    </SlideFrame>
  );
}

export function FraseMestreAdaptiveTemplate(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, profile } = props;

  if (slideIndex === 0) {
    return (
      <FraseFrame templateKey="frase-mestre-adaptive" background="linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)" color={C.white}>
        {imgUrl ? (
          <>
            <MediaSlot
              src={imgUrl}
              alt="Imagem de capa"
              aspectRatio="1080 / 1350"
              minHeight={1350}
              maxHeight={1350}
              templateKey="frase-mestre-adaptive"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.78) 100%)",
              }}
            />
          </>
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 30%, rgba(253,70,56,0.10) 0%, transparent 55%)" }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "140px 60px 64px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={56}
            maxFontSize={132}
            lineHeight={0.9}
            color={C.white}
            style={{ maxWidth: 920, maxHeight: 360, letterSpacing: "-0.01em" }}
          />
          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={40}
              lineHeight={1.4}
              fontWeight={400}
              color="rgba(255,255,255,0.68)"
              style={{ maxWidth: 760, maxHeight: 220, marginLeft: "auto", textAlign: "right" }}
            />
          ) : null}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.58)" }}>{profile.handle}</div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>Arraste para o lado.</div>
          </div>
        </div>
      </FraseFrame>
    );
  }

  if (slideIndex === 3 && total >= 5) {
    return (
      <FraseFrame templateKey="frase-mestre-adaptive" background="linear-gradient(135deg,#0D1520 0%,#1A2535 50%,#0A0F18 100%)" color={C.white}>
        {imgUrl ? (
          <MediaSlot
            src={imgUrl}
            alt={titulo}
            aspectRatio="1080 / 540"
            minHeight={540}
            maxHeight={540}
            templateKey="frase-mestre-adaptive"
            style={{ position: "absolute", inset: "0 0 auto 0", width: "100%", height: 540, borderRadius: 0, border: "none" }}
          />
        ) : null}
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "120px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={92} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 220, letterSpacing: "-0.01em", marginTop: "auto" }} />
          <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
            {(corpo || "").split("|").slice(0, 3).map((part, i) => {
              const [num, ...rest] = part.trim().split(" ");
              return (
                <div key={i} style={{ flex: 1 }}>
                  <AdaptiveText text={num || "—"} as="div" minFontSize={48} maxFontSize={76} lineHeight={1} color={C.orange} style={{ maxHeight: 110, letterSpacing: "-0.01em" }} />
                  <TextSlot text={rest.join(" ")} as="p" minFontSize={18} maxFontSize={26} lineHeight={1.42} fontWeight={400} color="#888" style={{ maxHeight: 160, marginTop: 6 }} />
                </div>
              );
            })}
          </div>
          <Footer handle={profile.handle} showArrow />
        </div>
      </FraseFrame>
    );
  }

  if (slideIndex === total - 1) {
    return (
      <FraseFrame templateKey="frase-mestre-adaptive" background={C.offWhite} color={C.black}>
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "120px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={96} lineHeight={0.94} color={C.black} style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em", marginBottom: 30 }} />
          <div style={{ width: 40, height: 2, background: C.orange, marginBottom: 36 }} />
          <div style={{ width: 120, height: 120, borderRadius: 32, background: C.gradOrange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 70, color: C.white, marginBottom: 20 }}>W</div>
          <div style={{ fontFamily: F.display, fontSize: 52, color: C.black, letterSpacing: "0.08em", marginBottom: 16 }}>WAVY DIGITAL</div>
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.44} fontWeight={400} color="#777" style={{ maxWidth: 760, maxHeight: 180 }} /> : null}
        </div>
      </FraseFrame>
    );
  }

  const iconIdx = (slideIndex - 1) % ICONS.length;

  return (
    <FraseFrame templateKey="frase-mestre-adaptive" background={C.offWhite} color={C.black}>
      <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "100px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={52} maxFontSize={104} lineHeight={0.92} color={C.black} style={{ maxWidth: 780, maxHeight: 280, letterSpacing: "-0.01em" }} />
          <div style={{ fontSize: 20, color: "#777" }}>Slide {slideIndex + 1}/{total}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, minHeight: 0, fontSize: 150, color: C.orange, lineHeight: 1 }}>
          {ICONS[iconIdx]}
        </div>
        {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.42} fontWeight={500} color="#333" style={{ maxWidth: 860, maxHeight: 220 }} /> : null}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 22, color: "#777" }}>{profile.handle}</div>
          <div style={{ fontSize: 22, color: "#777" }}>Arraste para o lado.</div>
        </div>
      </div>
    </FraseFrame>
  );
}
