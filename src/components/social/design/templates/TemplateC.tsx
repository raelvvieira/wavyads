// Template C — Editorial Escuro (mais minimalista, accent verde sutil)
import type { CSSProperties } from "react";
import type { TemplateSlideProps } from "./shared";

const root: CSSProperties = {
  width: 1080, height: 1350, position: "relative",
  background: "#0a0a0a", color: "#fff",
  fontFamily: "Montserrat, sans-serif", overflow: "hidden",
};

function Footer({ nome, handle, showArrow }: { nome: string; handle: string; showArrow: boolean }) {
  return (
    <div style={{ position: "absolute", bottom: 40, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ padding: "12px 24px", borderRadius: 50, fontSize: 20, fontWeight: 700, background: "#1ACD8A", color: "#0a0a0a", letterSpacing: "0.05em" }}>{nome.toUpperCase()}</div>
        <div style={{ padding: "12px 24px", borderRadius: 50, fontSize: 20, fontWeight: 700, background: "transparent", color: "#fff", border: "1px solid #333" }}>{handle}</div>
      </div>
      {showArrow && <div style={{ fontSize: 22, color: "#444" }}>→</div>}
    </div>
  );
}

function Copyright() {
  return <div style={{ position: "absolute", top: 36, right: 60, fontSize: 18, color: "#444", textAlign: "right", lineHeight: 1.4, letterSpacing: "0.1em" }}>EDITORIAL<br />ED. 2026</div>;
}

export function TemplateC({
  slideIndex, total, titulo, corpo, imgUrl, formato, profile,
}: TemplateSlideProps) {
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <div style={{
        ...root,
        backgroundImage: imgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.92) 100%), url('${imgUrl}')` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div style={{ position: "absolute", top: 60, left: 60, fontSize: 18, color: "#1ACD8A", letterSpacing: "0.2em", fontWeight: 700 }}>WAVY · EDITORIAL</div>
        <Copyright />
        <div style={{ position: "absolute", bottom: 220, left: 60, right: 60 }}>
          <div style={{ width: 80, height: 4, background: "#1ACD8A", marginBottom: 40 }} />
          <div style={{ fontSize: 100, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.04em" }}>{titulo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow />
      </div>
    );
  }

  if (formato === "text_only") {
    return (
      <div style={root}>
        <Copyright />
        <div style={{ position: "absolute", top: 220, left: 60, right: 60 }}>
          <div style={{ width: 60, height: 3, background: "#1ACD8A", marginBottom: 32 }} />
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 40 }}>{titulo}</div>
          <div style={{ fontSize: 38, lineHeight: 1.5, color: "#aaa" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "dark") {
    return (
      <div style={{ ...root, background: "#101010" }}>
        <Copyright />
        <div style={{ position: "absolute", top: 240, left: 60, right: 60 }}>
          <div style={{ fontSize: 22, color: "#1ACD8A", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 30 }}>⚠ ATENÇÃO</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 36 }}>{titulo}</div>
          <div style={{ fontSize: 38, lineHeight: 1.45, color: "#aaa" }}>{corpo}</div>
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
      </div>
    );
  }

  if (formato === "cta") {
    return (
      <div style={root}>
        {imgUrl && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.95) 70%), url('${imgUrl}')`,
            backgroundSize: "cover", backgroundPosition: "center",
          }} />
        )}
        <div style={{ position: "absolute", top: 60, left: 60, fontSize: 26, color: "#1ACD8A", fontWeight: 700, letterSpacing: "0.1em" }}>★ SIGA @{profile.handle.replace("@", "")}</div>
        <div style={{ position: "absolute", bottom: 260, left: 60, right: 60 }}>
          <div style={{ width: 60, height: 3, background: "#1ACD8A", marginBottom: 30 }} />
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24 }}>{titulo}</div>
          {corpo && <div style={{ fontSize: 32, color: "#bbb", lineHeight: 1.4 }}>{corpo}</div>}
        </div>
        <Footer nome={profile.nome} handle={profile.handle} showArrow={false} />
      </div>
    );
  }

  // light / conteudo
  return (
    <div style={root}>
      <Copyright />
      <div style={{ position: "absolute", top: 120, left: 60, right: 60 }}>
        <div style={{ fontSize: 22, color: "#1ACD8A", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 24 }}>{String(slideIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>{titulo}</div>
      </div>
      {imgUrl && (
        <div style={{
          position: "absolute", top: 460, left: 60, right: 60, height: 520, borderRadius: 8,
          backgroundImage: `url('${imgUrl}')`, backgroundSize: "cover", backgroundPosition: "center",
          border: "1px solid #1a1a1a",
        }} />
      )}
      {corpo && (
        <div style={{ position: "absolute", bottom: 180, left: 60, right: 60, fontSize: 34, lineHeight: 1.4, color: "#aaa" }}>
          {corpo}
        </div>
      )}
      <Footer nome={profile.nome} handle={profile.handle} showArrow={showArrow} />
    </div>
  );
}
