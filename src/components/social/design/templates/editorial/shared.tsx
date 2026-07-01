/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";
import { AvatarRing, Copyright, Footer, Grain, accentLine } from "../parts";

export type EditorialMode = "light" | "dark";

type EditorialPalette = {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  softText: string;
  accent: string;
};

const EDITORIAL_PALETTE: Record<EditorialMode, EditorialPalette> = {
  light: {
    background: C.offWhite,
    surface: "rgba(255,255,255,0.84)",
    border: C.borderLight,
    text: C.black,
    muted: "#666",
    softText: "#444",
    accent: C.orange,
  },
  dark: {
    background: C.black,
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)",
    text: C.white,
    muted: "rgba(255,255,255,0.58)",
    softText: "rgba(255,255,255,0.76)",
    accent: C.orange,
  },
};

function getPalette(mode: EditorialMode) {
  return EDITORIAL_PALETTE[mode];
}

function root(mode: EditorialMode): CSSProperties {
  const palette = getPalette(mode);
  return {
    width: 1080,
    height: 1350,
    position: "relative",
    overflow: "hidden",
    background: palette.background,
    color: palette.text,
    fontFamily: F.body,
  };
}

function CoverBackdrop({
  imgUrl,
  templateKey,
}: {
  imgUrl?: string;
  templateKey: string;
}) {
  if (imgUrl) {
    return (
      <MediaSlot
        src={imgUrl}
        alt="Imagem de capa editorial"
        aspectRatio="1080 / 1350"
        minHeight={1350}
        maxHeight={1350}
        templateKey={templateKey}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          borderRadius: 0,
          border: "none",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
      }}
    />
  );
}

function CoverLayout({
  templateKey,
  titulo,
  corpo,
  imgUrl,
  profile,
}: TemplateSlideProps & {
  templateKey: string;
}) {
  return (
    <SlideFrame style={root("dark")} background={C.black} templateKey={templateKey}>
      <CoverBackdrop imgUrl={imgUrl} templateKey={templateKey} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.62) 55%, rgba(0,0,0,0.94) 100%)",
        }}
      />
      <Grain opacity={0.14} />
      <Copyright />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "120px 60px 56px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <AvatarRing url={profile.avatarUrl} size={96} />
        <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.82)",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Editorial adaptativo
          </div>

          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={50}
            maxFontSize={104}
            lineHeight={0.94}
            color={C.white}
            textAlign="center"
            style={{
              maxWidth: 920,
              maxHeight: 360,
              letterSpacing: "-0.01em",
              textShadow: "0 1px 4px rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.5)",
            }}
          />

          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.48}
              fontWeight={500}
              color="rgba(255,255,255,0.82)"
              textAlign="center"
              style={{
                maxWidth: 780,
                maxHeight: 200,
                textShadow: "0 1px 4px rgba(0,0,0,0.72)",
              }}
            />
          ) : null}
        </div>

        <div style={{ marginTop: "auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.58)" }}>{profile.handle}</div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Arraste para o lado.</div>
        </div>
      </div>
    </SlideFrame>
  );
}

function ContentLayout({
  mode,
  templateKey,
  slideIndex,
  total,
  titulo,
  corpo,
  imgUrl,
  profile,
}: TemplateSlideProps & {
  mode: EditorialMode;
  templateKey: string;
}) {
  const palette = getPalette(mode);
  const light = mode === "light";

  return (
    <SlideFrame style={root(mode)} background={palette.background} templateKey={templateKey}>
      <Grain opacity={light ? 0.04 : 0.08} />
      <Copyright light={light} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "94px 60px 120px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
            <AvatarRing url={profile.avatarUrl} size={74} light={light} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: palette.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.nome}</div>
              <div style={{ fontSize: 22, color: palette.muted }}>{profile.handle}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: palette.muted }}>Slide {slideIndex + 1}/{total}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentLine, opacity: light ? 0.9 : 1 }} />
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={42}
            maxFontSize={86}
            lineHeight={1}
            color={palette.text}
            style={{
              maxWidth: 900,
              maxHeight: 280,
              letterSpacing: "-0.01em",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0 }}>
            {imgUrl ? (
              <MediaSlot
                src={imgUrl}
                alt={titulo}
                aspectRatio="16 / 10"
                minHeight={300}
                maxHeight={440}
                templateKey={templateKey}
                style={{
                  width: "100%",
                  borderRadius: 20,
                  border: `1px solid ${palette.border}`,
                  background: light ? "#FFFFFF" : "#111",
                }}
              />
            ) : null}

            {corpo ? (
              <TextSlot
                text={corpo}
                as="p"
                minFontSize={24}
                maxFontSize={36}
                lineHeight={1.45}
                fontWeight={400}
                color={palette.softText}
                style={{
                  maxWidth: 900,
                  maxHeight: 240,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
    </SlideFrame>
  );
}

function StatementLayout({
  mode,
  templateKey,
  slideIndex,
  total,
  titulo,
  corpo,
  profile,
}: TemplateSlideProps & {
  mode: EditorialMode;
  templateKey: string;
}) {
  const palette = getPalette(mode);
  const light = mode === "light";

  return (
    <SlideFrame style={root(mode)} background={palette.background} templateKey={templateKey}>
      <Grain opacity={light ? 0.04 : 0.08} />
      {!light ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 35%, rgba(253,70,56,0.08) 0%, transparent 62%)",
          }}
        />
      ) : null}
      <Copyright light={light} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "120px 60px 124px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 24,
        }}
      >
        <div style={{ ...accentLine, marginBottom: 8 }} />
        <AdaptiveText
          text={titulo}
          as="h1"
          minFontSize={44}
          maxFontSize={92}
          lineHeight={0.96}
          color={palette.text}
          textAlign="center"
          style={{
            maxWidth: 920,
            maxHeight: 340,
            letterSpacing: "-0.01em",
          }}
        />

        {corpo ? (
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              borderRadius: 24,
              border: `1px solid ${palette.border}`,
              background: palette.surface,
              padding: "34px 38px",
            }}
          >
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.55}
              fontWeight={400}
              color={palette.softText}
              textAlign="center"
              style={{ maxHeight: 220 }}
            />
          </div>
        ) : null}

        <div style={{ fontSize: 20, color: palette.muted }}>{slideIndex + 1}/{total}</div>
      </div>

      <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
    </SlideFrame>
  );
}

function TensionLayout({
  mode,
  templateKey,
  slideIndex,
  total,
  titulo,
  corpo,
  profile,
}: TemplateSlideProps & {
  mode: EditorialMode;
  templateKey: string;
}) {
  const palette = getPalette(mode);
  const light = mode === "light";

  return (
    <SlideFrame style={root(mode)} background={palette.background} templateKey={templateKey}>
      <Grain opacity={light ? 0.04 : 0.09} />
      {!light ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.46) 58%, rgba(0,0,0,0.92) 100%)",
          }}
        />
      ) : null}
      <Copyright light={light} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "142px 60px 120px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: palette.muted }}>Tensao editorial</div>
        <AdaptiveText
          text={titulo}
          as="h1"
          minFontSize={48}
          maxFontSize={98}
          lineHeight={0.94}
          color={palette.text}
          style={{
            maxWidth: 920,
            maxHeight: 360,
            letterSpacing: "-0.01em",
          }}
        />
        {corpo ? (
          <TextSlot
            text={corpo}
            as="p"
            minFontSize={24}
            maxFontSize={36}
            lineHeight={1.5}
            fontWeight={400}
            color={palette.softText}
            style={{
              maxWidth: 860,
              maxHeight: 250,
              borderLeft: `3px solid ${palette.accent}`,
              paddingLeft: 20,
              marginTop: 12,
            }}
          />
        ) : null}
        <div style={{ marginTop: "auto", fontSize: 20, color: palette.muted }}>{slideIndex + 1}/{total}</div>
      </div>

      <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
    </SlideFrame>
  );
}

function CtaLayout({
  mode,
  templateKey,
  titulo,
  corpo,
  imgUrl,
  profile,
  slideIndex,
  total,
}: TemplateSlideProps & {
  mode: EditorialMode;
  templateKey: string;
}) {
  const palette = getPalette(mode);
  const light = mode === "light";

  return (
    <SlideFrame style={root(mode)} background={palette.background} templateKey={templateKey}>
      <Grain opacity={light ? 0.04 : 0.12} />
      <Copyright light={light} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "104px 60px 124px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {imgUrl ? (
          <MediaSlot
            src={imgUrl}
            alt={titulo}
            aspectRatio="16 / 9"
            minHeight={300}
            maxHeight={440}
            templateKey={templateKey}
            style={{
              width: "100%",
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: light ? "#FFFFFF" : "#111",
            }}
          />
        ) : null}

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            alignSelf: "flex-start",
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(253,70,56,0.14)",
            border: `1px solid ${palette.accent}`,
            color: palette.accent,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Comenta agora
        </div>

        <AdaptiveText
          text={titulo}
          as="h1"
          minFontSize={44}
          maxFontSize={88}
          lineHeight={0.96}
          color={palette.text}
          style={{
            maxWidth: 920,
            maxHeight: 300,
            letterSpacing: "-0.01em",
          }}
        />

        {corpo ? (
          <TextSlot
            text={corpo}
            as="p"
            minFontSize={24}
            maxFontSize={34}
            lineHeight={1.48}
            fontWeight={400}
            color={palette.softText}
            style={{
              maxWidth: 860,
              maxHeight: 220,
            }}
          />
        ) : null}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ fontSize: 20, color: palette.muted }}>{profile.handle}</div>
          <div style={{ fontSize: 20, color: palette.muted }}>{slideIndex + 1}/{total}</div>
        </div>
      </div>

      <Footer handle={profile.handle} light={light} showArrow={false} />
    </SlideFrame>
  );
}

export function createEditorialTemplate(mode: EditorialMode, templateKey: string) {
  return function EditorialTemplate(props: TemplateSlideProps) {
    if (props.formato === "cover") {
      return <CoverLayout {...props} templateKey={templateKey} />;
    }

    if (props.formato === "statement") {
      return <StatementLayout {...props} mode={mode} templateKey={templateKey} />;
    }

    if (props.formato === "tension") {
      return <TensionLayout {...props} mode={mode} templateKey={templateKey} />;
    }

    if (props.formato === "cta") {
      return <CtaLayout {...props} mode={mode} templateKey={templateKey} />;
    }

    return <ContentLayout {...props} mode={mode} templateKey={templateKey} />;
  };
}
