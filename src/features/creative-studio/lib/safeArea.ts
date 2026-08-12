import type { CreativeAspectRatio } from '../types/creative';

/**
 * Safe zones da Meta Ads.
 *
 * Safe zone é a área do criativo onde a interface da Meta (foto de perfil,
 * legenda, botão de CTA, barra de engajamento) NÃO cobre o conteúdo. Ela
 * restringe a MENSAGEM — texto, logo, preço, CTA. Não restringe a imagem:
 * fundo e foto devem ocupar o frame inteiro.
 *
 * Por que porcentagem, e não pixel:
 * o prompt declara 1080x1920, mas o parâmetro enviado ao gerador é
 * `size: "2:3"` (criativo-generate). Ou seja, não sabemos com certeza o
 * canvas que sai do outro lado. Porcentagem sobrevive a isso e é exatamente
 * como a Meta publica e desenha no Safe Zone Guardrail do Ads Manager. Os
 * pixels ficam como referência do canvas nominal, nunca como a regra.
 */

export interface SafeArea {
  topPct: number;
  bottomPct: number;
  sidePct: number;
  /** Reels/Stories: a barra de engajamento empilha no canto inferior direito. */
  bottomRightPct?: number;
  /** Canvas nominal da especificação — só para citar px de referência. */
  canvas: { width: number; height: number };
  /**
   * 'meta' = número publicado pela Meta. 'derivado' = número de trabalho
   * nosso, para formatos sem especificação publicada. A distinção existe
   * para ninguém tratar um chute como se fosse regra da plataforma.
   */
  source: 'meta' | 'derivado';
  /** Posicionamento equivalente, quando existe. */
  placement?: string;
}

/**
 * Formatos sem posicionamento Meta correspondente (4:3, 3:4, 2:3, 3:2, 21:9).
 * 8% em todas as bordas é conservador o bastante para sobreviver a corte de
 * borda em tela alheia, sem estrangular a composição.
 *
 * O canvas é por formato, e não um 1080x1080 para todos: ele é citado no
 * prompt como referência em pixels, e declarar uma tela quadrada num criativo
 * 21:9 manda o modelo compor contra um quadro que não existe.
 */
function genericSafeArea(width: number, height: number): SafeArea {
  return { topPct: 8, bottomPct: 8, sidePct: 8, canvas: { width, height }, source: 'derivado' };
}

export const SAFE_AREAS: Record<CreativeAspectRatio, SafeArea> = {
  // Único conjunto publicado pela Meta. Instagram Stories, Instagram Reels,
  // Facebook Reels e o vídeo 9:16 de Feed usam os mesmos números; Facebook
  // Stories é mais folgado, então um criativo feito para cá passa nele.
  '9:16': {
    topPct: 14,
    bottomPct: 35,
    bottomRightPct: 40,
    sidePct: 6,
    canvas: { width: 1080, height: 1920 },
    source: 'meta',
    placement: 'Instagram Stories, Instagram/Facebook Reels e Feed 9:16',
  },
  // 250px de topo/base e 100px de lado sobre 1080x1350.
  '4:5': {
    topPct: 18.5,
    bottomPct: 18.5,
    sidePct: 9.3,
    canvas: { width: 1080, height: 1350 },
    source: 'derivado',
    placement: 'Feed vertical',
  },
  // 100px em todas as bordas sobre 1080x1080. A Meta não publica percentual
  // para Feed fora de 9:16 — é número de trabalho.
  '1:1': {
    topPct: 9.3,
    bottomPct: 9.3,
    sidePct: 9.3,
    canvas: { width: 1080, height: 1080 },
    source: 'derivado',
    placement: 'Feed quadrado e carrossel',
  },
  // Percentuais herdados dos 60px de topo/base e 120px de lado do formato de
  // preview de link (1200x628). O canvas aqui é 16:9 de verdade — 1200x628 é
  // 1,91:1, e usá-lo como referência descrevia um quadro que não é este.
  '16:9': {
    topPct: 9.6,
    bottomPct: 9.6,
    sidePct: 10,
    canvas: { width: 1920, height: 1080 },
    source: 'derivado',
    placement: 'Preview de link, coluna direita e in-stream',
  },
  '4:3': genericSafeArea(1440, 1080),
  '3:4': genericSafeArea(1080, 1440),
  '2:3': genericSafeArea(1080, 1620),
  '3:2': genericSafeArea(1620, 1080),
  '21:9': genericSafeArea(1680, 720),
};

export function safeAreaFor(ratio: CreativeAspectRatio | null | undefined): SafeArea {
  return (ratio && SAFE_AREAS[ratio]) || SAFE_AREAS['1:1'];
}

export interface SafeRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
}

/** Retângulo onde a mensagem pode viver, em px do canvas nominal. */
export function safeRect(area: SafeArea): SafeRect {
  const { width, height } = area.canvas;
  const x0 = Math.round((area.sidePct / 100) * width);
  const x1 = width - x0;
  const y0 = Math.round((area.topPct / 100) * height);
  const y1 = height - Math.round((area.bottomPct / 100) * height);
  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };
}

/**
 * Quanto o centro da área segura fica ACIMA do centro do canvas.
 *
 * É o número que corrige o erro de composição mais comum: quando a zona
 * inferior é muito maior que a superior (9:16 tem 35% embaixo contra 14% em
 * cima), tudo que o modelo centraliza no frame nasce baixo demais e acaba
 * coberto pela interface. Positivo = precisa subir.
 */
export function verticalLift(area: SafeArea): number {
  const rect = safeRect(area);
  const safeCenterY = (rect.y0 + rect.y1) / 2;
  return Math.round(area.canvas.height / 2 - safeCenterY);
}

/**
 * Mínimos de legibilidade da tipografia, escalados pela largura do canvas.
 *
 * Números de trabalho baseados em leitura em tela de celular — a Meta não
 * publica tamanho de fonte. Ancorados em 1080px de largura e proporcionais
 * a partir daí.
 */
export function typeScaleFor(area: SafeArea) {
  const k = area.canvas.width / 1080;
  const px = (v: number) => Math.round(v * k);
  return {
    headlineMin: px(64),
    headlineMax: px(120),
    subheadMin: px(40),
    subheadMax: px(56),
    bodyMin: px(28),
    bodyMax: px(36),
    ctaMin: px(36),
    ctaMax: px(48),
  };
}
