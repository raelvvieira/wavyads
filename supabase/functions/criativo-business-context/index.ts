import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const { mood = [], referencias = [], evita = [], copy = {}, rawCopy = "", language = "pt-BR" } = await req.json();

    const langName = language === "en" ? "inglês" : language === "es" ? "espanhol" : "português brasileiro";

    const userMsg = `Com base nos sinais abaixo (análise visual + copy do anúncio), descreva em **1 a 2 frases curtas, em ${langName}**, qual é o NEGÓCIO/OFERTA por trás desse criativo. Seja específico no nicho, posicionamento (premium, popular, técnico, casual...) e cidade/contexto se aparecer. Não use aspas, não enrole, não comece com "Trata-se de".

Análise visual:
- Mood/adjetivos: ${Array.isArray(mood) ? mood.join(", ") : mood}
- Referências de marca: ${Array.isArray(referencias) ? referencias.join(", ") : referencias}
- Evita: ${Array.isArray(evita) ? evita.join(", ") : evita}

Copy aprovada:
- Label: ${copy.label || "—"}
- Título: ${copy.titulo || "—"}
- Subtítulo: ${copy.subtitulo || "—"}
- Dados: ${copy.dados || "—"}
- CTA: ${copy.cta || "—"}

Copy bruta original do usuário: ${rawCopy || "—"}

Devolva apenas o texto final, sem prefixos, sem marcação, sem aspas.`;

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é estrategista de marca. Responde curto, específico, sem floreio." },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini: ${resp.status}`);
    }

    const data = await resp.json();
    const context = (data?.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");

    return new Response(JSON.stringify({ context }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-business-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
