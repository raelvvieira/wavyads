import type { CSSProperties } from "react";
import { BadgeCheck } from "lucide-react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "./adaptive";

const root: CSSProperties = {
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  background: C.white,
  color: C.twBlack,
  fontFamily: F.twitter,
};

const page: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  gap: 28,
  padding: "78px 72px 68px",
  boxSizing: "border-box",
};

function TwitterHeader({ profile }: { profile: TemplateSlideProps["profile"] }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 18, flex: "0 0 auto" }}>
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: `${C.orange} url('${profile.avatarUrl}') center/cover`,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 30,
              lineHeight: 1.1,
              color: C.twBlack,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profile.nome}
          </span>
          <BadgeCheck size={26} fill={C.twBlue} color={C.white} strokeWidth={2.5} />
        </div>
        <div
          style={{
            fontSize: 24,
            lineHeight: 1.2,
            color: C.twGray,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {profile.handle}
        </div>
      </div>
    </header>
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
          border: "1px solid #E8EEF2",
          background: "#F8FBFC",
          padding: "10px 16px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.twGray,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: C.twBlue,
            flexShrink: 0,
          }}
        />
        {tipoSlide}
      </div>

      <div style={{ fontSize: 20, color: C.twGray }}>
        Slide {slideIndex + 1}/{total}
      </div>
    </div>
  );
}

function SlideBody({
  title,
  body,
  slideIndex,
  total,
  tipoSlide,
  titleMaxHeight = 240,
  bodyMaxHeight = 220,
}: {
  title: string;
  body?: string;
  slideIndex: number;
  total: number;
  tipoSlide: TemplateSlideProps["tipoSlide"];
  titleMaxHeight?: number;
  bodyMaxHeight?: number;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 22, minHeight: 0 }}>
      <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
      <AdaptiveText
        text={title}
        as="h1"
        minFontSize={34}
        maxFontSize={68}
        lineHeight={1.04}
        color={C.twBlack}
        style={{ maxWidth: 900, maxHeight: titleMaxHeight, letterSpacing: "-0.01em" }}
      />
      {body ? (
        <TextSlot
          text={body}
          as="p"
          minFontSize={24}
          maxFontSize={34}
          lineHeight={1.5}
          fontWeight={400}
          color={C.twGray}
          style={{ maxWidth: 900, maxHeight: bodyMaxHeight }}
        />
      ) : null}
    </section>
  );
}

function CoverLayout(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, tipoSlide, profile } = props;

  return (
    <SlideFrame style={root} background={C.white} templateKey="twitter-pure">
      <div style={page}>
        <TwitterHeader profile={profile} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
          <SlideBody
            title={titulo}
            body={corpo}
            slideIndex={slideIndex}
            total={total}
            tipoSlide={tipoSlide}
            titleMaxHeight={300}
            bodyMaxHeight={200}
          />
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 10"
              minHeight={320}
              maxHeight={500}
              style={{ width: "100%" }}
            />
          ) : null}
          <div
            style={{
              marginTop: "auto",
              borderTop: "1px solid #E8EEF2",
              paddingTop: 18,
              fontSize: 20,
              color: C.twGray,
            }}
          >
            Continue deslizando para ver a sequencia.
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function ContentLayout(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, tipoSlide, profile } = props;

  return (
    <SlideFrame style={root} background={C.white} templateKey="twitter-pure">
      <div style={page}>
        <TwitterHeader profile={profile} />
        <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
          <SlideBody
            title={titulo}
            body={corpo}
            slideIndex={slideIndex}
            total={total}
            tipoSlide={tipoSlide}
            titleMaxHeight={220}
            bodyMaxHeight={230}
          />
          <div style={{ display: "flex", flex: "1 1 auto", minHeight: 0, alignItems: "flex-end" }}>
            {imgUrl ? (
              <MediaSlot
                src={imgUrl}
                alt={titulo}
                aspectRatio="16 / 10"
                minHeight={280}
                maxHeight={420}
                style={{ width: "100%" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 20,
                  border: "1px dashed #DDE7ED",
                  background: "#F8FBFC",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function StatementLayout(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, tipoSlide, profile } = props;

  return (
    <SlideFrame style={root} background={C.white} templateKey="twitter-pure">
      <div style={page}>
        <TwitterHeader profile={profile} />
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 26 }}>
            <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
            <div
              style={{
                borderRadius: 24,
                border: "1px solid #E8EEF2",
                background: "#F8FBFC",
                padding: "36px 38px",
              }}
            >
              <AdaptiveText
                text={titulo}
                as="h1"
                minFontSize={36}
                maxFontSize={72}
                lineHeight={1.08}
                color={C.twBlack}
                style={{ maxHeight: 320, letterSpacing: "-0.01em" }}
              />
              {corpo ? (
                <TextSlot
                  text={corpo}
                  as="p"
                  minFontSize={24}
                  maxFontSize={34}
                  lineHeight={1.55}
                  fontWeight={400}
                  color={C.twGray}
                  style={{ marginTop: 22, maxHeight: 200 }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function TensionLayout(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, tipoSlide, profile } = props;

  return (
    <SlideFrame style={root} background={C.white} templateKey="twitter-pure">
      <div style={page}>
        <TwitterHeader profile={profile} />
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 26 }}>
            <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
            <AdaptiveText
              text={titulo}
              as="h1"
              minFontSize={42}
              maxFontSize={76}
              lineHeight={1.02}
              color={C.twBlack}
              style={{ maxHeight: 360, letterSpacing: "-0.015em" }}
            />
            <div style={{ height: 1, background: "#E8EEF2" }} />
            {corpo ? (
              <TextSlot
                text={corpo}
                as="p"
                minFontSize={24}
                maxFontSize={32}
                lineHeight={1.6}
                fontWeight={400}
                color={C.twGray}
                style={{ maxHeight: 220 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function CtaLayout(props: TemplateSlideProps) {
  const { slideIndex, total, titulo, corpo, imgUrl, tipoSlide, profile } = props;

  return (
    <SlideFrame style={root} background={C.white} templateKey="twitter-pure">
      <div style={page}>
        <TwitterHeader profile={profile} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1, minHeight: 0 }}>
          {imgUrl ? (
            <MediaSlot
              src={imgUrl}
              alt={titulo}
              aspectRatio="16 / 9"
              minHeight={320}
              maxHeight={440}
              style={{ width: "100%" }}
            />
          ) : null}
          <SlideMeta slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
          <div
            style={{
              borderRadius: 24,
              border: "1px solid #E8EEF2",
              background: "#F8FBFC",
              padding: "34px 36px",
            }}
          >
            <AdaptiveText
              text={titulo}
              as="h1"
              minFontSize={38}
              maxFontSize={68}
              lineHeight={1.04}
              color={C.twBlack}
              style={{ maxHeight: 260, letterSpacing: "-0.01em" }}
            />
            {corpo ? (
              <TextSlot
                text={corpo}
                as="p"
                minFontSize={24}
                maxFontSize={34}
                lineHeight={1.52}
                fontWeight={400}
                color={C.twGray}
                style={{ marginTop: 20, maxHeight: 200 }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

export function TwitterPureTemplate(props: TemplateSlideProps) {
  if (props.formato === "cover") {
    return <CoverLayout {...props} />;
  }

  if (props.formato === "statement") {
    return <StatementLayout {...props} />;
  }

  if (props.formato === "tension") {
    return <TensionLayout {...props} />;
  }

  if (props.formato === "cta") {
    return <CtaLayout {...props} />;
  }

  return <ContentLayout {...props} />;
}
