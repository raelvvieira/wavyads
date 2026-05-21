/**
 * WAVY IMAGE SKILL — Server-side prompt builder
 * Constrói prompt completo de 12 camadas para Gemini com base em estilo + slide + template.
 */

export type WavyPath = "ia" | "upload";

export interface StyleSpec {
  id: string;
  nome: string;
  caminho: WavyPath;
  /** Template base do prompt — placeholders {TEMA}, {SUJEITO}, {TITULO}, {CORPO}, {VISUAL_PROMPT}, {ESTILO_GLOBAL} */
  promptTemplate: string;
}

const COMMON_TAIL = `
No text, no watermark, no logo, no AI artifacts, no extra fingers, no distorted faces.
Photorealistic only — not illustrated, not painterly.`;

export const STYLES: Record<string, StyleSpec> = {
  ceo_hiperreal: {
    id: "ceo_hiperreal",
    nome: "CEO Hiper-realista",
    caminho: "ia",
    promptTemplate: `[TIPO] Hyperrealistic editorial photograph, photojournalism quality, indistinguishable from a real photo.
[SUJEITO] {SUJEITO} — derived from this brief: "{VISUAL_PROMPT}". If a real public figure is named (Zuckerberg, Jensen Huang, Sam Altman, Tim Cook, Sundar Pichai, Satya Nadella, Elon Musk, Bezos, etc.) render that exact person with accurate features and signature attire.
[SITUAÇÃO] Specific, improbable, narrative situation related to: {TITULO}. {CORPO}.
[ÂNGULO] Eye level, three-quarter angle, subject at rule-of-thirds.
[AMBIENTE] Editorial corporate or tech environment with cinematic depth; bokeh background; tema: {TEMA}.
[ILUMINAÇÃO] Cinematic lighting: hard key from one direction, subtle rim light, practical lights as bokeh; chiaroscuro mood, mixed warm-cool palette.
[EXPRESSÃO] Intense focused concentration or slight knowing smile, body language confident.
[CÂMERA] Shot on Sony A7R V or Canon EOS R5, 85mm f/1.4 or 50mm f/1.2.
[FOCO] Shallow DoF, ultra-sharp on eyes and face, smooth creamy bokeh.
[GRADAÇÃO] Deep crushed blacks, warm skin, cool environmental shadows, subtle 35mm grain.
[REFERÊNCIA] Bloomberg Businessweek / TIME / Platon / Wired magazine editorial portrait.
[ESTILO GLOBAL OPCIONAL] {ESTILO_GLOBAL}.${COMMON_TAIL}`,
  },
  cinematico: {
    id: "cinematico",
    nome: "Cinematográfico Dramático",
    caminho: "ia",
    promptTemplate: `Cinematic photograph, Hollywood feature film production quality, anamorphic lens aesthetic.
Scene: dramatic sci-fi or thriller scene based on "{VISUAL_PROMPT}" — robot, AI, futuristic environment or human figure in epic-scale situation related to {TITULO}.
Context: {CORPO}. Tema: {TEMA}.
Camera: low angle, shooting upward 25 degrees, subject centered, shot from distance for scale.
Setting: vast industrial or futuristic space, symmetrical composition, deep darkness with selective light pools.
Lighting: single dramatic warning light or screen glow as primary (warm amber 2500K or cool 8000K), 95% darkness, extreme chiaroscuro, anamorphic horizontal lens flares.
Mood: eerie stillness, power without aggression, the silence before change.
Shot on ARRI Alexa Mini LF, Cooke Anamorphic 50mm T2.3.
Color grade: warm amber and deep black dominant, cool blue accent, crushed blacks, heavy cinematic 35mm grain.
Reference: Ex Machina, Blade Runner 2049, Westworld, Roger Deakins cinematography.
{ESTILO_GLOBAL}.${COMMON_TAIL}`,
  },
  editorial_real: {
    id: "editorial_real",
    nome: "Editorial de Pessoa Real",
    caminho: "upload",
    promptTemplate: `[UPLOAD ONLY — não gerar via IA]
Foto editorial real, lifestyle Fast Company.
Sujeito: {SUJEITO}. Cena: {VISUAL_PROMPT}.
Composição ideal: três-quartos lateral, meio-corpo, olhar para a tela ou pensativo, expressão focada.
Iluminação: janela lateral natural + fill do monitor.
Tema: {TEMA}.${COMMON_TAIL}`,
  },
  objeto_premium: {
    id: "objeto_premium",
    nome: "Objeto Premium Isolado",
    caminho: "ia",
    promptTemplate: `Extreme macro photograph, luxury product photography, Hodinkee magazine editorial quality.
Subject: premium object derived from "{VISUAL_PROMPT}" — could be a Rolex dial, car interior detail, gold/steel material macro. Context: {TITULO}. {CORPO}. Tema: {TEMA}.
Camera: directly overhead 90 degrees, slight 5-degree tilt, subject occupies 60-70% of frame.
Setting: dark leather or matte black surface, no other objects.
Lighting: single soft box upper-left 45 degrees, warm tungsten 3200K, subtle silver reflector from right, tiny catch lights on polished edges.
Focus: needle-sharp on one critical point, smooth creamy bokeh on rest.
Color grade: warm rich amber on gold, cool silver-steel on metal, deep rich black, no over-saturation, no grain.
Reference: Hodinkee, Wallpaper magazine automotive.
{ESTILO_GLOBAL}.${COMMON_TAIL}`,
  },
  marca_organica: {
    id: "marca_organica",
    nome: "Composição com Marca",
    caminho: "ia",
    promptTemplate: `Hyperrealistic editorial photograph, product launch campaign quality.
Scene: person or environment with brand element integrated organically into the reality of the frame — based on "{VISUAL_PROMPT}". Context: {TITULO}. {CORPO}. Tema: {TEMA}.
The brand artifact (logo, interface, device) is part of the physical scene, not a graphic overlay.
Camera: three-quarter angle, eye level, subject at rule-of-thirds, natural backlit composition.
Lighting: natural daylight 5600K window backlight, bounced fill, optional self-illuminated device screen.
Shot on Sony A7R V, 50mm f/1.4.
Shallow DoF, ultra-sharp on the branded element, creamy bokeh background.
Color grade: bright airy natural daylight, warm skin tones, no crushed blacks, clean digital.
Reference: Apple product photography, The Verge editorial.
{ESTILO_GLOBAL}.${COMMON_TAIL}`,
  },
  gradiente_atmosferico: {
    id: "gradiente_atmosferico",
    nome: "Gradiente Atmosférico",
    caminho: "ia",
    promptTemplate: `Abstract atmospheric photographic background, no objects, no people, no recognizable shapes, no text.
Composition: pure gradient and light derived from mood "{VISUAL_PROMPT}". Tema: {TEMA}. Context: {TITULO} — {CORPO}.
Dominant color transitioning to near-black; depth and cloud-like texture, like ink in water.
Single soft implied light source creating gentle radial gradient.
Texture: heavy cinematic 35mm film grain, organic and irregular.
Subtle natural vignette.
Shot on 4x5 large format film, pushed 2 stops.
Abstract color field photography.${COMMON_TAIL}
Absolutely no objects, shapes, people, or text. Pure atmosphere only.`,
  },
  workspace_tech: {
    id: "workspace_tech",
    nome: "Workspace Tech",
    caminho: "ia",
    promptTemplate: `Editorial photograph, Wired magazine quality, technology workspace photography.
Scene: premium dark workspace based on "{VISUAL_PROMPT}" — could be desk setup with Meta Ads dashboard, data center corridor, monitors with metrics. Context: {TITULO}. {CORPO}. Tema: {TEMA}.
No identifiable faces — at most a single pair of hands near keyboard for human scale.
Camera: slightly elevated 15 degrees above desk level, or low angle architectural for data centers.
Lighting: dual cool blue-white 6200K monitor glow + warm amber 2700K desk lamp at 30 degrees from upper-right, subtle underglow.
Shot on Sony A7R V, 35mm f/1.8.
DoF: foreground slightly soft, monitor sharpest, background soft blur.
Color grade: cool blue dominant from monitors, warm amber accent, deep blacks, high contrast, slight teal in shadows, moderate saturation, subtle digital grain.
Reference: Wired workspace photography, Bloomberg tech infrastructure.
{ESTILO_GLOBAL}.${COMMON_TAIL}
Monitor content visible as shapes/colors — not individually readable. No visible brand names on hardware.`,
  },
  resultado_numero: {
    id: "resultado_numero",
    nome: "Resultado com Número",
    caminho: "upload",
    promptTemplate: `[UPLOAD ONLY — sempre use foto real, screenshot real do Ads Manager ou WhatsApp]
Composição: busto ou screenshot real, 30% inferior mais escuro para sobreposição do número.
Tema: {TEMA}. Contexto: {TITULO} — {CORPO}.
Visual: {VISUAL_PROMPT}.
O número real sempre supera qualquer imagem gerada.`,
  },
  pessoa_pequena: {
    id: "pessoa_pequena",
    nome: "Pessoa Pequena em Espaço Grande",
    caminho: "ia",
    promptTemplate: `Fine art architectural editorial photograph, Gregory Crewdson meets architectural photography.
Scene: vast architectural space at golden hour or twilight, a single small human figure (dark clothing, back to camera, 10-15% of frame height) standing still in the center. Based on "{VISUAL_PROMPT}". Context: {TITULO}. {CORPO}. Tema: {TEMA}.
Camera: ground level, 25 feet behind figure, figure centered.
Setting: corporate tower lobby, atrium, or massive industrial space — 60ft wide, 40ft tall, polished black marble floor, floor-to-ceiling glass with city skyline beyond.
Lighting: warm amber 2800K exterior ambient through glass + cool 5000K interior recessed; figure partially silhouetted with warm rim.
Shot on Phase One XF IQ4 150MP, 28mm f/5.6.
DoF: everything in focus, slight motion blur on distant city for atmosphere.
Color grade: warm amber exterior + cool gray-blue interior, rich contrast, no grain.
Reference: Gregory Crewdson, Iwan Baan architectural.
{ESTILO_GLOBAL}.${COMMON_TAIL}
The figure must be small — no more than 15% of frame height.`,
  },
  macro_abstrato: {
    id: "macro_abstrato",
    nome: "Macro Abstrato",
    caminho: "ia",
    promptTemplate: `Extreme macro fine art photograph, abstract luxury photography.
Subject: a cut diamond, crystal, gold surface, or premium material derived from "{VISUAL_PROMPT}" — object reduced to pure geometry of light. Context: {TITULO}. {CORPO}. Tema: {TEMA}.
Camera: directly overhead 90 degrees, tilted 15 degrees for asymmetry.
Background: pure deep black, absolute darkness.
80% of frame is bokeh circles (blue, white, amber); 20% is one needle-sharp facet intersection.
Lighting: single-point fiber optic upper-left 30 degrees 6500K + cold blue reflector from right + subtle warm amber accent below.
Shot on Canon EOS R5, 100mm f/2.8L Macro IS USM with extension tube for 1.5:1 magnification.
DoF: 0.3mm — only one point in focus.
Color palette: pure white, cold blue, warm amber, against absolute black — four colors maximum.
No grain, no grade — lighting creates palette.
Reference: Torkil Gudnason, Cartier macro advertising.
{ESTILO_GLOBAL}.${COMMON_TAIL}`,
  },
};

const TEMPLATE_SUFFIXES: Record<string, string> = {
  template_1_cover:
    "\n\nCOMPOSITION: Vertical 3:4 portrait 1080x1350px. Top 15% darker/less detail for title. Bottom 15% darker for navigation.",
  template_1_content:
    "\n\nCOMPOSITION: Vertical 3:4 portrait. High contrast, dark mood. Subject centered or rule-of-thirds.",
  post_frase_a:
    "\n\nCOMPOSITION: Vertical 3:4. Dark atmospheric. Subject at edges; center 40% must have breathing room for large text overlay.",
  post_frase_b:
    "\n\nCOMPOSITION: Vertical 3:4. Bright airy warm. Lower-right area lighter/simpler for contrasting dark text.",
  post_frase_cd:
    "\n\nCOMPOSITION: Vertical 3:4. Person upper 60-65%. Lower 35-40% transitions to darker simpler area for text overlay.",
  template_4_virada:
    "\n\nCOMPOSITION: Vertical 3:4. Subject fills top 55%. Lower 40% darker simpler area for numerical data overlay.",
};

export function buildWavyPrompt(params: {
  style_id?: string;
  template_id?: string;
  visual_prompt: string;
  tema: string;
  slide_titulo?: string;
  slide_corpo?: string;
  sujeito?: string;
  estilo_global?: string;
}): { prompt: string; style_id: string; caminho: WavyPath } {
  const style = STYLES[params.style_id || ""] || STYLES.gradiente_atmosferico;
  const suffix = TEMPLATE_SUFFIXES[params.template_id || ""] || TEMPLATE_SUFFIXES.template_1_cover;
  const filled = style.promptTemplate
    .replace(/\{VISUAL_PROMPT\}/g, params.visual_prompt || "")
    .replace(/\{TEMA\}/g, params.tema || "")
    .replace(/\{TITULO\}/g, params.slide_titulo || "")
    .replace(/\{CORPO\}/g, params.slide_corpo || "")
    .replace(/\{SUJEITO\}/g, params.sujeito || params.visual_prompt || "the main subject")
    .replace(/\{ESTILO_GLOBAL\}/g, params.estilo_global || "");
  return { prompt: filled + suffix, style_id: style.id, caminho: style.caminho };
}
