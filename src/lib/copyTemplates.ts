/**
 * COPY TEMPLATES — Social Mídia Studio (Etapa 3)
 *
 * Cada template carrega o "texto que define o template": o promptBody editável
 * que estrutura a geração da copy. É editável no painel "Editar Templates" e
 * persistido em social_copy_templates. Templates novos criados pelo usuário
 * entram nas opções e alimentam toda a pipeline.
 *
 * baseLayout aponta para um pattern real (1A/1B/2A/2B/4/5) usado pelas etapas
 * seguintes (imagens/design) — assim custom templates renderizam sem refactor
 * de tipos. O promptBody é o que muda de fato a copy gerada.
 *
 * Placeholders no promptBody: {N} total de slides, {N1}=N-1, {N2}=N-2,
 * {METADE} slide do meio, {TEMA}, {BRIEFING}, {ANCORA}.
 */
import type { CopyPatternId } from "@/types/social";

export type PreviewLayout = "cover" | "steps" | "contrast" | "statement" | "cta" | "single" | "reel";

export interface PreviewSlide {
  role: string;
  layout: PreviewLayout;
  hasImage: boolean;
}

export interface CopyTemplate {
  /** Chave estável: "1A".."5" para defaults; "custom-xxxx" para novos. */
  key: string;
  nome: string;
  emoji: string;
  preview: string; // gradiente CSS
  carrossel: boolean;
  slidesMin: number;
  slidesMax: number;
  slidesDefault: number;
  /** Pattern real usado por imagens/design (custom herda um layout base). */
  baseLayout: CopyPatternId;
  /** Texto editável que estrutura a geração de copy. */
  promptBody: string;
  /** Esquema visual do preview (visualização apenas). */
  structure: PreviewSlide[];
  /** true = template embutido (pode ser editado, não deletado). */
  builtin: boolean;
  /** Código React custom do design. Vazio/undefined = usa o layout embutido (baseLayout). */
  designCode?: string;
}

export const JSON_CARROSSEL = `{
  "slides": [
    { "tipo": "cover" | "problema" | "agitacao" | "solucao" | "lista" | "prova" | "cta",
      "titulo": "máx 60 chars",
      "corpo": "máx 180 chars",
      "visual_prompt": "descrição em inglês para gerar imagem do slide" }
  ],
  "legenda": "3-6 parágrafos curtos, com quebras de linha",
  "hashtags": ["#tag1", "#tag2"]
}`;

export const JSON_REEL = `{
  "roteiro": [ { "tempo": "0-3s", "cena": "descrição visual", "fala": "fala/texto na tela" } ],
  "legenda": "...",
  "hashtags": ["#tag1"]
}`;

const contentSlides = (n: number, layout: PreviewLayout, hasImage: boolean): PreviewSlide[] =>
  Array.from({ length: n }, (_, i) => ({ role: `Slide ${i + 2}`, layout, hasImage }));

export const DEFAULT_TEMPLATES: CopyTemplate[] = [
  {
    key: "1A",
    nome: "1A · Tutorial",
    emoji: "⚡",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A0A0A 60%,#3D1414 100%)",
    carrossel: true,
    slidesMin: 5, slidesMax: 8, slidesDefault: 6,
    baseLayout: "1A",
    builtin: true,
    structure: [
      { role: "Capa", layout: "cover", hasImage: true },
      ...contentSlides(3, "steps", false),
      { role: "Virada", layout: "statement", hasImage: true },
      { role: "CTA", layout: "cta", hasImage: false },
    ],
    promptBody: `PADRÃO 1A — CARROSSEL TUTORIAL (estilo Rony Meisler).
Crie {N} slides sobre "{TEMA}".

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): tipo="cover". Título começando com "BREAKING:" + promessa concreta. Corpo com urgência tipo "Salva antes que todo concorrente seu use".
- Slides 2..{N2} (solucao): título começando com "Passo X: [verbo no infinitivo]". Corpo: instrução direta 2-4 linhas, executável.
- Slide {N1} (agitacao OU prova): VIRADA CONFESSIONAL. Tom "sendo bem honesto..." ou "na verdade ninguém te conta...". Reinterpretação do método.
- Slide {N} (cta): palavra-chave + ancoragem de preço + urgência. Ex: "Comenta MÉTODO. Próxima turma R$ 497, depois sobe."

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "1B",
    nome: "1B · Conflito",
    emoji: "⚡",
    preview: "linear-gradient(135deg,#F5F2EE 0%,#FD4638 100%)",
    carrossel: true,
    slidesMin: 5, slidesMax: 8, slidesDefault: 6,
    baseLayout: "1B",
    builtin: true,
    structure: [
      { role: "Capa", layout: "cover", hasImage: true },
      ...contentSlides(2, "statement", false),
      { role: "Contraste", layout: "contrast", hasImage: false },
      { role: "Revelação", layout: "statement", hasImage: true },
      { role: "CTA", layout: "cta", hasImage: false },
    ],
    promptBody: `PADRÃO 1B — CARROSSEL CONFLITO DE DOIS MUNDOS (estilo Mazza Caio).
Crie {N} slides sobre "{TEMA}".

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): afirmação provocadora + pergunta que divide os leitores + corpo "Arrasta e aprenda →".
- Slides 2-3 (problema/agitacao): NOMEIA O VILÃO (comportamento, sistema ou crença, NUNCA pessoa) com metáfora forte. Use formato "O problema não é você. É [sistema/modelo/crença] que você foi ensinado a usar."
- Slide {METADE} (prova, tipo="prova"): SLIDE DE CONTRASTE NUMÉRICO. Título curto. Corpo OBRIGATORIAMENTE com separador "|" entre os 2 lados (ex: "R$ 30k investido. R$ 12k retorno | R$ 30k investido. R$ 180k retorno"). Dois personagens, mesma partida, resultados opostos.
- Slide {N1} (solucao): REVELAÇÃO. "O que separa [A] de [B] não é [X], é [Y]."
- Slide {N} (cta): palavra-chave de comentário. Ex: "Comenta MÉTODO".

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "2A",
    nome: "2A · Storytelling",
    emoji: "📖",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    carrossel: true,
    slidesMin: 6, slidesMax: 10, slidesDefault: 7,
    baseLayout: "2A",
    builtin: true,
    structure: [
      { role: "Capa", layout: "cover", hasImage: true },
      ...contentSlides(4, "statement", true),
      { role: "Expansão", layout: "statement", hasImage: true },
      { role: "CTA", layout: "cta", hasImage: false },
    ],
    promptBody: `PADRÃO 2A — CARROSSEL STORYTELLING ANALÍTICO (estilo Leo BRF / caso Nestlé).
Crie {N} slides sobre "{TEMA}". Use CASO REAL de empresa como veículo para o princípio.

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): "Como [empresa real] fez [resultado específico] e ninguém percebeu" (ou estrutura similar).
- Slides 2..{N2} (solucao/lista/prova): título conceitual CURTO (máx 6 palavras, sem verbo OK). Corpo: 3-4 linhas encadeadas, jornalístico-analítico. Cada slide expande o anterior. visual_prompt sempre pede foto editorial real (Bloomberg, Wired, NYT).
- Penúltimo slide (solucao): EXPANSÃO. "O mesmo mecanismo aparece em [outro contexto inesperado]."
- Slide {N} (cta): VIRA A CÂMERA para o leitor com pergunta que incomoda. Não pede follow, faz refletir.

Tom: jornalístico-analítico. Voz da Wavy (institucional, dados, ROAS/CAC quando couber).

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "2B",
    nome: "2B · Editorial Dark",
    emoji: "📖",
    preview: "linear-gradient(160deg,#0D1B2A 0%,#1A2D40 45%,#0A0F14 100%)",
    carrossel: true,
    slidesMin: 6, slidesMax: 10, slidesDefault: 7,
    baseLayout: "2B",
    builtin: true,
    structure: [
      { role: "Capa", layout: "cover", hasImage: true },
      ...contentSlides(4, "statement", true),
      { role: "Escolha", layout: "contrast", hasImage: true },
      { role: "CTA", layout: "cta", hasImage: false },
    ],
    promptBody: `PADRÃO 2B — CARROSSEL EDITORIAL DARK COM CINEMA (estilo Marketing Insider).
Crie {N} slides sobre "{TEMA}". Tema filosófico ou de mentalidade.

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): título PROVOCADOR LONGO no rodapé. visual_prompt: foto real cotidiana (não pose), clima dark editorial.
- Slides 2..{N2} (problema/agitacao/solucao): manchete FILOSÓFICA curta + 4-6 linhas com PELO MENOS UMA ANALOGIA poderosa por slide (ex: "Gestor sem dado é arquiteto sem planta" / "Testar sem método é atirar no escuro"). visual_prompt cita cena de filme icônico (Blade Runner, Ex Machina, Mad Men, Wolf of Wall Street) — clima, não literal.
- Slide {N1} (solucao): SLIDE DE ESCOLHA. Apresenta dois caminhos, AMBOS com custo. "Pagar barato e aprender no erro, OU pagar caro e pular o erro. As duas custam."
- Slide {N} (cta): palavra-chave. Tom maduro, clareza cansada.

Voz: do Rael (pessoal, "eu já vi", "sendo honesto") OU institucional Wavy. Detecte pelo briefing.

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "3",
    nome: "3 · Reel",
    emoji: "🎬",
    preview: "linear-gradient(135deg,#0D1B2A 0%,#1A2D40 50%,#FD4638 100%)",
    carrossel: false,
    slidesMin: 0, slidesMax: 0, slidesDefault: 0,
    baseLayout: "3",
    builtin: true,
    structure: [{ role: "Roteiro do reel", layout: "reel", hasImage: false }],
    promptBody: `PADRÃO 3 — REEL 15-60s.
Tema: "{TEMA}".

ESTRUTURA TEMPORAL OBRIGATÓRIA (mínimo 5 cenas):
- [0-3s] HOOK visual+verbal. NUNCA "oi pessoal". Use: afirmação polêmica, pergunta que dói, dado chocante OU "BREAKING:".
- [3-15s] AGITAÇÃO. Nomeia o comportamento errado. Sem solução ainda.
- [15-35s] DESENVOLVIMENTO. Dados + mecanismo + insight. Uma ideia por bloco.
- [35-50s] VIRADA. Nova perspectiva que reinterpreta o problema.
- [50-60s] CTA específico (não "me segue"). Ex: "Salva porque você vai precisar quando escalar."

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "4",
    nome: "4 · Post Frase",
    emoji: "🎯",
    preview: "linear-gradient(135deg,#0A0A0A 0%,#1A2D40 55%,#FD4638 100%)",
    carrossel: false,
    slidesMin: 1, slidesMax: 1, slidesDefault: 1,
    baseLayout: "4",
    builtin: true,
    structure: [{ role: "Post único", layout: "single", hasImage: true }],
    promptBody: `PADRÃO 4 — POST FRASE.
Tema: "{TEMA}". Uma imagem única com FRASE FORTE + legenda longa.

ESTRUTURA OBRIGATÓRIA:
- Retorne UM ÚNICO slide (tipo="cover").
- titulo: a frase mestre. Use UM dos 3 padrões:
  (a) Contraste em duas metades: "Todo mundo tem potencial. Poucos têm disciplina."
  (b) Diagnóstico direto: "Sem previsibilidade, você está brincando de negócios."
  (c) Pergunta que divide: "Sua agência está crescendo ou só ficando mais ocupada?"
- corpo: vazio ou complemento curtíssimo.
- visual_prompt: cena editorial real OU gradiente atmosférico.
- legenda OBRIGATÓRIA em 5 MOVIMENTOS (quebras de linha duplas entre eles):
  (1) Observação do mundo. NUNCA começa com "eu".
  (2) Aprofunda a dor. 3-5 linhas.
  (3) Nomeia o vilão (comportamento/crença). 1-3 linhas.
  (4) Virada. Reinterpretação. 2-4 linhas.
  (5) CTA como consequência lógica.

Briefing:
{BRIEFING}{ANCORA}`,
  },
  {
    key: "5",
    nome: "5 · Frase Mestre",
    emoji: "🧠",
    preview: "linear-gradient(135deg,#0D1520 0%,#1A2535 45%,#F5F2EE 100%)",
    carrossel: true,
    slidesMin: 6, slidesMax: 9, slidesDefault: 7,
    baseLayout: "5",
    builtin: true,
    structure: [
      { role: "Cover duplo", layout: "cover", hasImage: false },
      ...contentSlides(4, "statement", false),
      { role: "Prova", layout: "contrast", hasImage: true },
      { role: "CTA", layout: "cta", hasImage: false },
    ],
    promptBody: `PADRÃO 5 — CARROSSEL FRASE MESTRE LONGA.
Crie {N} slides sobre "{TEMA}". Argumento ÚNICO desdobrado. Slides INTERDEPENDENTES (se inverter a ordem quebra).

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): COVER DUPLO. titulo = TESE no topo. corpo = ANTÍTESE embaixo. Ex: titulo "Todo mundo quer escalar" / corpo "Quase ninguém aguenta o que escalar exige".
- Slides 2..{N2} (solucao): título BOLD curto no topo + frase causa-efeito embaixo (no corpo). visual_prompt: ícone central minimalista ou gradiente.
- Slide {N1} (prova): VIRADA com PROVA SOCIAL NUMÉRICA. Corpo no formato "número descrição | número descrição | número descrição" (separador "|", até 3 dados).
- Slide {N} (cta): CONCLUSÃO sintética + logo Wavy (mencione "Wavy Digital" no corpo).

Briefing:
{BRIEFING}{ANCORA}`,
  },
];

export function getTemplate(key: string, templates: CopyTemplate[] = DEFAULT_TEMPLATES): CopyTemplate | undefined {
  return templates.find((t) => t.key === key);
}

function anchorBlock(copy_referencia?: string): string {
  if (!copy_referencia?.trim()) return "";
  return `\n\nÂNCORA OBRIGATÓRIA — Copy original do post viral de referência:\n"""\n${copy_referencia.trim().slice(0, 3000)}\n"""\nREGRAS DE USO DA ÂNCORA:\n- O conteúdo gerado DEVE ser sobre o mesmo assunto específico desta copy\n- Use os mesmos dados, estatísticas e argumentos centrais presentes nela\n- NÃO invente casos, empresas ou números que não estejam no briefing ou na âncora\n- Adapte o ângulo narrativo para o padrão solicitado, mas mantenha o assunto real`;
}

/**
 * Monta o prompt final de copy a partir do promptBody (editável) do template,
 * preenchendo placeholders e anexando o formato JSON esperado.
 */
export function buildCopyPrompt(template: CopyTemplate, params: {
  tema: string;
  briefing: string;
  num_slides?: number;
  copy_referencia?: string;
}): string {
  const n = params.num_slides || template.slidesDefault || 7;
  const vals: Record<string, string> = {
    N: String(n),
    N1: String(n - 1),
    N2: String(n - 2),
    METADE: String(Math.max(3, Math.floor(n / 2)) + 1),
    TEMA: params.tema || "",
    BRIEFING: params.briefing || "",
    ANCORA: anchorBlock(params.copy_referencia),
  };
  const filled = template.promptBody.replace(
    /\{(N2|N1|N|METADE|TEMA|BRIEFING|ANCORA)\}/g,
    (_m, key) => vals[key] ?? "",
  );
  const jsonBlock = template.baseLayout === "3" ? JSON_REEL : JSON_CARROSSEL;
  return `${filled}\n\nRetorne JSON:\n${jsonBlock}`;
}
