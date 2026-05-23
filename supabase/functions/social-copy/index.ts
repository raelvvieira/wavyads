import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { WAVY_COPY_SKILL } from "./wavy-skill.ts";

const MODEL = "claude-sonnet-4-20250514";

type PatternId = "1A" | "1B" | "2A" | "2B" | "3" | "4" | "5";

interface PatternReq {
  mode: "pattern";
  pattern_id: PatternId;
  tema: string;
  briefing: string;
  num_slides?: number;
  copy_referencia?: string;
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
- Nunca use travessões (—). Use vírgula ou ponto.
- Hook gera conflito/curiosidade, nunca "Você sabia que".
- Uma ideia por slide. Frases curtas. Sem jargão corporativo.
- CTA é consequência lógica, nunca pedido genérico.
- Hashtags específicas do nicho (tráfego/IA/agência), nunca genéricas.
- Toda copy passa pelas 5 etapas: Curiosidade → Identificação → Conflito → Reinterpretação → Ação.`;

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

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): tipo="cover". Título começando com "BREAKING:" + promessa concreta. Corpo com urgência tipo "Salva antes que todo concorrente seu use".
- Slides 2..${n - 2} (solucao): título começando com "Passo X: [verbo no infinitivo]". Corpo: instrução direta 2-4 linhas, executável.
- Slide ${n - 1} (agitacao OU prova): VIRADA CONFESSIONAL. Tom "sendo bem honesto..." ou "na verdade ninguém te conta...". Reinterpretação do método.
- Slide ${n} (cta): palavra-chave + ancoragem de preço + urgência. Ex: "Comenta MÉTODO. Próxima turma R$ 497, depois sobe."

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build1B(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 1B — CARROSSEL CONFLITO DE DOIS MUNDOS (estilo Mazza Caio).
Crie ${n} slides sobre "${tema}".

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): afirmação provocadora + pergunta que divide os leitores + corpo "Arrasta e aprenda →".
- Slides 2-3 (problema/agitacao): NOMEIA O VILÃO (comportamento, sistema ou crença, NUNCA pessoa) com metáfora forte. Use formato "O problema não é você. É [sistema/modelo/crença] que você foi ensinado a usar."
- Slide ${Math.max(3, Math.floor(n / 2)) + 1} (prova, tipo="prova"): SLIDE DE CONTRASTE NUMÉRICO. Título curto. Corpo OBRIGATORIAMENTE com separador "|" entre os 2 lados (ex: "R$ 30k investido. R$ 12k retorno | R$ 30k investido. R$ 180k retorno"). Dois personagens, mesma partida, resultados opostos.
- Slide ${n - 1} (solucao): REVELAÇÃO. "O que separa [A] de [B] não é [X], é [Y]."
- Slide ${n} (cta): palavra-chave de comentário. Ex: "Comenta MÉTODO".

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build2A(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 2A — CARROSSEL STORYTELLING ANALÍTICO (estilo Leo BRF / caso Nestlé).
Crie ${n} slides sobre "${tema}". Use CASO REAL de empresa como veículo para o princípio.

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): "Como [empresa real] fez [resultado específico] e ninguém percebeu" (ou estrutura similar).
- Slides 2..${n - 2} (solucao/lista/prova): título conceitual CURTO (máx 6 palavras, sem verbo OK). Corpo: 3-4 linhas encadeadas, jornalístico-analítico. Cada slide expande o anterior. visual_prompt sempre pede foto editorial real (Bloomberg, Wired, NYT).
- Penúltimo slide (solucao): EXPANSÃO. "O mesmo mecanismo aparece em [outro contexto inesperado]."
- Slide ${n} (cta): VIRA A CÂMERA para o leitor com pergunta que incomoda. Não pede follow, faz refletir.

Tom: jornalístico-analítico. Voz da Wavy (institucional, dados, ROAS/CAC quando couber).

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build2B(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 2B — CARROSSEL EDITORIAL DARK COM CINEMA (estilo Marketing Insider).
Crie ${n} slides sobre "${tema}". Tema filosófico ou de mentalidade.

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): título PROVOCADOR LONGO no rodapé. visual_prompt: foto real cotidiana (não pose), clima dark editorial.
- Slides 2..${n - 2} (problema/agitacao/solucao): manchete FILOSÓFICA curta + 4-6 linhas com PELO MENOS UMA ANALOGIA poderosa por slide (ex: "Gestor sem dado é arquiteto sem planta" / "Testar sem método é atirar no escuro"). visual_prompt cita cena de filme icônico (Blade Runner, Ex Machina, Mad Men, Wolf of Wall Street) — clima, não literal.
- Slide ${n - 1} (solucao): SLIDE DE ESCOLHA. Apresenta dois caminhos, AMBOS com custo. "Pagar barato e aprender no erro, OU pagar caro e pular o erro. As duas custam."
- Slide ${n} (cta): palavra-chave. Tom maduro, clareza cansada.

Voz: do Rael (pessoal, "eu já vi", "sendo honesto") OU institucional Wavy. Detecte pelo briefing.

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build3(tema: string, briefing: string, copy_referencia?: string) {
  return `PADRÃO 3 — REEL 15-60s.
Tema: "${tema}".

ESTRUTURA TEMPORAL OBRIGATÓRIA (mínimo 5 cenas):
- [0-3s] HOOK visual+verbal. NUNCA "oi pessoal". Use: afirmação polêmica, pergunta que dói, dado chocante OU "BREAKING:".
- [3-15s] AGITAÇÃO. Nomeia o comportamento errado. Sem solução ainda.
- [15-35s] DESENVOLVIMENTO. Dados + mecanismo + insight. Uma ideia por bloco.
- [35-50s] VIRADA. Nova perspectiva que reinterpreta o problema.
- [50-60s] CTA específico (não "me segue"). Ex: "Salva porque você vai precisar quando escalar."

Briefing:
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_REEL}`;
}

function build4(tema: string, briefing: string, copy_referencia?: string) {
  return `PADRÃO 4 — POST FRASE.
Tema: "${tema}". Uma imagem única com FRASE FORTE + legenda longa.

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
${briefing}${anchorBlock(copy_referencia)}

Retorne JSON:
${JSON_CARROSSEL}`;
}

function build5(tema: string, briefing: string, n: number, copy_referencia?: string) {
  return `PADRÃO 5 — CARROSSEL FRASE MESTRE LONGA.
Crie ${n} slides sobre "${tema}". Argumento ÚNICO desdobrado. Slides INTERDEPENDENTES (se inverter a ordem quebra).

ESTRUTURA OBRIGATÓRIA:
- Slide 1 (cover): COVER DUPLO. titulo = TESE no topo. corpo = ANTÍTESE embaixo. Ex: titulo "Todo mundo quer escalar" / corpo "Quase ninguém aguenta o que escalar exige".
- Slides 2..${n - 2} (solucao): título BOLD curto no topo + frase causa-efeito embaixo (no corpo). visual_prompt: ícone central minimalista ou gradiente.
- Slide ${n - 1} (prova): VIRADA com PROVA SOCIAL NUMÉRICA. Corpo no formato "número descrição | número descrição | número descrição" (separador "|", até 3 dados).
- Slide ${n} (cta): CONCLUSÃO sintética + logo Wavy (mencione "Wavy Digital" no corpo).

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
      userPrompt = buildPatternPrompt(body);
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
