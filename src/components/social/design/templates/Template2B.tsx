// Template 2B — Twitter Puro (réplica de tweet)
import type { CSSProperties } from "react";
import { C, F, type TemplateSlideProps } from "./shared";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative", overflow: "hidden",
  background: C.white, color: C.twBlack, fontFamily: F.twitter,
  padding: "80px 72px", boxSizing: "border-box",
};

function TwitterHeader({ profile }: { profile: { nome: string; handle: string; avatarUrl: string } }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 36 }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `${C.orange} url('${profile.avatarUrl}') center/cover`,
      }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: F.twitter, fontWeight: 700, fontSize: 32, color: C.twBlack }}>{profile.nome}</span>
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.twBlue, color: C.white, fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>✓</span>
        </div>
        <div style={{ fontFamily: F.twitter, fontSize: 28, color: C.twGray }}>{profile.handle}</div>
      </div>
    </div>
  );
}

export function Template2B({ slideIndex, titulo, corpo, imgUrl, formato, profile }: TemplateSlideProps) {
  if (formato === "cover") {
    return (
      <div style={root}>
        <TwitterHeader profile={profile} />
        <div style={{ fontFamily: F.twitter, fontWeight: 700, fontSize: 52, lineHeight: 1.25, color: C.twBlack, marginBottom: 20 }}>{titulo}</div>
        {corpo && <div style={{ fontFamily: F.twitter, fontSize: 42, lineHeight: 1.55, color: C.twBlack }}>{corpo}</div>}
        {imgUrl && (
          <div style={{ marginTop: 36, borderRadius: 16, overflow: "hidden", border: `1px solid #EFF3F4`, height: 460, backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
        )}
      </div>
    );
  }

  if (formato === "cta") {
    return (
      <div style={root}>
        <TwitterHeader profile={profile} />
        <div style={{ fontFamily: F.twitter, fontWeight: 800, fontSize: 48, lineHeight: 1.3, color: C.twBlack, marginBottom: 24 }}>{titulo}</div>
        {corpo && <div style={{ fontFamily: F.twitter, fontSize: 40, lineHeight: 1.55, color: C.twBlack }}>{corpo}</div>}
      </div>
    );
  }

  if (formato === "tension" || formato === "statement") {
    return (
      <div style={root}>
        <TwitterHeader profile={profile} />
        <div style={{ fontFamily: F.twitter, fontWeight: 700, fontSize: 54, lineHeight: 1.3, color: C.twBlack, marginBottom: 32 }}>{titulo}</div>
        <div style={{ height: 1, background: "#EFF3F4", marginBottom: 32 }} />
        {corpo && <div style={{ fontFamily: F.twitter, fontSize: 40, lineHeight: 1.6, color: C.twGray }}>{corpo}</div>}
      </div>
    );
  }

  // PASSO / CONTENT
  return (
    <div style={root}>
      <TwitterHeader profile={profile} />
      <div style={{ fontFamily: F.twitter, fontWeight: 700, fontSize: 38, color: C.twGray, marginBottom: 16 }}>
        Passo {slideIndex}:
      </div>
      <div style={{ fontFamily: F.twitter, fontWeight: 700, fontSize: 46, lineHeight: 1.3, color: C.twBlack, marginBottom: 24 }}>{titulo}</div>
      {corpo && (
        <div style={{ background: "#F7F9F9", border: "1px solid #EFF3F4", borderRadius: 16, padding: "28px 32px" }}>
          <div style={{ fontFamily: F.twitter, fontStyle: "italic", fontSize: 36, lineHeight: 1.55, color: C.twGray }}>{corpo}</div>
        </div>
      )}
    </div>
  );
}
