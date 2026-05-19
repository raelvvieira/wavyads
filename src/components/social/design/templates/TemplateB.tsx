// Template B — Light / Twitter style (cinza claro, avatar com ring gradiente)
import type { CSSProperties } from "react";
import type { TemplateSlideProps } from "./shared";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative",
  background: "#EBEBEB", color: "#1a2332",
  fontFamily: "Montserrat, sans-serif", overflow: "hidden",
};

function Header({ profile }: { profile: TemplateSlideProps["profile"] }) {
  return (
    <>
      <div style={{ position: "absolute", top: 40, right: 60, fontSize: 22, color: "#AAA", textAlign: "right", lineHeight: 1.4 }}>
        Copyright ©<br />2026
      </div>
      <div style={{ position: "absolute", top: 100, left: 60, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 90, height: 90, borderRadius: "50%", background: "conic-gradient(#FF6B35,#FF3366,#9B59B6,#FF6B35)", padding: 3 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `url('${profile.avatarUrl}') center/cover, #111`, border: "3px solid #EBEBEB" }} />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a2332", display: "flex", alignItems: "center", gap: 8 }}>
            {profile.nome.toUpperCase()}
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#1DA1F2", color: "#fff", fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>✓</span>
          </div>
          <div style={{ fontSize: 24, color: "#5a6a7a" }}>{profile.handle}</div>
        </div>
      </div>
    </>
  );
}

function Footer({ nome, handle, showArrow }: { nome: string; handle: string; showArrow: boolean }) {
  const pill: CSSProperties = { padding: "14px 28px", borderRadius: 50, fontSize: 22, fontWeight: 700, letterSpacing: "0.02em" };
  return (
    <div style={{ position: "absolute", bottom: 40, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ ...pill, background: "linear-gradient(135deg,#FF6B35,#FF3366)", color: "#fff" }}>{nome.toUpperCase()}</div>
        <div style={{ ...pill, background: "#2d3748", color: "#fff" }}>{handle}</div>
      </div>
      {showArrow && <div style={{ fontSize: 22, color: "#8899AA" }}>Arrasta para o lado &gt;</div>}
    </div>
  );
}

export function TemplateB({
  slideIndex, total, titulo, corpo, imgUrl, formato, profile,
}: TemplateSlideProps) {
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <div style={root}>
        <Header profile={profile} />
        <div style={{ position: "absolute", top: 240, left: 60, right: 60, fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#1a2332" }}>
          {titulo}
        </div>
        {imgUrl && (
          <div style={{
            position: "absolute", top: 640, left: 60, right: 60, height: 480, borderRadius: 24,
            backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          }} />
        )}
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "text_only") {
    return (
      <div style={root}>
        <Header profile={profile} />
        <div style={{ position: "absolute", top: 260, left: 60, right: 60 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, color: "#1a2332", marginBottom: 30 }}>{titulo}</div>
          <div style={{ fontSize: 38, lineHeight: 1.45, color: "#3a4a5a" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "dark") {
    return (
      <div style={{ ...root, background: "#1a2332", color: "#fff" }}>
        <div style={{ position: "absolute", top: 40, right: 60, fontSize: 22, color: "#5a6a7a", textAlign: "right" }}>Copyright ©<br />2026</div>
        <div style={{ position: "absolute", top: 240, left: 60, right: 60 }}>
          <div style={{ display: "inline-block", padding: "10px 24px", background: "linear-gradient(135deg,#FF6B35,#FF3366)", borderRadius: 30, fontSize: 22, fontWeight: 700, marginBottom: 30, color: "#fff" }}>ATENÇÃO</div>
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.08, marginBottom: 30 }}>{titulo}</div>
          <div style={{ fontSize: 38, lineHeight: 1.45, color: "#aab" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  // light / conteudo / cta
  return (
    <div style={root}>
      <Header profile={profile} />
      <div style={{ position: "absolute", top: 240, left: 60, right: 60, fontSize: 60, fontWeight: 800, lineHeight: 1.1, color: "#1a2332" }}>
        {titulo}
      </div>
      {imgUrl && (
        <div style={{
          position: "absolute", top: 540, left: 60, right: 60, height: 500, borderRadius: 24,
          backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
        }} />
      )}
      {corpo && !imgUrl && (
        <div style={{ position: "absolute", top: 540, left: 60, right: 60, fontSize: 34, color: "#3a4a5a", lineHeight: 1.4 }}>
          {corpo}
        </div>
      )}
      <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
    </div>
  );
}
