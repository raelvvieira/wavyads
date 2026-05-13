import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREEPIK_BASE = "https://api.freepik.com/v1/ai";

type FreepikModel = "classic-fast" | "flux-dev" | "mystic" | "imagen3";

interface GenerateBody {
  model: FreepikModel;
  prompt: string;
  aspectRatio: "story" | "square"; // 9:16 ou 1:1
}

function endpointFor(model: FreepikModel) {
  switch (model) {
    case "classic-fast":
      return `${FREEPIK_BASE}/text-to-image`;
    case "flux-dev":
      return `${FREEPIK_BASE}/text-to-image/flux-dev`;
    case "mystic":
      return `${FREEPIK_BASE}/mystic`;
    case "imagen3":
      return `${FREEPIK_BASE}/text-to-image/imagen3`;
  }
}

function buildPayload(model: FreepikModel, prompt: string, aspect: "story" | "square") {
  // Freepik aspect ratio strings vary slightly per model — use the common ones.
  const ar = aspect === "story" ? "social_story_9_16" : "square_1_1";
  const flux_ar = aspect === "story" ? "9:16" : "1:1";

  if (model === "classic-fast") {
    return {
      prompt,
      num_images: 1,
      image: { size: aspect === "story" ? "social_story_9_16" : "square_1_1" },
    };
  }
  if (model === "flux-dev") {
    return { prompt, aspect_ratio: flux_ar };
  }
  if (model === "mystic") {
    return {
      prompt,
      resolution: "2k",
      aspect_ratio: aspect === "story" ? "social_story_9_16" : "square_1_1",
      model: "realism",
    };
  }
  // imagen3
  return {
    prompt,
    aspect_ratio: aspect === "story" ? "social_story_9_16" : "square_1_1",
    num_images: 1,
  };
}

async function pollTask(model: FreepikModel, taskId: string, apiKey: string): Promise<string> {
  const url = `${endpointFor(model)}/${taskId}`;
  const maxAttempts = 60; // ~2min
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await fetch(url, { headers: { "x-freepik-api-key": apiKey } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Freepik poll erro ${r.status}: ${t}`);
    }
    const j = await r.json();
    const status = j?.data?.status || j?.status;
    if (status === "COMPLETED" || status === "completed" || status === "SUCCESS") {
      const generated = j?.data?.generated || j?.generated || [];
      if (generated.length > 0) {
        const first = generated[0];
        if (typeof first === "string") return first;
        return first.url || first.base64 || "";
      }
      throw new Error("Freepik retornou completo mas sem imagem");
    }
    if (status === "FAILED" || status === "failed") {
      throw new Error("Freepik falhou ao gerar a imagem");
    }
  }
  throw new Error("Freepik timeout ao gerar imagem");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FREEPIK_API_KEY = Deno.env.get("FREEPIK_API_KEY");
    if (!FREEPIK_API_KEY) throw new Error("FREEPIK_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { model, prompt, aspectRatio } = body;

    if (!model || !prompt || !aspectRatio) {
      return new Response(JSON.stringify({ error: "model, prompt e aspectRatio são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = endpointFor(model);
    const payload = buildPayload(model, prompt, aspectRatio);

    console.log("Freepik request →", model, aspectRatio, url, JSON.stringify(payload).slice(0, 500));

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-freepik-api-key": FREEPIK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Freepik erro", resp.status, text);
      return new Response(JSON.stringify({ error: `Freepik erro ${resp.status}: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(text);

    // Classic-fast retorna base64 sincrono em data.data[0].base64
    if (model === "classic-fast") {
      const arr = data?.data || [];
      const first = arr[0];
      if (first?.base64) {
        return new Response(
          JSON.stringify({ imageUrl: `data:image/png;base64,${first.base64}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error("classic-fast retornou sem base64");
    }

    // Outros: assíncrono — task_id
    const taskId = data?.data?.task_id || data?.task_id;
    if (!taskId) throw new Error(`Freepik não retornou task_id: ${text}`);

    const imageUrl = await pollTask(model, taskId, FREEPIK_API_KEY);
    const final = imageUrl.startsWith("http") || imageUrl.startsWith("data:")
      ? imageUrl
      : `data:image/png;base64,${imageUrl}`;

    return new Response(JSON.stringify({ imageUrl: final }), {
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
