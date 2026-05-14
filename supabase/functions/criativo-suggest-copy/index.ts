import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é copywriter sênior de criativos publicitários. Sua tarefa é escrever um RASCUNHO inicial curto de copy bruta (2-4 linhas) que o anunciante poderá editar. Use as referências visuais, mood e design system fornecidos para inferir o segmento, tom e oferta provável. Português brasileiro, natural, sem listar tópicos, sem aspas, sem títulos. Apenas o texto corrido como se o anunciante estivesse descrevendo o que quer anunciar (ex: "Estamos vendendo curso de kitesurf em Floripa, foco em iniciantes, com instrutores certificados IKO, vagas a partir de R$ 890 começando dia 15/03..."). NUNCA invente dados específicos como datas, preços ou nomes próprios — se não houver evidência clara nas referências, mantenha vago e plausível.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { analysis, language } = await req.json();
    if (!analysis) {
      return new Response(JSON.stringify({ error: "analysis obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "en" ? "English" : language === "es" ? "Spanish" : "Portuguese (Brazil)";

    const userPrompt = `Idioma: ${lang}
Mood adjetivos: ${(analysis?.mood?.adjetivos || []).join(", ")}
Referências visuais: ${(analysis?.mood?.referencias || []).join(", ")}
Evita: ${(analysis?.mood?.evita || []).join(", ")}
Design system resumido:
${(analysis?.designSystemDoc || "").slice(0, 800)}

Escreva um rascunho curto (2-4 linhas) descrevendo a oferta provável que combinaria com essas referências. Apenas o texto, sem prefixos.`;

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
