/**
 * Compilador de "código de design" do template.
 *
 * Permite editar o componente React que monta cada slide como TEXTO, dentro do
 * app. O JSX é transformado em runtime (sucrase, carregado sob demanda) e
 * avaliado com um escopo CURADO (React + primitivas de design da Wavy).
 *
 * Segurança: ferramenta admin, código escrito pelo próprio usuário. Erros de
 * compilação/execução são capturados e nunca derrubam o app (ver
 * useCompiledDesign + DesignErrorBoundary).
 */
import * as React from "react";
import { C, F, SLIDE_W, SLIDE_H } from "@/components/social/design/templates/shared";
import {
  AvatarRing, Footer, Grain, HeaderAvatar, AccentTitle, Copyright, PillWavy, PillHandle,
  accentLine, accentText,
} from "@/components/social/design/templates/parts";
import { SlideFrame, AdaptiveText, TextSlot, MediaSlot } from "@/components/social/design/templates/adaptive";

/**
 * Primitivas disponíveis dentro do código do usuário (variáveis globais).
 *
 * SlideFrame/AdaptiveText/TextSlot/MediaSlot são as MESMAS primitivas dos
 * templates embutidos reais — usá-las (em vez de <div>/<img> cru) é o que
 * garante que o texto do código custom também ganhe o auto-fit de tamanho
 * de fonte (a etapa Design já envolve tudo num AdaptiveCarouselProvider).
 */
export const DESIGN_SCOPE: Record<string, unknown> = {
  C, F, SLIDE_W, SLIDE_H,
  AvatarRing, Footer, Grain, HeaderAvatar, AccentTitle, Copyright, PillWavy, PillHandle,
  accentLine, accentText,
  SlideFrame, AdaptiveText, TextSlot, MediaSlot,
};

const SCOPE_KEYS = Object.keys(DESIGN_SCOPE);

let transformPromise: Promise<(typeof import("sucrase"))["transform"]> | null = null;
async function getTransform() {
  if (!transformPromise) {
    transformPromise = import("sucrase").then((m) => m.transform);
  }
  return transformPromise;
}

/**
 * Compila o código do design em um componente React.
 * O código DEVE definir `function Template(props) { ... }`.
 * Lança Error (com mensagem legível) em caso de falha de compilação.
 */
export async function compileDesign(code: string): Promise<React.ComponentType<any>> {
  const transform = await getTransform();
  let out: string;
  try {
    out = transform(code, { transforms: ["jsx", "typescript"], production: true }).code;
  } catch (e: any) {
    throw new Error(`Erro de sintaxe: ${e?.message || e}`);
  }

  const body =
    `const {${SCOPE_KEYS.join(",")}} = __scope;\n` +
    `${out}\n` +
    `return typeof Template !== "undefined" ? Template : undefined;`;

  let Comp: unknown;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function("React", "__scope", body);
    Comp = factory(React, DESIGN_SCOPE);
  } catch (e: any) {
    throw new Error(`Erro ao avaliar o código: ${e?.message || e}`);
  }

  if (typeof Comp !== "function") {
    throw new Error("O código precisa definir uma função Template(props).");
  }
  return Comp as React.ComponentType<any>;
}

/** Código inicial editável — layout limpo e legível usando as primitivas. */
export const STARTER_DESIGN_CODE = `// Componente que monta 1 slide (1080x1350). Edite à vontade.
// Props recebidas: titulo, corpo, imgUrl, tipoSlide, formato, slideIndex, total, profile
// Primitivas disponíveis: C (cores), F (fontes), AvatarRing, Footer, SLIDE_W, SLIDE_H
function Template(props) {
  const { titulo, corpo, imgUrl, slideIndex, total, profile } = props;
  const isCover = props.formato === "cover" || slideIndex === 0;

  return (
    <div style={{
      width: SLIDE_W, height: SLIDE_H, position: "relative",
      background: C.black, color: C.white, overflow: "hidden",
      fontFamily: F.body, display: "flex", flexDirection: "column",
    }}>
      {/* Imagem de fundo (se houver) */}
      {imgUrl && (
        <img src={imgUrl} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.85,
        }} />
      )}
      {/* Gradiente para legibilidade do texto */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.95) 100%)",
      }} />

      {/* Conteúdo */}
      <div style={{ position: "relative", marginTop: "auto", padding: "0 70px 90px" }}>
        <div style={{
          fontFamily: F.display, fontSize: isCover ? 120 : 84, lineHeight: 1.0,
          letterSpacing: "-0.01em", textTransform: "uppercase", marginBottom: 24,
        }}>
          {titulo}
        </div>
        {corpo && (
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "rgba(255,255,255,0.85)", maxWidth: 860 }}>
            {corpo}
          </div>
        )}
      </div>

      {/* Rodapé com identidade */}
      <div style={{
        position: "relative", padding: "0 70px 54px",
        display: "flex", alignItems: "center", gap: 18,
      }}>
        <AvatarRing url={profile.avatarUrl} size={72} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{profile.nome}</div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }}>{profile.handle}</div>
        </div>
        <div style={{ fontSize: 24, color: C.orange, fontWeight: 700 }}>
          {String(slideIndex + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}`;
