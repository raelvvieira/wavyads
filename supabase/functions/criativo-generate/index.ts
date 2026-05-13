import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Quality = "low" | "medium" | "high";

interface GenerateBody {
  prompt: string;
  aspectRatio: "story" | "square";
  quality?: Quality;
  isVariation?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { prompt, aspectRatio, isVariation } = body;

    if (!prompt || !aspectRatio) {
      return new Response(JSON.stringify({ error: "prompt e aspectRatio são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isStory = aspectRatio === "story";
    const size = isStory ? "1024x1536" : "1024x1024";
    const userQuality: Quality =
      body.quality === "low" || body.quality === "high" ? body.quality : "medium";
    const finalQuality: Quality = isVariation ? "medium" : userQuality;

    console.log("criativo-generate (openai) →", {
      aspectRatio,
      size,
      quality: finalQuality,
      isVariation: !!isVariation,
      prompt_chars: prompt.length,
    });

    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size,
        quality: finalQuality,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI image error", resp.status, t);
      if (resp.status === 401) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY inválida." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da OpenAI atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402 || /insufficient_quota|billing/i.test(t)) {
        return new Response(JSON.stringify({ error: "Créditos da OpenAI esgotados. Adicione saldo no painel da OpenAI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `OpenAI erro ${resp.status}: ${t.slice(0, 400)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const item = data?.data?.[0];
    let imageUrl: string | undefined = item?.url;
    if (!imageUrl && item?.b64_json) {
      imageUrl = `data:image/png;base64,${item.b64_json}`;
    }

    if (!imageUrl) {
      console.error("Sem imagem na resposta:", JSON.stringify(data).slice(0, 500));
      throw new Error("Modelo não retornou imagem");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
