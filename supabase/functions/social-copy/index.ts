import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { WAVY_COPY_SKILL } from "./wavy-skill.ts";

const MODEL = "claude-sonnet-5";

type PatternId = "1A" | "1B" | "2A" | "2B" | "3" | "4" | "5";

interface PatternReq {
  mode: "pattern";
  pattern_id: PatternId;
  tema: string;
  briefing: string;
  num_slides?: number;
  copy_referencia?: string;
  /** Prompt final montado no client (template editável/custom). Tem precedência. */
  template_prompt?: string;
}
interface RewriteReq {
  mode: "rewrite";
  slide: any;
  instrucao: string;
  contexto: { tema: string; pattern_id?: PatternId; formato?: string };
}
// Legacy compat — pipelines salvos
interface LegacyCarrosselReq {
  mode: "carrossel";
  formato: "carrossel_imagem" | "carrossel_texto" | "carrossel_lista";
  tema: string;
  briefing: string;
  num_slides: number;
  copy_referencia?: string;
}
interface LegacyPostUnicoReq { mode: "post_unico"; tema: string; briefing: string; copy_referencia?: string }
interface LegacyReelReq { mode: "reel"; tema: string; briefing: string; copy_referencia?: string }

type Req = PatternReq | RewriteReq | LegacyCarrosselReq | LegacyPostUnicoReq | LegacyReelReq;

const SYSTEM_RULES = `Você é o copywriter sênior da Wavy (IA-Driven Agency) para Instagram em PT-BR.
Siga RIGOROSAMENTE o guia Wavy abaixo. Voz, regras absolutas, formatos, psicologia e vocabulário são obrigatórios.
Sempre responda em JSON válido puro, sem markdown, sem texto fora do JSON.

${WAVY_COPY_SKILL}

LEMBRETES FINAIS:
- As regras do guia acima (voz, proibições, tom de proximidade) valem sempre, não são sugestões.
- Os exemplos de frase no guia mostram a ideia — não são frases para reciclar. Varie o fraseado entre slides e entre gerações diferentes do mesmo padrão.
- Hashtags específicas do nicho (tráfego/IA/agência), nunca genéricas.`;

// --------- Pattern prompts (1A · 1B · 2A · 2B · 3 · 4 · 5) ---------

const JSON_CARROSSEL = `{
  "slides": [
    { "tipo": "cover" | "problema" | "agitacao" | "solucao" | "lista" | "prova" | "cta",
      "titulo": "máx 60 chars",
      "corpo": "máx 180 chars",
      "visual_prompt": "descrição em inglês para gerar imagem do slide" }
  ],
  "legenda": "3-6 parágrafos curtos, com quebras de linha",
  "hashtags": ["#tag1", "#tag2"]
}`;

const JSON_REEL = `{
  "roteiro": [ { "tempo": "0-3s", "cena": "descrição visual", "fala": "fala/texto na tela" } ],
  "legenda": "...",
  "hashtags": ["#tag1"]
}`;

function anchorBlock(copy_referencia?: string): string {
  if (!copy_referencia?.trim()) return "";
  return `\n\nÂNCORA OBRIGATÓRIA — Copy original do post viral de referência:\n"""\n${copy_referencia.trim().slice(0, 3000)}\n"""\nREGRAS DE USO DA ÂNCORA:\n- O conteúdo gerado DEVE ser sobre o mesmo assunto específico desta copy\n- Use os mesmos dados, estatísticas e argumentos centrais presentes nela\n- NÃO invente casos, empresas ou números que não estejam no briefing ou na âncora\n- Adapte o ângulo narrativo para o padrão solicitado, mas mantenha o assunto real`;
}

function build1A(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 1A — CARROSSEL TUTORIAL (estilo Rony Meisler).
Crie ${n} slides sobre "${tema}".

FUNÇÃO DE CADA SLIDE (a estrutura é fixa; a frase exata é sua, não repita os exemplos literalmente):
- Slide 1 (cover): tipo="cover". Abre com a novidade ou promessa concreta do briefing. "BREAKING:" é uma opção quando o assunto é genuinamente novo, não uma fórmula pra repetir sempre. Corpo com urgência real, ancorada no briefing (não invente prazo/escassez que não está lá).
- Slides 2..${n - 2} (solucao): cada slide é um passo executável. Corpo: instrução direta 2-4 linhas.
- Slide ${n - 1} (agitacao OU prova): o tom vira mais pessoal, tipo quem já testou e vai contar o que ninguém conta. Reinterpreta o método com as palavras do briefing, não com uma frase pronta.
- Slide ${n} (cta): palavra-chave de comentário + urgência real do briefing (preço, prazo, vaga), só se estiver na copy de referência ou briefing.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build1B(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 1B — CARROSSEL CONFLITO DE DOIS MUNDOS (estilo Mazza Caio).
Crie ${n} slides sobre "${tema}".

FUNÇÃO DE CADA SLIDE:
- Slide 1 (cover): afirmação provocadora + pergunta que divide os leitores. O corpo convida a arrastar pro próximo slide, com suas próprias palavras.
- Slides 2-3 (problema/agitacao): nomeia o vilão (comportamento, sistema ou crença, NUNCA pessoa) com uma metáfora que faça sentido pro assunto real. "O problema não é você, é X" é um jeito de dizer isso, não repita em todo slide.
- Slide ${Math.max(3, Math.floor(n / 2)) + 1} (prova, tipo="prova"): contraste numérico. O corpo PRECISA ter separador "|" entre os 2 lados — o design renderiza em duas colunas a partir disso (ex: "R$ 30k investido, R$ 12k de volta | R$ 30k investido, R$ 180k de volta"). Use números reais do briefing; sem dado numérico disponível, use contraste qualitativo forte em vez de inventar número.
- Slide ${n - 1} (solucao): a revelação do que separa quem fica no cenário ruim de quem sai dele. Escreva do seu jeito.
- Slide ${n} (cta): palavra-chave de comentário.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build2A(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 2A — CARROSSEL STORYTELLING ANALÍTICO (estilo Leo BRF / caso Nestlé).
Crie ${n} slides sobre "${tema}". Priorize o assunto real do briefing como veículo da narrativa — só recorra a um caso de empresa famosa externa se o briefing não trouxer material suficiente.

FUNÇÃO DE CADA SLIDE:
- Slide 1 (cover): abre com o dado, mecanismo ou revelação central do briefing. "Como X fez Y e ninguém percebeu" é um formato possível, não o único.
- Slides 2..${n - 2} (solucao/lista/prova): título conceitual curto (máx 6 palavras). Corpo: 3-4 linhas encadeadas, jornalístico-analítico, cada slide expandindo o anterior. visual_prompt pede foto editorial real (Bloomberg, Wired, NYT).
- Penúltimo slide (solucao): expande — mostra onde o mesmo mecanismo aparece em outro contexto do mesmo nicho.
- Slide ${n} (cta): vira a câmera pro leitor com uma pergunta que incomoda a prática dele. Não pede follow.

Tom: jornalístico-analítico. Voz da Wavy (institucional, dados, ROAS/CAC quando couber).

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build2B(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 2B — CARROSSEL EDITORIAL DARK COM CINEMA (estilo Marketing Insider).
Crie ${n} slides sobre "${tema}". Tema filosófico ou de mentalidade.

FUNÇÃO DE CADA SLIDE:
- Slide 1 (cover): título provocador, mais longo, no rodapé. visual_prompt: foto real cotidiana (não pose), clima dark editorial.
- Slides 2..${n - 2} (problema/agitacao/solucao): manchete filosófica curta + 4-6 linhas. Uma analogia forte ajuda a ancorar o argumento no assunto real (não precisa em todo slide, e evite repetir a mesma estrutura de analogia toda vez). visual_prompt pode evocar clima de cinema, sem precisar citar um filme específico.
- Slide ${n - 1} (solucao): apresenta dois caminhos possíveis, ambos com custo real, sem fingir que existe opção sem trade-off.
- Slide ${n} (cta): palavra-chave. Tom maduro, sem pressa.

Voz: do Rael (pessoal, "eu já vi", "sendo honesto") OU institucional Wavy. Detecte pelo briefing.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build3(tema: string, briefing: string, copy_referencia?: string) {
  return `PADRÃO 3 — REEL 15-60s.
Tema: "${tema}".

ESTRUTURA TEMPORAL (duração de cada bloco é aproximada, mínimo 5 cenas):
- [0-3s] HOOK visual+verbal que gera conflito ou curiosidade real sobre o tema. Nunca abertura de palco tipo "oi pessoal, hoje eu vou falar sobre...".
- [3-15s] Agitação: nomeia o comportamento errado, sem solução ainda.
- [15-35s] Desenvolvimento: dados + mecanismo + insight, uma ideia por bloco.
- [35-50s] Virada: nova perspectiva que reinterpreta o problema.
- [50-60s] CTA específico e concreto, não "me segue" genérico.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_REEL}`;
}

function build4(tema: string, briefing: string, copy_referencia?: string) {
  return `PADRÃO 4 — POST FRASE.
Tema: "${tema}". Uma imagem única com frase forte + legenda longa.

- Retorne UM ÚNICO slide (tipo="cover").
- titulo: a frase mestre do post. Pode ser contraste em duas metades, diagnóstico direto ou pergunta que divide — escolha o que for mais natural pro assunto, não force um dos três moldes quando outro encaixa melhor.
- corpo: vazio ou complemento curtíssimo.
- visual_prompt: cena editorial real OU gradiente atmosférico.
- legenda com um arco em 5 movimentos (quebras de linha duplas entre eles):
  (1) Observação do mundo.
  (2) Aprofunda a dor. 3-5 linhas.
  (3) Nomeia o vilão (comportamento/crença). 1-3 linhas.
  (4) Virada. Reinterpretação. 2-4 linhas.
  (5) CTA como consequência lógica.
  Pode abrir na primeira pessoa quando for a voz do Rael — o que importa é não abrir batendo o CTA de cara.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build5(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 5 — CARROSSEL FRASE MESTRE LONGA.
Crie ${n} slides sobre "${tema}". Argumento ÚNICO desdobrado. Slides INTERDEPENDENTES (se inverter a ordem quebra).

FUNÇÃO DE CADA SLIDE:
- Slide 1 (cover): cover duplo. titulo = tese no topo. corpo = antítese embaixo. Ex: titulo "Todo mundo quer escalar" / corpo "Quase ninguém aguenta o que escalar exige" — é um exemplo de tensão, não a frase certa.
- Slides 2..${n - 2} (solucao): título bold curto no topo + frase causa-efeito embaixo (no corpo). visual_prompt: ícone central minimalista ou gradiente.
- Slide ${n - 1} (prova): virada com prova social numérica. O corpo PRECISA usar separador "|" entre os dados — o design renderiza em colunas a partir disso, até 3 dados: "número descrição | número descrição | número descrição".
- Slide ${n} (cta): conclusão que fecha o argumento. Mencione "Wavy Digital" só se o conteúdo for institucional ou o briefing indicar contexto de marca.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function buildPatternPrompt(p: PatternReq) {
  const n = p.num_slides || 7;
  switch (p.pattern_id) {
    case "1A": return build1A(p.tema, p.briefing, n, p.copy_referencia);
    case "1B": return build1B(p.tema, p.briefing, n, p.copy_referencia);
    case "2A": return build2A(p.tema, p.briefing, n, p.copy_referencia);
    case "2B": return build2B(p.tema, p.briefing, n, p.copy_referencia);
    case "3":  return build3(p.tema, p.briefing, p.copy_referencia);
    case "4":  return build4(p.tema, p.briefing, p.copy_referencia);
    case "5":  return build5(p.tema, p.briefing, n, p.copy_referencia);
  }
}

function legacyToPattern(req: LegacyCarrosselReq | LegacyPostUnicoReq | LegacyReelReq): PatternReq {
  if (req.mode === "post_unico") return { mode: "pattern", pattern_id: "4", tema: req.tema, briefing: req.briefing, copy_referencia: req.copy_referencia };
  if (req.mode === "reel") return { mode: "pattern", pattern_id: "3", tema: req.tema, briefing: req.briefing, copy_referencia: req.copy_referencia };
  const map: Record<string, PatternId> = {
    carrossel_imagem: "2A", carrossel_lista: "1A", carrossel_texto: "1B",
  };
  return { mode: "pattern", pattern_id: map[req.formato] || "2A", tema: req.tema, briefing: req.briefing, num_slides: req.num_slides, copy_referencia: req.copy_referencia };
}

function buildRewritePrompt(r: RewriteReq) {
  const ctx = r.contexto.pattern_id ? `pattern_id=${r.contexto.pattern_id}` : `formato=${r.contexto.formato || "n/a"}`;
  return `Reescreva este slide seguindo a instrução do usuário, mantendo o tom Wavy e o padrão narrativo.

Contexto: tema="${r.contexto.tema}", ${ctx}
Slide atual: ${JSON.stringify(r.slide)}
Instrução do usuário: ${r.instrucao}

Retorne JSON com o slide reescrito no mesmo formato (mantenha os mesmos campos).`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Req;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPrompt = "";
    let activePattern: PatternId | undefined;

    if (body.mode === "pattern") {
      activePattern = body.pattern_id;
      // Prompt final vindo do client (template editável ou custom) tem precedência.
      // Caso ausente, monta com os builders embutidos (compat).
      userPrompt = body.template_prompt?.trim()
        ? body.template_prompt.trim()
        : buildPatternPrompt(body);
    } else if (body.mode === "rewrite") {
      userPrompt = buildRewritePrompt(body);
    } else if (body.mode === "carrossel" || body.mode === "post_unico" || body.mode === "reel") {
      const promoted = legacyToPattern(body);
      activePattern = promoted.pattern_id;
      userPrompt = buildPatternPrompt(promoted);
    } else {
      return new Response(JSON.stringify({ error: "mode inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: body.mode === "rewrite" ? 800 : 3500,
        system: SYSTEM_RULES,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("anthropic error", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim()
      : "";

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("parse error", e, text);
      return new Response(JSON.stringify({ error: "Resposta do modelo não é JSON válido", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (activePattern) parsed.pattern_id = activePattern;

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-copy error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
