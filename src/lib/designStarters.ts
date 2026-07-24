/**
 * Códigos-base do "Design (código)" por padrão de copy.
 *
 * Ao clicar "Ativar código de design" num template, o editor carrega o
 * código daqui em vez de um starter genérico único — cada padrão (1A, 1B,
 * 2A, 2B, 4, 5) ganha uma tradução fiel e editável do seu layout embutido
 * real (mesma estrutura, mesmas primitivas), não um placeholder qualquer.
 *
 * Usa as mesmas primitivas do DESIGN_SCOPE (designCode.ts): SlideFrame,
 * AdaptiveText, TextSlot e MediaSlot são as primitivas REAIS dos templates
 * embutidos — por isso o texto editado aqui também ganha auto-fit de fonte.
 */
import type { CopyPatternId } from "@/types/social";

const TUTORIAL_1A = `// Padrão 1A · Tutorial — tradução editável do layout embutido real.
// Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile

function Header1A({ profile, tag }) {
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
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.orange, fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />
          {tag}
        </div>
      ) : null}
    </div>
  );
}

function SlideMeta1A({ slideIndex, total, tipoSlide }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 999, border: "1px solid #E8E5E0", background: "#F8FBFC", padding: "10px 16px", fontSize: 18, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#536471" }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.orange, flexShrink: 0 }} />
        {tipoSlide}
      </div>
      <div style={{ fontSize: 20, color: "#536471" }}>Slide {slideIndex + 1}/{total}</div>
    </div>
  );
}

function Frame1A({ children }) {
  return (
    <SlideFrame
      templateKey="custom-1a"
      background={C.offWhite}
      style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: C.offWhite, color: C.black, fontFamily: F.body }}
    >
      <Grain opacity={0.04} />
      <Copyright light />
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "80px 60px 70px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 28 }}>
        {children}
      </div>
    </SlideFrame>
  );
}

function Template(props) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, tipoSlide, profile } = props;
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <Frame1A>
        <Header1A profile={profile} tag={slideIndex === 0 ? "Novo" : undefined} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={92} lineHeight={0.96} color={C.black} style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }} />
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.48} fontWeight={400} color="#444" style={{ maxWidth: 860, maxHeight: 190 }} />
          ) : null}
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 10" minHeight={320} maxHeight={420} style={{ width: "100%", marginTop: "auto", borderRadius: 20, border: "1px solid " + C.borderLight, background: C.white }} />
          ) : null}
        </div>
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </Frame1A>
    );
  }

  if (formato === "statement" || formato === "tension") {
    return (
      <Frame1A>
        <Header1A profile={profile} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0, justifyContent: "center" }}>
          <div style={accentLine} />
          <SlideMeta1A slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
          <AdaptiveText text={titulo} as="h1" minFontSize={44} maxFontSize={86} lineHeight={0.96} color={C.black} style={{ maxWidth: 900, maxHeight: 280, letterSpacing: "-0.01em" }} />
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={260} maxHeight={360} style={{ width: "100%", borderRadius: 20, border: "1px solid " + C.borderLight, background: C.white }} />
          ) : null}
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.52} fontWeight={400} color="#444" style={{ maxWidth: 880, maxHeight: 220 }} />
          ) : null}
        </div>
        <Footer handle={profile.handle} light showArrow={showArrow} />
      </Frame1A>
    );
  }

  if (formato === "cta") {
    return (
      <Frame1A>
        <Header1A profile={profile} tag="Ultima chamada" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={280} maxHeight={420} style={{ width: "100%", borderRadius: 20, border: "1px solid " + C.borderLight, background: C.white }} />
          ) : null}
          <SlideMeta1A slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
          <div style={{ borderRadius: 16, border: "1px solid " + C.borderLight, background: C.white, padding: "30px 32px" }}>
            <AdaptiveText text={titulo} as="h1" minFontSize={44} maxFontSize={84} lineHeight={0.96} color={C.black} style={{ maxWidth: 900, maxHeight: 260, letterSpacing: "-0.01em" }} />
            {corpo ? (
              <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.5} fontWeight={400} color="#444" style={{ marginTop: 18, maxWidth: 840, maxHeight: 180 }} />
            ) : null}
          </div>
        </div>
        <Footer handle={profile.handle} light showArrow={false} />
      </Frame1A>
    );
  }

  return (
    <Frame1A>
      <Header1A profile={profile} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
        <SlideMeta1A slideIndex={slideIndex} total={total} tipoSlide={tipoSlide} />
        <AdaptiveText text={titulo} as="h1" minFontSize={42} maxFontSize={82} lineHeight={0.96} color={C.black} style={{ maxWidth: 900, maxHeight: 260, letterSpacing: "-0.01em" }} />
        {corpo ? (
          <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.5} fontWeight={400} color="#444" style={{ maxWidth: 880, maxHeight: 220 }} />
        ) : null}
        {imgUrl ? (
          <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 10" minHeight={260} maxHeight={380} style={{ width: "100%", marginTop: "auto", borderRadius: 20, border: "1px solid " + C.borderLight, background: C.white }} />
        ) : null}
      </div>
      <Footer handle={profile.handle} light showArrow={showArrow} />
    </Frame1A>
  );
}`;

const CONFLITO_1B = `// Padrão 1B · Conflito — tradução editável do layout embutido real.
// Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile

function splitContrast1B(corpo) {
  const sep = /\\s*\\|\\s*|\\s+vs\\s+/i;
  if (!sep.test(corpo)) return null;
  const [a, b] = corpo.split(sep);
  if (!a || !b) return null;
  return [a.trim(), b.trim()];
}

function Frame1B({ children }) {
  return (
    <SlideFrame
      templateKey="custom-1b"
      background={C.blackDeep}
      style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: C.blackDeep, color: C.white, fontFamily: F.body }}
    >
      <Grain opacity={0.1} />
      <Copyright />
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "96px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 28 }}>
        {children}
      </div>
    </SlideFrame>
  );
}

function Template(props) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, profile } = props;
  const showArrow = slideIndex < total - 1;

  if (formato === "cover") {
    return (
      <Frame1B>
        {imgUrl ? (
          <>
            <MediaSlot src={imgUrl} alt="Imagem de capa" aspectRatio="1080 / 1350" minHeight={1350} maxHeight={1350} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.92) 75%)" }} />
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)" }} />
        )}
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentText, fontSize: 20, letterSpacing: "0.18em", fontWeight: 800 }}>CONFLITO</div>
          <AdaptiveText text={titulo} as="h1" minFontSize={52} maxFontSize={104} lineHeight={0.92} color={C.white} style={{ maxWidth: 900, maxHeight: 320, letterSpacing: "-0.01em" }} />
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.48} fontWeight={400} color="rgba(255,255,255,0.78)" style={{ maxWidth: 820, maxHeight: 180, borderLeft: "3px solid " + C.orange, paddingLeft: 20 }} />
          ) : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </Frame1B>
    );
  }

  if (formato === "statement") {
    const split = splitContrast1B(corpo || "");
    if (split) {
      const [left, right] = split;
      return (
        <Frame1B>
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.44)" }}>ANTES E DEPOIS</div>
            <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={96} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 220, letterSpacing: "-0.01em" }} />
            <div style={{ display: "flex", alignItems: "stretch", gap: 24, flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, padding: "0 8px 0 0", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 18 }}>ANTES</div>
                <AdaptiveText text={left} as="p" minFontSize={30} maxFontSize={72} lineHeight={1.02} color="#777" style={{ maxWidth: 430, maxHeight: 340 }} />
              </div>
              <div style={{ flex: 1, padding: "0 0 0 8px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color: C.orange, marginBottom: 18 }}>DEPOIS</div>
                <AdaptiveText text={right} as="p" minFontSize={30} maxFontSize={72} lineHeight={1.02} color={C.white} style={{ maxWidth: 430, maxHeight: 340 }} />
              </div>
            </div>
          </div>
          <Footer handle={profile.handle} showArrow={showArrow} />
        </Frame1B>
      );
    }

    return (
      <Frame1B>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0, justifyContent: "center" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={96} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 260, letterSpacing: "-0.01em" }} />
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={260} maxHeight={380} style={{ width: "100%", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "#111" }} />
          ) : null}
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 880, maxHeight: 220 }} /> : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </Frame1B>
    );
  }

  if (formato === "tension") {
    return (
      <Frame1B>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 28, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentText, fontSize: 20, letterSpacing: "0.2em", fontWeight: 800 }}>O VILAO</div>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={98} lineHeight={0.92} color={C.white} style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }} />
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={240} maxHeight={340} style={{ width: "100%", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "#111" }} />
          ) : null}
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.52} fontWeight={400} color="#CCC" style={{ maxWidth: 860, maxHeight: 220, borderLeft: "3px solid " + C.orange, paddingLeft: 20 }} />
          ) : null}
        </div>
        <Footer handle={profile.handle} showArrow={showArrow} />
      </Frame1B>
    );
  }

  if (formato === "cta") {
    return (
      <Frame1B>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 26, flex: 1, minHeight: 0 }}>
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={280} maxHeight={440} style={{ width: "100%", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "#111" }} />
          ) : null}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, background: "rgba(253,70,56,0.18)", border: "1px solid " + C.orange, color: C.orange, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Comenta "Metodo"
          </div>
          <AdaptiveText text={titulo} as="h1" minFontSize={44} maxFontSize={88} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em" }} />
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 860, maxHeight: 220 }} /> : null}
        </div>
        <Footer handle={profile.handle} showArrow={false} />
      </Frame1B>
    );
  }

  return (
    <Frame1B>
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
        <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={92} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 260, letterSpacing: "-0.01em" }} />
        {imgUrl ? (
          <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={260} maxHeight={380} style={{ width: "100%", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "#111" }} />
        ) : null}
        {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.5} fontWeight={400} color="#AAA" style={{ maxWidth: 880, maxHeight: 220 }} /> : null}
      </div>
      <Footer handle={profile.handle} showArrow={showArrow} />
    </Frame1B>
  );
}`;

/** Gera o código do editorial (2A claro / 2B escuro) — só muda a paleta. */
function editorialStarter(mode) {
  const isLight = mode === "light";
  return `// Padrão ${isLight ? "2A" : "2B"} · Editorial ${isLight ? "Storytelling" : "Dark"} — tradução editável do layout embutido real.
// Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile

var MODE = "${mode}";
var PALETTE = MODE === "light"
  ? { background: C.offWhite, surface: "rgba(255,255,255,0.84)", border: C.borderLight, text: C.black, muted: "#666", softText: "#444" }
  : { background: C.black, surface: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.08)", text: C.white, muted: "rgba(255,255,255,0.58)", softText: "rgba(255,255,255,0.76)" };

function FrameEditorial({ children, dark }) {
  var palette = dark ? { background: C.black, text: C.white } : PALETTE;
  return (
    <SlideFrame
      templateKey="custom-editorial"
      background={palette.background}
      style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: palette.background, color: palette.text, fontFamily: F.body }}
    >
      {children}
    </SlideFrame>
  );
}

function Template(props) {
  var slideIndex = props.slideIndex, total = props.total, titulo = props.titulo, corpo = props.corpo, imgUrl = props.imgUrl, formato = props.formato, profile = props.profile;
  var light = MODE === "light";

  // Cover é sempre escuro/dramático, independente do modo do resto do carrossel — decisão de design intencional.
  if (formato === "cover") {
    return (
      <FrameEditorial dark>
        {imgUrl ? (
          <MediaSlot src={imgUrl} alt="Imagem de capa editorial" aspectRatio="1080 / 1350" minHeight={1350} maxHeight={1350} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.62) 55%, rgba(0,0,0,0.94) 100%)" }} />
        <Grain opacity={0.14} />
        <Copyright />
        <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "120px 60px 56px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <AvatarRing url={profile.avatarUrl} size={96} />
          <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <AdaptiveText text={titulo} as="h1" minFontSize={50} maxFontSize={104} lineHeight={0.94} color={C.white} textAlign="center" style={{ maxWidth: 920, maxHeight: 360, letterSpacing: "-0.01em", textShadow: "0 1px 4px rgba(0,0,0,0.85), 0 2px 18px rgba(0,0,0,0.5)" }} />
            {corpo ? (
              <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.48} fontWeight={500} color="rgba(255,255,255,0.82)" textAlign="center" style={{ maxWidth: 780, maxHeight: 200, textShadow: "0 1px 4px rgba(0,0,0,0.72)" }} />
            ) : null}
          </div>
          <div style={{ marginTop: 32, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.58)" }}>{profile.handle}</div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Arraste para o lado.</div>
          </div>
        </div>
      </FrameEditorial>
    );
  }

  if (formato === "statement") {
    return (
      <FrameEditorial>
        <Grain opacity={light ? 0.04 : 0.08} />
        {!light ? <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 35%, rgba(253,70,56,0.08) 0%, transparent 62%)" }} /> : null}
        <Copyright light={light} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "120px 60px 124px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 24 }}>
          <div style={{ ...accentLine, marginBottom: 8 }} />
          <AdaptiveText text={titulo} as="h1" minFontSize={44} maxFontSize={92} lineHeight={0.96} color={PALETTE.text} textAlign="center" style={{ maxWidth: 920, maxHeight: 340, letterSpacing: "-0.01em" }} />
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={260} maxHeight={360} style={{ width: "100%", maxWidth: 900, borderRadius: 20, border: "1px solid " + PALETTE.border, background: light ? "#FFFFFF" : "#111" }} />
          ) : null}
          {corpo ? (
            <div style={{ width: "100%", maxWidth: 900, borderRadius: 24, border: "1px solid " + PALETTE.border, background: PALETTE.surface, padding: "34px 38px" }}>
              <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.55} fontWeight={400} color={PALETTE.softText} textAlign="center" style={{ maxHeight: 220 }} />
            </div>
          ) : null}
          <div style={{ fontSize: 20, color: PALETTE.muted }}>{slideIndex + 1}/{total}</div>
        </div>
        <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
      </FrameEditorial>
    );
  }

  if (formato === "tension") {
    return (
      <FrameEditorial>
        <Grain opacity={light ? 0.04 : 0.09} />
        {!light ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.46) 58%, rgba(0,0,0,0.92) 100%)" }} /> : null}
        <Copyright light={light} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "142px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", color: PALETTE.muted }}>Tensao editorial</div>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={98} lineHeight={0.94} color={PALETTE.text} style={{ maxWidth: 920, maxHeight: 360, letterSpacing: "-0.01em" }} />
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={240} maxHeight={340} style={{ width: "100%", maxWidth: 920, borderRadius: 20, border: "1px solid " + PALETTE.border, background: light ? "#FFFFFF" : "#111" }} />
          ) : null}
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.5} fontWeight={400} color={PALETTE.softText} style={{ maxWidth: 860, maxHeight: 250, borderLeft: "3px solid " + C.orange, paddingLeft: 20, marginTop: 12 }} />
          ) : null}
          <div style={{ marginTop: "auto", fontSize: 20, color: PALETTE.muted }}>{slideIndex + 1}/{total}</div>
        </div>
        <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
      </FrameEditorial>
    );
  }

  if (formato === "cta") {
    return (
      <FrameEditorial>
        <Grain opacity={light ? 0.04 : 0.12} />
        <Copyright light={light} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "104px 60px 124px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 24 }}>
          {imgUrl ? (
            <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 9" minHeight={300} maxHeight={440} style={{ width: "100%", borderRadius: 20, border: "1px solid " + PALETTE.border, background: light ? "#FFFFFF" : "#111" }} />
          ) : null}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, alignSelf: "flex-start", padding: "10px 18px", borderRadius: 999, background: "rgba(253,70,56,0.14)", border: "1px solid " + C.orange, color: C.orange, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Comenta agora
          </div>
          <AdaptiveText text={titulo} as="h1" minFontSize={44} maxFontSize={88} lineHeight={0.96} color={PALETTE.text} style={{ maxWidth: 920, maxHeight: 300, letterSpacing: "-0.01em" }} />
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.48} fontWeight={400} color={PALETTE.softText} style={{ maxWidth: 860, maxHeight: 220 }} />
          ) : null}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ fontSize: 20, color: PALETTE.muted }}>{profile.handle}</div>
            <div style={{ fontSize: 20, color: PALETTE.muted }}>{slideIndex + 1}/{total}</div>
          </div>
        </div>
        <Footer handle={profile.handle} light={light} showArrow={false} />
      </FrameEditorial>
    );
  }

  // content (default)
  return (
    <FrameEditorial>
      <Grain opacity={light ? 0.04 : 0.08} />
      <Copyright light={light} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "94px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
            <AvatarRing url={profile.avatarUrl} size={74} light={light} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: PALETTE.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.nome}</div>
              <div style={{ fontSize: 22, color: PALETTE.muted }}>{profile.handle}</div>
            </div>
          </div>
          <div style={{ fontSize: 20, color: PALETTE.muted }}>Slide {slideIndex + 1}/{total}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <div style={{ ...accentLine, opacity: light ? 0.9 : 1 }} />
          <AdaptiveText text={titulo} as="h1" minFontSize={42} maxFontSize={86} lineHeight={1} color={PALETTE.text} style={{ maxWidth: 900, maxHeight: 280, letterSpacing: "-0.01em" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0 }}>
            {imgUrl ? (
              <MediaSlot src={imgUrl} alt={titulo} aspectRatio="16 / 10" minHeight={300} maxHeight={440} style={{ width: "100%", borderRadius: 20, border: "1px solid " + PALETTE.border, background: light ? "#FFFFFF" : "#111" }} />
            ) : null}
            {corpo ? (
              <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.45} fontWeight={400} color={PALETTE.softText} style={{ maxWidth: 900, maxHeight: 240 }} />
            ) : null}
          </div>
        </div>
      </div>
      <Footer handle={profile.handle} light={light} showArrow={slideIndex < total - 1} />
    </FrameEditorial>
  );
}`;
}

const POST_FRASE_4 = `// Padrão 4 · Post Frase — tradução editável do layout embutido real.
// Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile

function overlay4(formato) {
  if (formato === "tension") return "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 52%, rgba(0,0,0,0.96) 100%)";
  if (formato === "statement") return "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.58) 56%, rgba(0,0,0,0.92) 100%)";
  return "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.92) 100%)";
}

function Template(props) {
  const { slideIndex, total, titulo, corpo, imgUrl, formato, profile } = props;
  const isLast = slideIndex === total - 1;

  return (
    <SlideFrame
      templateKey="custom-4"
      background={C.black}
      style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: C.black, color: C.white, fontFamily: F.body }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {imgUrl ? (
          <MediaSlot src={imgUrl} alt="Imagem de fundo" aspectRatio="1080 / 1350" minHeight={1350} maxHeight={1350} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: overlay4(formato) }} />
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", padding: "44px 60px 46px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.78)" }}>{profile.nome}</div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}>{profile.handle}</div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0, alignItems: "flex-end" }}>
          <div style={{ width: "100%", maxWidth: 920, display: "flex", flexDirection: "column", gap: 24 }}>
            {formato === "statement" ? (
              <div style={{ alignSelf: "flex-start", padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.16)", fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.82)" }}>
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
              style={{ maxHeight: formato === "cover" ? 470 : 390, maxWidth: formato === "statement" ? 900 : 860, textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.72)", letterSpacing: "-0.01em" }}
            />

            {corpo ? (
              <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.42} fontWeight={500} color="rgba(255,255,255,0.82)" style={{ maxWidth: 760, maxHeight: 240, textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.7)" }} />
            ) : null}

            {formato === "cta" ? (
              <div style={{ alignSelf: "flex-start", padding: "14px 20px", borderRadius: 999, background: "rgba(253,70,56,0.16)", border: "1px solid rgba(253,70,56,0.5)", color: "#FFD8D4", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Veja a legenda completa
              </div>
            ) : null}
          </div>
        </div>

        {isLast ? (
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.58)" }}>Fechamento da sequência.</div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Arraste para o lado.</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: "auto", paddingTop: 20, flexShrink: 0 }}>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.55)" }}>Slide {slideIndex + 1}/{total}</div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.72)" }}>Leia a legenda.</div>
          </div>
        )}
      </div>
    </SlideFrame>
  );
}`;

const FRASE_MESTRE_5 = `// Padrão 5 · Frase Mestre — tradução editável do layout embutido real.
// Props: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile

var ICONS_5 = ["↓", "◉", "⏱", "↗", "✓"];

function Frame5({ children, background, color }) {
  return (
    <SlideFrame
      templateKey="custom-5"
      background={background}
      style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", fontFamily: F.body, color: color }}
    >
      <Grain opacity={0.08} />
      <Copyright light={color === C.white} />
      <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>{children}</div>
    </SlideFrame>
  );
}

function Template(props) {
  var slideIndex = props.slideIndex, total = props.total, titulo = props.titulo, corpo = props.corpo, imgUrl = props.imgUrl, profile = props.profile;

  if (slideIndex === 0) {
    return (
      <Frame5 background="linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)" color={C.white}>
        {imgUrl ? (
          <>
            <MediaSlot src={imgUrl} alt="Imagem de capa" aspectRatio="1080 / 1350" minHeight={1350} maxHeight={1350} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 0, border: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.78) 100%)" }} />
          </>
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 30%, rgba(253,70,56,0.10) 0%, transparent 55%)" }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "140px 60px 64px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={56} maxFontSize={132} lineHeight={0.9} color={C.white} style={{ maxWidth: 920, maxHeight: 360, letterSpacing: "-0.01em" }} />
          {corpo ? (
            <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={40} lineHeight={1.4} fontWeight={400} color="rgba(255,255,255,0.68)" style={{ maxWidth: 760, maxHeight: 220, marginLeft: "auto", textAlign: "right" }} />
          ) : null}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.58)" }}>{profile.handle}</div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>Arraste para o lado.</div>
          </div>
        </div>
      </Frame5>
    );
  }

  if (slideIndex === 3 && total >= 5) {
    return (
      <Frame5 background="linear-gradient(135deg,#0D1520 0%,#1A2535 50%,#0A0F18 100%)" color={C.white}>
        {imgUrl ? (
          <MediaSlot src={imgUrl} alt={titulo} aspectRatio="1080 / 540" minHeight={540} maxHeight={540} style={{ position: "absolute", inset: "0 0 auto 0", width: "100%", height: 540, borderRadius: 0, border: "none" }} />
        ) : null}
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "120px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={92} lineHeight={0.94} color={C.white} style={{ maxWidth: 920, maxHeight: 220, letterSpacing: "-0.01em", marginTop: "auto" }} />
          <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
            {(corpo || "").split("|").slice(0, 3).map(function (part, i) {
              var pieces = part.trim().split(" ");
              var num = pieces[0];
              var rest = pieces.slice(1).join(" ");
              return (
                <div key={i} style={{ flex: 1 }}>
                  <AdaptiveText text={num || "—"} as="div" minFontSize={48} maxFontSize={76} lineHeight={1} color={C.orange} style={{ maxHeight: 110, letterSpacing: "-0.01em" }} />
                  <TextSlot text={rest} as="p" minFontSize={18} maxFontSize={26} lineHeight={1.42} fontWeight={400} color="#888" style={{ maxHeight: 160, marginTop: 6 }} />
                </div>
              );
            })}
          </div>
          <Footer handle={profile.handle} showArrow />
        </div>
      </Frame5>
    );
  }

  if (slideIndex === total - 1) {
    return (
      <Frame5 background={C.offWhite} color={C.black}>
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "120px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={48} maxFontSize={96} lineHeight={0.94} color={C.black} style={{ maxWidth: 920, maxHeight: 280, letterSpacing: "-0.01em", marginBottom: 30 }} />
          <div style={{ width: 40, height: 2, background: C.orange, marginBottom: 36 }} />
          <div style={{ width: 120, height: 120, borderRadius: 32, background: C.gradOrange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 70, color: C.white, marginBottom: 20 }}>W</div>
          <div style={{ fontFamily: F.display, fontSize: 52, color: C.black, letterSpacing: "0.08em", marginBottom: 16 }}>WAVY DIGITAL</div>
          {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={34} lineHeight={1.44} fontWeight={400} color="#777" style={{ maxWidth: 760, maxHeight: 180 }} /> : null}
        </div>
      </Frame5>
    );
  }

  var iconIdx = (slideIndex - 1) % ICONS_5.length;

  return (
    <Frame5 background={C.offWhite} color={C.black}>
      <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "100px 60px 120px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <AdaptiveText text={titulo} as="h1" minFontSize={52} maxFontSize={104} lineHeight={0.92} color={C.black} style={{ maxWidth: 780, maxHeight: 280, letterSpacing: "-0.01em" }} />
          <div style={{ fontSize: 20, color: "#777" }}>Slide {slideIndex + 1}/{total}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, minHeight: 0, fontSize: 150, color: C.orange, lineHeight: 1 }}>
          {ICONS_5[iconIdx]}
        </div>
        {corpo ? <TextSlot text={corpo} as="p" minFontSize={24} maxFontSize={36} lineHeight={1.42} fontWeight={500} color="#333" style={{ maxWidth: 860, maxHeight: 220 }} /> : null}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 22, color: "#777" }}>{profile.handle}</div>
          <div style={{ fontSize: 22, color: "#777" }}>Arraste para o lado.</div>
        </div>
      </div>
    </Frame5>
  );
}`;

export const STARTER_DESIGN_CODE_BY_LAYOUT: Partial<Record<CopyPatternId, string>> = {
  "1A": TUTORIAL_1A,
  "1B": CONFLITO_1B,
  "2A": editorialStarter("light"),
  "2B": editorialStarter("dark"),
  "4": POST_FRASE_4,
  "5": FRASE_MESTRE_5,
};
