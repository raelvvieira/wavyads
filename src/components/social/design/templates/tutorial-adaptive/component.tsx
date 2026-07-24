import type { CSSProperties, ReactNode } from "react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";
import { AvatarRing, Copyright, Footer, Grain, accentLine } from "../parts";

const root: CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  background: C.offWhite,
  color: C.black,
  fontFamily: F.body,
};

function Header({ profile, tag }: { profile: TemplateSlideProps["profile"]; tag?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
        <AvatarRing url={profile.avatarUrl} size={72} light />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.black, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.nome}</div>
          <div style={{ fontSize: 22, color: "#777" }}>{profile.handle}</div>
        </div>
      </div>
      {tag ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: C.orange,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />
          {tag}
        </div>
      ) : null}
    </div>
  );
}

function SlideMeta({
  slideIndex,
  total,
  tipoSlide,
}: {
  slideIndex: number;
  total: number;
  tipoSlide: TemplateSlideProps["tipoSlide"];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          border: "1px solid #E8E5E0",
          background: "#F8FBFC",
          padding: "10px 16px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#536471",
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.orange, flexShrink: 0 }} />
        {tipoSlide}
      </div>
      <div style={{ fontSize: 20, color: "#536471" }}>
        Slide {slideIndex + 1}/{total}
      </div>
    </div>
  );
}

function TutorialFrame({
  children,
  templateKey,
}: {
  children: ReactNode;
  templateKey: string;
}) {
  return (
    <SlideFrame style={root} background={C.offWhite} templateKey={templateKey}>
      <Grain opacity={0.04} />
      <Copyright light />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "80px 60px 70px",
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

export function TutorialAdaptiveTemplate(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, tipoSlide, profile } = props;
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <TutorialFrame templateKey="tutorial-adaptive">
        <Header profile={profile} tag={slideIndex === 0 ? "Novo" : undefined} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={48}
            maxFontSize={92}
            lineHeight={0.96}
            color={C.black}
            style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }}
          />
          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={36}
              lineHeight={1.48}
              fontWeight={400}
              color="#444"
              style={{ maxWidth: 860, maxHeight: 190 }}
            />
          ) : null}
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 10"
              minHeight={320}
              maxHeight={420}
              templateKey="tutorial-adaptive"
              style={{
                width: "100%",
                marginTop: "auto",
                borderRadius: 20,
                border: `1px solid ${C.borderLight}`,
                background: C.white,
              }}
            />
          ) : null}
        </div>
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </TutorialFrame>
    );
  }

  if (formato === "statement" || formato === "tension") {
    return (
      <TutorialFrame templateKey="tutorial-adaptive">
        <Header profile={profile} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0, justifyContent: "center" }}>
          <div style={accentLine} />
          <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
          <AdaptiveText
            text={titulo}
            as="h1"
            minFontSize={44}
            maxFontSize={86}
            lineHeight={0.96}
            color={C.black}
            style={{ maxWidth: 900, maxHeight: 280, letterSpacing: "-0.01em" }}
          />
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 9"
              minHeight={260}
              maxHeight={360}
              templateKey="tutorial-adaptive"
              style={{
                width: "100%",
                borderRadius: 20,
                border: `1px solid ${C.borderLight}`,
                background: C.white,
              }}
            />
          ) : null}
          {corpo ? (
            <TextSlot
              text={corpo}
              as="p"
              minFontSize={24}
              maxFontSize={34}
              lineHeight={1.52}
              fontWeight={400}
              color="#444"
              style={{ maxWidth: 880, maxHeight: 220 }}
            />
          ) : null}
        </div>
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </TutorialFrame>
    );
  }

  if (formato === "cta") {
    return (
      <TutorialFrame templateKey="tutorial-adaptive">
        <Header profile={profile} tag="Ultima chamada" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 9"
              minHeight={280}
              maxHeight={420}
              templateKey="tutorial-adaptive"
              style={{
                width: "100%",
                borderRadius: 20,
                border: `1px solid ${C.borderLight}`,
                background: C.white,
              }}
            />
          ) : null}
          <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${C.borderLight}`,
              background: C.white,
              padding: "30px 32px",
            }}
          >
            <AdaptiveText
              text={titulo}
              as="h1"
              minFontSize={44}
              maxFontSize={84}
              lineHeight={0.96}
              color={C.black}
              style={{ maxWidth: 900, maxHeight: 260, letterSpacing: "-0.01em" }}
            />
            {corpo ? (
              <TextSlot
                text={corpo}
                as="p"
                minFontSize={24}
                maxFontSize={34}
                lineHeight={1.5}
                fontWeight={400}
                color="#444"
                style={{ marginTop: 18, maxWidth: 840, maxHeight: 180 }}
              />
            ) : null}
          </div>
        </div>
        <Footer handle={profile.handle} light showArrow={false} />
      </TutorialFrame>
    );
  }

  return (
    <TutorialFrame templateKey="tutorial-adaptive">
      <Header profile={profile} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
        <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
        <AdaptiveText
          text={titulo}
          as="h1"
          minFontSize={42}
          maxFontSize={82}
          lineHeight={0.96}
          color={C.black}
          style={{ maxWidth: 900, maxHeight: 260, letterSpacing: "-0.01em" }}
        />
        {corpo ? (
          <TextSlot
            text={corpo}
            as="p"
            minFontSize={24}
            maxFontSize={34}
            lineHeight={1.5}
            fontWeight={400}
            color="#444"
            style={{ maxWidth: 880, maxHeight: 220 }}
          />
        ) : null}
        {imgUrl ? (
          <MediaSlot
            src={imgUrl}
            alt={titulo}
            aspectRatio="16 / 10"
            minHeight={260}
            maxHeight={380}
            templateKey="tutorial-adaptive"
            style={{
              width: "100%",
              marginTop: "auto",
              borderRadius: 20,
              border: `1px solid ${C.borderLight}`,
              background: C.white,
            }}
          />
        ) : null}
      </div>
      <Footer handle={profile.handle} light showArrow={showArrow} />
    </TutorialFrame>
  );
}
