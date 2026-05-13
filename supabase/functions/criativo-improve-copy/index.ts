import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é copywriter sênior de performance no Brasil. Receba a ideia bruta do anunciante e devolva uma copy publicitária pronta para criativo de Instagram/Facebook: 1 headline impactante, 1 subheadline (opcional) e 1 CTA forte. Português brasileiro, sem clichês, sem emojis exagerados, foco em benefício e gatilho. Nunca prometa resultado mágico nem use superlativos absolutos proibidos pela Meta.`;

const TOOL_PARAMS = {
  type: "object",
  properties: {
    headline: { type: "string", description: "Headline principal, até 60 caracteres" },
    subheadline: { type: "string", description: "Subheadline opcional, até 90 caracteres. Pode ser string vazia." },
    cta: { type: "string", description: "Call to action curto (ex: Agende agora, Fale no WhatsApp)" },
    justificativa: { type: "string", description: "1-2 frases explicando o porquê dessa copy funcionar" },
  },
  required: ["headline", "subheadline", "cta", "justificativa"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { rawCopy, context } = await req.json();
    if (!rawCopy || typeof rawCopy !== "string") {
      return new Response(JSON.stringify({ error: "Envie a copy bruta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Ideia/copy bruta do anunciante:
"""
${rawCopy}
"""
${context ? `\nContexto adicional: ${context}` : ""}

Reescreva como copy de criativo pronta.`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "improve_copy",
              description: "Devolve copy estruturada",
              parameters: TOOL_PARAMS,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "improve_copy" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou copy estruturada");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-improve-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
