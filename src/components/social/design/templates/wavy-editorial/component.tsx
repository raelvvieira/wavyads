/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties } from "react";
import { BadgeCheck } from "lucide-react";
import { C, F, type TemplateSlideProps } from "../shared";
import { AdaptiveText, MediaSlot, SlideFrame, TextSlot } from "../adaptive";

/**
 * WAVY EDITORIAL — template minimalista tipo "print de tweet / publicação".
 *
 * Estilo-alvo (referências Baltazar / Marketing Insider): masthead de veículo
 * no topo, bloco de identidade avatar+nome+selo, título bold grande alinhado à
 * esquerda, corpo em peso leve, MUITO espaço em branco, imagem só de APOIO
 * (retângulo arredondado abaixo do texto). Slides sem imagem ficam puro texto.
 * Zero pills/cards/gradientes decorativos. Duas variantes de fundo (claro/escuro).
 *
 * Usa as primitivas do adaptive COMPARTILHADO (../adaptive) — o mesmo que o
 * AdaptiveCarouselProvider do DesignStep orquestra — para o auto-fit funcionar.
 */

export type WavyEditorialMode = "light" | "dark";

interface Palette {
  bg: string;
  text: string;
  muted: string;
  softText: string;
  border: string;
  mediaBg: string;
}

const PALETTES: Record<WavyEditorialMode, Palette> = {
  light: {
    bg: C.offWhite,
    text: C.twBlack,
    muted: C.twGray,
    softText: "#3D4852",
    border: "#E4E0DA",
    mediaBg: "#FFFFFF",
  },
  dark: {
    bg: "#0B0B0D",
    text: "#F4F5F7",
    muted: "rgba(255,255,255,0.52)",
    softText: "rgba(255,255,255,0.78)",
    border: "rgba(255,255,255,0.10)",
    mediaBg: "#111114",
  },
};

const rootFor = (p: Palette): CSSProperties => ({
  width: 1080,
  height: 1350,
  position: "relative",
  overflow: "hidden",
  background: p.bg,
  color: p.text,
  fontFamily: F.twitter,
});

const page: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  gap: 30,
  padding: "72px 72px 64px",
  boxSizing: "border-box",
};

/** Masthead editorial: veículo + tag (esq) · © + @handle (dir). */
function Masthead({ profile, p }: { profile: TemplateSlideProps["profile"]; p: Palette }) {
  if (!profile.veiculo) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flex: "0 0 auto" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.02em", color: p.text }}>{profile.veiculo}</div>
        {profile.veiculoTag ? (
          <div style={{ fontSize: 17, color: p.muted, marginTop: 2 }}>{profile.veiculoTag}</div>
        ) : null}
      </div>
      <div style={{ textAlign: "right", fontSize: 17, color: p.muted, lineHeight: 1.4, flexShrink: 0 }}>
        <div>Copyright © 2026</div>
        <div>{profile.handle}</div>
      </div>
    </div>
  );
}

/** Bloco de identidade estilo tweet: avatar + nome + selo + @handle. */
function IdentityRow({ profile, p }: { profile: TemplateSlideProps["profile"]; p: Palette }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
      <div
        style={{
          width: 76,
          height: 76,
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
              fontSize: 28,
              lineHeight: 1.1,
              color: p.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profile.nome}
          </span>
          {profile.verificado !== false ? (
            <BadgeCheck size={24} fill={C.twBlue} color={p.bg} strokeWidth={2.5} />
          ) : null}
        </div>
        <div style={{ fontSize: 22, color: p.muted, lineHeight: 1.2 }}>{profile.handle}</div>
      </div>
    </div>
  );
}

function Title({ text, p, maxHeight }: { text: string; p: Palette; maxHeight: number }) {
  return (
    <AdaptiveText
      text={text}
      as="h1"
      minFontSize={40}
      maxFontSize={84}
      lineHeight={1.04}
      fontWeight={800}
      color={p.text}
      style={{ maxWidth: 940, maxHeight, letterSpacing: "-0.02em" }}
    />
  );
}

function Body({ text, p, maxHeight }: { text: string; p: Palette; maxHeight: number }) {
  if (!text) return null;
  return (
    <TextSlot
      text={text}
      as="p"
      minFontSize={26}
      maxFontSize={38}
      lineHeight={1.42}
      fontWeight={400}
      color={p.softText}
      style={{ maxWidth: 940, maxHeight }}
    />
  );
}

function Media({ src, alt, p, aspectRatio = "16 / 10", minHeight = 300, maxHeight = 460 }: {
  src: string; alt: string; p: Palette; aspectRatio?: string; minHeight?: number; maxHeight?: number;
}) {
  return (
    <MediaSlot
      src={src}
      alt={alt}
      aspectRatio={aspectRatio}
      minHeight={minHeight}
      maxHeight={maxHeight}
      style={{ width: "100%", borderRadius: 24, border: `1px solid ${p.border}`, background: p.mediaBg }}
    />
  );
}

export function createWavyEditorial(mode: WavyEditorialMode) {
  const p = PALETTES[mode];
  const templateKey = `wavy-editorial-${mode}`;

  return function WavyEditorialTemplate(props: TemplateSlideProps) {
    const { titulo, corpo, imgUrl, formato, profile } = props;

    // COVER — identidade forte (masthead + tweet card) + título grande + imagem de apoio.
    if (formato === "cover") {
      return (
        <SlideFrame style={rootFor(p)} background={p.bg} templateKey={templateKey}>
          <div style={page}>
            <Masthead profile={profile} p={p} />
            <IdentityRow profile={profile} p={p} />
            <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1, minHeight: 0 }}>
              <Title text={titulo} p={p} maxHeight={340} />
              <Body text={corpo} p={p} maxHeight={200} />
              {imgUrl ? (
                <div style={{ marginTop: "auto" }}>
                  <Media src={imgUrl} alt={titulo} p={p} minHeight={320} maxHeight={480} />
                </div>
              ) : null}
            </div>
          </div>
        </SlideFrame>
      );
    }

    // CTA — fechamento: identidade no topo, título + corpo, imagem opcional.
    if (formato === "cta") {
      return (
        <SlideFrame style={rootFor(p)} background={p.bg} templateKey={templateKey}>
          <div style={page}>
            <Masthead profile={profile} p={p} />
            <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1, minHeight: 0, justifyContent: "center" }}>
              {imgUrl ? <Media src={imgUrl} alt={titulo} p={p} aspectRatio="16 / 9" minHeight={300} maxHeight={420} /> : null}
              <Title text={titulo} p={p} maxHeight={300} />
              <Body text={corpo} p={p} maxHeight={220} />
              <IdentityRow profile={profile} p={p} />
            </div>
          </div>
        </SlideFrame>
      );
    }

    // CONTENT / STATEMENT / TENSION — masthead + título bold + corpo leve + imagem-apoio abaixo.
    // Sem imagem = puro texto (sem placeholder). Statement centraliza verticalmente.
    const centered = formato === "statement";
    return (
      <SlideFrame style={rootFor(p)} background={p.bg} templateKey={templateKey}>
        <div style={page}>
          <Masthead profile={profile} p={p} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 26,
              flex: 1,
              minHeight: 0,
              justifyContent: centered ? "center" : "flex-start",
            }}
          >
            <Title text={titulo} p={p} maxHeight={centered ? 360 : 300} />
            <Body text={corpo} p={p} maxHeight={centered ? 260 : 240} />
            {imgUrl ? (
              <div style={{ marginTop: centered ? 0 : "auto" }}>
                <Media src={imgUrl} alt={titulo} p={p} minHeight={300} maxHeight={460} />
              </div>
            ) : null}
          </div>
        </div>
      </SlideFrame>
    );
  };
}

export const WavyEditorialLight = createWavyEditorial("light");
export const WavyEditorialDark = createWavyEditorial("dark");
