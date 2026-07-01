import type { CSSProperties, ReactNode } from "react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";

const root: CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  background: C.black,
  color: C.white,
  fontFamily: F.body,
};

function buildOverlay(formato: TemplateSlideProps["formato"]) {
  if (formato === "tension") {
    return "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 52%, rgba(0,0,0,0.96) 100%)";
  }

  if (formato === "statement") {
    return "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 56%, rgba(0,0,0,0.92) 100%)";
  }

  return "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.92) 100%)";
}

function SlideHeader({ profile }: { profile: TemplateSlideProps["profile"] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.78)" }}>{profile.nome}</div>
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}>{profile.handle}</div>
    </div>
  );
}

function SlideFooter({ total, slideIndex }: { total: number; slideIndex: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: "auto", paddingTop: 20, flexShrink: 0 }}>
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.55)" }}>
        Slide {slideIndex + 1}/{total}
      </div>
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Leia a legenda.</div>
    </div>
  );
}

function TemplateShell({
  children,
  imgUrl,
  formato,
}: {
  children: ReactNode;
  imgUrl?: string;
  formato: TemplateSlideProps["formato"];
}) {
  return (
    <SlideFrame style={root} background={C.black} templateKey="post-frase">
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {imgUrl ? (
          <MediaSlot
            src={imgUrl}
            alt="Imagem de fundo do post frase"
            aspectRatio="1080 / 1350"
            minHeight={1350}
            maxHeight={1350}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              borderRadius: 0,
              border: "none",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
            }}
          />
        )}
        <div style={{ position: "absolute", inset: 0, background: buildOverlay(formato) }} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "44px 60px 46px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        {children}
      </div>
    </SlideFrame>
  );
}

export function Template3Adaptive(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, profile } = props;
  const isLast = slideIndex === total - 1;

  return (
    <TemplateShell imgUrl={imgUrl} formato={formato}>
      <SlideHeader profile={profile} />

      <div style={{ display: "flex", flex: 1, minHeight: 0, alignItems: "flex-end" }}>
        <div style={{ width: "100%", maxWidth: 920, display: "flex", flexDirection: "column", gap: 24 }}>
          {formato === "statement" ? (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 18,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.82)",
              }}
            >
              Frase principal
            </div>
          ) : null}

          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={48}
            maxFontSize={140}
            lineHeight={0.94}
            color={C.white}
            style={{
              maxHeight: formato === "cover" ? 470 : 390,
              maxWidth: formato === "statement" ? 900 : 860,
              textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.72)",
              letterSpacing: "-0.01em",
            }}
          />

          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.42}
              fontWeight={500}
              color="rgba(255,255,255,0.82)"
              style={{
                maxWidth: 760,
                maxHeight: 240,
                textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.7)",
              }}
            />
          ) : null}

          {formato === "cta" ? (
            <div
              style={{
                alignSelf: "flex-start",
                padding: "14px 20px",
                borderRadius: 999,
                background: "rgba(253,70,56,0.16)",
                border: "1px solid rgba(253,70,56,0.5)",
                color: "#FFD8D4",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Veja a legenda completa
            </div>
          ) : null}
        </div>
      </div>

      {isLast ? (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.58)" }}>Fechamento da sequência.</div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Arraste para o lado.</div>
        </div>
      ) : (
        <SlideFooter slideIndex={slideIndex} total={total} />
      )}
    </TemplateShell>
  );
}
