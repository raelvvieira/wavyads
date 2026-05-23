const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { copy_consolidada } = await req.json();
    if (!copy_consolidada || typeof copy_consolidada !== "string" || !copy_consolidada.trim()) {
      return new Response(JSON.stringify({ error: "copy_consolidada é obrigatória" }), {
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

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: "You are a content strategist. Given the full transcript/copy of a viral Instagram post, extract a precise technical research theme in 1-2 sentences in Portuguese. The theme must: (1) name the specific subject matter with technical precision, (2) include the core data point or claim made, (3) be suitable as a web search query for a researcher. Do NOT use the post's hook line. Return only the theme string, no explanation.",
        messages: [{ role: "user", content: copy_consolidada.trim().slice(0, 6000) }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Anthropic error:", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha ao gerar tema" }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tema = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("").trim()
      : "";

    return new Response(JSON.stringify({ tema }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-tema-gen error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
