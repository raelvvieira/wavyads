import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tema, angulo, copy_referencia } = await req.json();
    if (!tema || typeof tema !== "string") {
      return new Response(JSON.stringify({ error: "tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const copyBloco = (copy_referencia && typeof copy_referencia === "string" && copy_referencia.trim())
      ? `\n\nCopy do post viral de referência (use para entender ângulo, tom e dores abordadas — NÃO copie literalmente):\n"""\n${copy_referencia.trim().slice(0, 4000)}\n"""`
      : "";

    const userMessage = `Pesquise na internet sobre o seguinte tema e retorne um briefing de pesquisa rico para um copywriter de Instagram.

Tema: ${tema}
${angulo ? `Ângulo de referência: ${angulo}` : ""}${copyBloco}

Busque dados reais, estatísticas recentes, tendências atuais, dores do público e exemplos concretos sobre esse assunto. Priorize fontes dos últimos 12 meses.

Retorne um texto corrido em português, organizado, direto ao ponto. Máximo 400 palavras. Sem títulos grandes, sem markdown excessivo — escreva como um briefing que um estrategista passaria para um redator.`;


    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Anthropic error:", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha na pesquisa" }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n\n").trim()
      : "";

    return new Response(JSON.stringify({ briefing: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-research error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
