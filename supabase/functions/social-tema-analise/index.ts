const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tema, copy_consolidada } = await req.json();

    if (!tema || typeof tema !== "string" || !tema.trim()) {
      return new Response(JSON.stringify({ error: "tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const prompt = `Analise a copy extraída e o tema fornecido. Forneça uma análise estratégica em formato JSON com os seguintes campos:

- tom: Descrição do tom de voz recomendado para este tema (1-2 frases)
- tema_central: O tema central que deve estar no centro da narrativa
- evitar: O que evitar ao falar sobre este tema para não fugir do assunto
- estrategia: Uma definição estratégica de como abordar este tema de forma efetiva

Tema: ${tema}

Copy extraída:
${copy_consolidada}

Responda APENAS com um JSON válido, sem markdown, sem explicações adicionais.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Anthropic error:", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha ao analisar tema" }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textContent = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("").trim()
      : "";

    let analise: any = {};
    try {
      analise = JSON.parse(textContent);
    } catch (_e) {
      console.error("Failed to parse JSON response:", textContent);
      return new Response(JSON.stringify({ error: "Falha ao processar análise do tema" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-tema-analise error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
