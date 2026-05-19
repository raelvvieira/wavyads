// Template A — Dark Cinematográfico (orange/pink gradient accent)
import type { CSSProperties } from "react";
import type { TemplateSlideProps } from "./shared";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative",
  background: "#0a0a0a", color: "#fff",
  fontFamily: "Montserrat, sans-serif", overflow: "hidden",
};
const copyrightStyle: CSSProperties = {
  position: "absolute", top: 36, right: 60, fontSize: 20, color: "#444",
  textAlign: "right", lineHeight: 1.4,
};
const pillBase: CSSProperties = {
  padding: "14px 28px", borderRadius: 50, fontSize: 22, fontWeight: 700,
};
const pillWavy: CSSProperties = {
  ...pillBase,
  background: "linear-gradient(135deg, #FF6B35, #FF3366)", color: "#fff",
};
const pillHandle: CSSProperties = {
  ...pillBase,
  background: "#222", color: "#fff", border: "1px solid #333",
};

function Copyright() {
  return <div style={copyrightStyle}>Copyright ©<br />2026</div>;
}

function Footer({ nome, handle, showArrow }: { nome: string; handle: string; showArrow: boolean }) {
  return (
    <div style={{
      position: "absolute", bottom: 40, left: 60, right: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={pillWavy}>{nome.toUpperCase()}</div>
        <div style={pillHandle}>{handle}</div>
      </div>
      {showArrow && <div style={{ fontSize: 22, color: "#444" }}>Arrasta para o lado &gt;</div>}
    </div>
  );
}

export function TemplateA({
  slideIndex, total, titulo, corpo, imgUrl, formato, profile,
}: TemplateSlideProps) {
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <div style={{
        ...root,
        backgroundImage: imgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%), url('${imgUrl}')` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <Copyright />
        <div style={{ position: "absolute", top: 100, left: 60, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "conic-gradient(#FF6B35,#FF3366,#9B59B6,#FF6B35)", padding: 3 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `#111 url('${profile.avatarUrl}') center/cover`, border: "3px solid #0a0a0a" }} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {profile.nome.toUpperCase()}
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1DA1F2", color: "#fff", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>✓</span>
            </div>
            <div style={{ fontSize: 24, color: "#aaa" }}>{profile.handle}</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 60, right: 60, bottom: 180, fontSize: 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          {titulo}
        </div>
        <div style={{ position: "absolute", bottom: 60, left: 60, fontSize: 22, color: "#999" }}>Arrasta para o lado &gt;</div>
      </div>
    );
  }

  if (formato === "text_only") {
    return (
      <div style={root}>
        <Copyright />
        <div style={{ position: "absolute", top: 200, left: 60, right: 60 }}>
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 36 }}>{titulo}</div>
          <div style={{ fontSize: 40, lineHeight: 1.4, color: "#aaa" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "dark") {
    return (
      <div style={{ ...root, background: "linear-gradient(135deg, #1a0a0a 0%, #0a0a0a 100%)" }}>
        <Copyright />
        <div style={{ position: "absolute", top: 220, left: 60, right: 60 }}>
          <div style={{ display: "inline-block", padding: "8px 20px", background: "linear-gradient(135deg, #FF6B35, #FF3366)", borderRadius: 30, fontSize: 22, fontWeight: 700, marginBottom: 30 }}>ATENÇÃO</div>
          <div style={{ fontSize: 82, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 30 }}>{titulo}</div>
          <div style={{ fontSize: 38, lineHeight: 1.45, color: "#bbb" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "cta") {
    return (
      <div style={root}>
        <div style={{ position: "absolute", top: 60, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#FFD700", fontSize: 26, fontWeight: 700 }}>
            <span style={{ fontSize: 32 }}>★</span> Segue para mais conteúdo!
          </div>
        </div>
        {imgUrl && (
          <div style={{
            position: "absolute", top: 160, left: 60, right: 60, height: 540, borderRadius: 24,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%), url('${imgUrl}')`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        )}
        <div style={{ position: "absolute", top: 740, left: 60, right: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: `url('${profile.avatarUrl}') center/cover, #222` }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{profile.nome}</div>
              <div style={{ fontSize: 22, color: "#888" }}>{profile.handle}</div>
            </div>
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 24 }}>{titulo}</div>
          {corpo && <div style={{ fontSize: 32, lineHeight: 1.4, color: "#bbb" }}>{corpo}</div>}
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={false} />
      </div>
    );
  }

  // light / conteudo
  return (
    <div style={root}>
      <Copyright />
      <div style={{ position: "absolute", top: 100, left: 60, right: 60, fontSize: 72, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
        {titulo}
      </div>
      {imgUrl && (
        <div style={{
          position: "absolute", top: 380, left: 60, right: 60, height: 540, borderRadius: 20,
          backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center",
        }} />
      )}
      {corpo && (
        <div style={{ position: "absolute", bottom: 180, left: 60, right: 60, fontSize: 36, lineHeight: 1.4, color: "#aaa" }}>
          {corpo}
        </div>
      )}
      <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
    </div>
  );
}
