import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é copywriter sênior de criativos publicitários. Sua tarefa é escrever um RASCUNHO inicial curto de copy bruta (2-4 linhas) que o anunciante poderá editar. Use as referências visuais, mood e design system fornecidos para inferir o segmento, tom e oferta provável. Se houver conteúdo extraído do site/produto do anunciante, BASEIE A OFERTA NELE — não invente dados que não estejam nesse conteúdo. Português brasileiro, natural, sem listar tópicos, sem aspas, sem títulos. Apenas o texto corrido como se o anunciante estivesse descrevendo o que quer anunciar. NUNCA invente dados específicos como datas, preços ou nomes próprios — se não houver evidência clara, mantenha vago e plausível.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { analysis, language, urlContext, initialPrompt, additionalInstructions } = await req.json();

    const lang = language === "en" ? "English" : language === "es" ? "Spanish" : "Portuguese (Brazil)";

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
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error", response.status, t);
      throw new Error(`AI gateway: ${response.status}`);
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
