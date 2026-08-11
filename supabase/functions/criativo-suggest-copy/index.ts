import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const SYSTEM = `Você é copywriter sênior de criativos publicitários. Sua tarefa é escrever um RASCUNHO inicial curto de copy bruta (2-4 linhas) que o anunciante poderá editar. Use as referências visuais, mood e design system fornecidos para inferir o segmento, tom e oferta provável. Se houver conteúdo extraído do site/produto do anunciante, BASEIE A OFERTA NELE — não invente dados que não estejam nesse conteúdo. Português brasileiro, natural, sem listar tópicos, sem aspas, sem títulos. Apenas o texto corrido como se o anunciante estivesse descrevendo o que quer anunciar. NUNCA invente dados específicos como datas, preços ou nomes próprios — se não houver evidência clara, mantenha vago e plausível.`;

// Criativo Rápido: o anunciante escolheu uma copy salva como REFERÊNCIA de
// tom/estrutura/estilo — não como texto final. Aqui a tarefa é ler o DNA
// dessa copy (tom, estrutura, recursos retóricos) e devolver 4 variações
// novas que soam com a mesma voz, mas com ângulo e conteúdo diferentes.
const REFERENCE_SYSTEM = `Você é copywriter sênior de criativos publicitários, especialista em replicar o DNA de uma copy vencedora em variações novas.

Antes de escrever, leia a copy de referência com atenção a:
- Tom (formal, casual, urgente, inspiracional, direto, aspiracional...)
- Estrutura (tem gancho de abertura? corpo? fechamento tipo CTA? frases curtas ou narrativa corrida? usa 2ª pessoa "você"? pergunta retórica? exclamação?)
- Recursos retóricos específicos (números, contraste, promessa, escassez, prova social...)

Gere 4 variações NOVAS que preservam esse mesmo tom/estrutura/estilo, cada uma com um ângulo diferente:
1. "Direto/Benefício" — foco no benefício mais claro e direto.
2. "Urgência/Escassez" — gatilho de tempo, vagas ou condição limitada.
3. "Curiosidade/Hook" — abre um loop, pergunta provocativa ou afirmação inesperada.
4. "Prova/Autoridade" — credenciais, números, certificações, autoridade.

Regras: 2-4 linhas por variação, português brasileiro, mesmo segmento/oferta implícito na referência. NUNCA invente dados novos (datas, preços, nomes próprios) que não estejam na referência. Nenhuma variação pode ser uma paráfrase quase-literal da referência — todas devem soar como a mesma voz de marca, mas com conteúdo genuinamente novo.`;

const VARIATIONS_TOOL = {
  type: "function",
  function: {
    name: "emit_variations",
    description: "Devolve 4 variações novas de copy, preservando o tom/estrutura da referência",
    parameters: {
      type: "object",
      properties: {
        variations: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              angulo: {
                type: "string",
                enum: ["Direto/Benefício", "Urgência/Escassez", "Curiosidade/Hook", "Prova/Autoridade"],
              },
              texto: { type: "string", description: "Copy nova de 2-4 linhas, nesse ângulo" },
            },
            required: ["angulo", "texto"],
            additionalProperties: false,
          },
        },
      },
      required: ["variations"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const { analysis, language, urlContext, initialPrompt, additionalInstructions, referenceCopy, tema } = await req.json();
    const lang = language === "en" ? "English" : language === "es" ? "Spanish" : "Portuguese (Brazil)";

    // ==================== CRIATIVO RÁPIDO: 4 variações a partir de uma copy de referência ====================
    if (referenceCopy) {
      const userPrompt = `Idioma dos textos: ${lang}
${tema ? `Tema/segmento: ${tema}\n` : ""}
Copy de referência (já usada por este cliente antes — leia tom, estrutura e estilo; NÃO repita literalmente):
"""
${String(referenceCopy).slice(0, 1500)}
"""

Gere as 4 variações pedidas.`;

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: REFERENCE_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          tools: [VARIATIONS_TOOL],
          tool_choice: { type: "function", function: { name: "emit_variations" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Gemini error", response.status, t);
        throw new Error(`Gemini: ${response.status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("IA não retornou variações estruturadas");
      const parsed = JSON.parse(toolCall.function.arguments);
      const suggestions = Array.isArray(parsed?.variations) ? parsed.variations.slice(0, 4) : [];
      if (suggestions.length === 0) throw new Error("IA não retornou variações");

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== Fluxo completo: rascunho único a partir de análise/prompt ====================
    const urlBlock = urlContext && (urlContext.title || urlContext.description || urlContext.text)
      ? `\n\nConteúdo extraído do site/produto fornecido pelo anunciante (USE COMO BASE PRINCIPAL):
Título: ${urlContext.title || "(sem título)"}
Descrição: ${urlContext.description || "(sem descrição)"}
Trecho: ${(urlContext.text || "").slice(0, 3500)}`
      : "";

    const promptBlock = initialPrompt
      ? `\nPrompt do criativo: ${initialPrompt.slice(0, 800)}`
      : "";
    const instructionsBlock = additionalInstructions?.length
      ? `\nOrientações adicionais: ${(additionalInstructions as string[]).join("; ")}`
      : "";

    const userPrompt = analysis
      ? `Idioma: ${lang}
Mood adjetivos: ${(analysis.mood?.adjetivos || []).join(", ")}
Referências visuais: ${(analysis.mood?.referencias || []).join(", ")}
Evita: ${(analysis.mood?.evita || []).join(", ")}
Design system resumido:
${(analysis.designSystemDoc || "").slice(0, 800)}${promptBlock}${instructionsBlock}${urlBlock}

Escreva um rascunho curto (2-4 linhas) descrevendo a oferta provável que combinaria com essas referências${urlContext ? " e, principalmente, com o conteúdo do site acima" : ""}. Apenas o texto, sem prefixos.`
      : `Idioma: ${lang}${promptBlock}${instructionsBlock}${urlBlock}

Com base apenas no prompt e nas orientações acima, escreva um rascunho curto de copy (2-4 linhas) para o criativo. Apenas o texto corrido, sem prefixos, sem listas.`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini error", response.status, t);
      throw new Error(`Gemini: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = (data.choices?.[0]?.message?.content || "").trim();

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-suggest-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
