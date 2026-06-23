import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SKILL = `# FATOR CRIATIVO — Algoritmo de Variação Criativa para Meta Ads

Sistema que, a partir de UM criativo original aprovado, gera 5 variações estratégicas genuinamente distintas. O objetivo é alimentar o Meta Andromeda com sinais variados para alcançar segmentos diferentes do público.

## OS 5 EIXOS (uma variação por eixo, NA ORDEM)

EIXO 1 — ÂNGULO EMOCIONAL
Os 6 ângulos: Dor, Medo de perder, Aspiração, Pertencimento, Curiosidade, Validação.
Identifique qual o original usou e escolha um diferente. Reescreva a copy inteira a partir desse novo ângulo.

EIXO 2 — ÂNGULO DE OFERTA
Os 6 frames: Escassez real, Exclusividade, Transformação, Valor vs preço, Facilidade/velocidade, Garantia/segurança.
Identifique o frame do original e use outro. A copy gira inteiramente em torno do novo frame; o visual reforça (ex: escassez → "2 VAGAS RESTANTES" como elemento dominante).

EIXO 3 — PERSONA / RECEPTOR
Personas típicas: Iniciante, Intermediário estagnado, Avançado buscando diferenciação, Empreendedor da área (adapte ao nicho real do briefing).
Identifique a persona do original e fale com OUTRA. Use a linguagem, dores e aspirações específicas dessa persona.

EIXO 4 — HOOK VISUAL
Os 6 hooks: Rosto com expressão real, Resultado concreto, Problema visualizado, Detalhe técnico, Contraste antes/depois, Texto como hook dominante.
Identifique o hook do original e use outro. O hook é o elemento visual DOMINANTE do criativo.

EIXO 5 — ESTRUTURA DE COPY
A) PAS (Problema → Agitação → Solução)
B) Benefício direto → Prova → CTA
C) Curiosidade → Revelação → CTA
D) Prova social → Identificação → CTA
E) Declaração bold → Contexto → CTA
Identifique a estrutura do original e use outra. Reescreva toda a copy nessa nova estrutura.

## REGRAS DE DESIGN (DNA da marca preservado)

Em TODAS as 5 variações:
- Manter paleta de cores, tipografia, logo, glassmorphism e safe zones do criativo original
- Manter idioma do texto da arte
- Pode variar: composição, dominância de cor, hook visual, intensidade de gradiente

## REGRAS DE VARIAÇÃO GENUÍNA

Cada criativo deve ser diferente do original em pelo menos 2 destas dimensões: Mensagem, Visual, Tom, Receptor.
Variação superficial (só mudar cor/fonte) NÃO conta. Cada variação deve ser estrategicamente distinta.

## OUTPUT

Para cada um dos 5 criativos, gere:
- copy estruturada nova (label, titulo, subtitulo, dados, cta) — em PT-BR/EN/ES conforme o original
- descrição visual (hook, composição, tom, diferença vs original)
- promptCompleto: PROMPT INTEIRO PRONTO para o gerador de imagem Nano Banana, no MESMO formato do prompt original (com blocos [INTRODUCTION], [DESIGN SYSTEM], [SAFE ZONE], [TEXT BLOCKS], [MOOD], [DO NOT INCLUDE], etc.). Reaproveite TUDO do original (design system, safe zones, logo, idioma, do not include) e modifique APENAS os blocos que refletem o eixo desta variação. O prompt deve ser autossuficiente para o modelo de imagem.`;

interface Body {
  originalPrompt: string;
  copy?: any;
  businessContext?: string;
  language?: string;
  aspect: "story" | "square";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = (await req.json()) as Body;
    if (!body.originalPrompt || !body.aspect) {
      return new Response(JSON.stringify({ error: "originalPrompt e aspect são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = body.language === "en" ? "English" : body.language === "es" ? "Spanish" : "Portuguese (Brazil)";

    const userMsg = `PROMPT ORIGINAL DO CRIATIVO APROVADO (use como base e fonte de verdade do DNA visual):
"""
${body.originalPrompt}
"""

CONTEXTO DO NEGÓCIO: ${body.businessContext || "(não fornecido — infira do prompt acima)"}
COPY APROVADA ATUAL: ${JSON.stringify(body.copy || {})}
IDIOMA OBRIGATÓRIO DOS TEXTOS NA ARTE: ${langName}
ASPECT RATIO ALVO PARA AS 5 VARIAÇÕES: ${body.aspect === "story" ? "9:16 vertical (1080x1920)" : "1:1 square (1080x1080)"}

Aplique a skill FATOR CRIATIVO. Gere EXATAMENTE 5 variações na ordem dos 5 eixos (1=emocional, 2=oferta, 3=persona, 4=hook, 5=estrutura). Cada promptCompleto deve estar pronto para alimentar o Nano Banana e produzir uma imagem coerente com a marca original.`;

    const tool = {
      type: "function",
      function: {
        name: "emit_variations",
        description: "Retorna as 5 variações estratégicas",
        parameters: {
          type: "object",
          properties: {
            variations: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  eixo: { type: "string", enum: ["emocional", "oferta", "persona", "hook", "estrutura"] },
                  nome: { type: "string", description: "Nome curto da variação (ex: 'Dor', 'Escassez real', 'Avançado')" },
                  estrategia: {
                    type: "object",
                    properties: {
                      mudanca: { type: "string", description: "1-2 frases: o que muda vs original" },
                      paraQuem: { type: "string", description: "Persona/momento ideal" },
                    },
                    required: ["mudanca", "paraQuem"],
                    additionalProperties: false,
                  },
                  copy: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      titulo: { type: "string" },
                      subtitulo: { type: "string" },
                      dados: { type: "string" },
                      cta: { type: "string" },
                    },
                    required: ["label", "titulo", "subtitulo", "dados", "cta"],
                    additionalProperties: false,
                  },
                  descricaoVisual: {
                    type: "object",
                    properties: {
                      hook: { type: "string" },
                      composicao: { type: "string" },
                      tom: { type: "string" },
                      diferenca: { type: "string" },
                    },
                    required: ["hook", "composicao", "tom", "diferenca"],
                    additionalProperties: false,
                  },
                  promptCompleto: {
                    type: "string",
                    description: "Prompt FINAL pronto para Nano Banana, formato igual ao original, com todos os blocos.",
                  },
                },
                required: ["eixo", "nome", "estrategia", "copy", "descricaoVisual", "promptCompleto"],
                additionalProperties: false,
              },
            },
          },
          required: ["variations"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SKILL },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "emit_variations" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway erro ${resp.status}: ${t.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let args: { variations: unknown[] };

    if (call?.function?.arguments) {
      args = JSON.parse(call.function.arguments);
    } else {
      // Fallback: extrai JSON do conteúdo de texto caso o modelo não use tool_call
      const text = (data?.choices?.[0]?.message?.content || '') as string;
      const match = text.match(/\{[\s\S]*"variations"[\s\S]*\}/);
      if (!match) throw new Error("Modelo não retornou variações estruturadas");
      args = JSON.parse(match[0]);
    }

    if (!Array.isArray(args.variations) || args.variations.length !== 5) {
      throw new Error("Esperado exatamente 5 variations");
    }

    return new Response(JSON.stringify({ variations: args.variations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-fator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
