import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateBody {
  prompt: string;
  aspectRatio: "story" | "square";
  model?: string;
  quality?: "low" | "medium" | "high";
  isVariation?: boolean;
  productImages?: string[];
  logoImage?: string | null;
  storyReference?: string | null;
}

const EVOLINK_BASE_URL = "https://api.evolink.ai/v1";
const MODEL_NAME = "gpt-image-2";

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1], bytes };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EVOLINK_API_KEY = Deno.env.get("EVOLINK_API_KEY");
    if (!EVOLINK_API_KEY) throw new Error("EVOLINK_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { prompt, aspectRatio } = body;

    if (!prompt || !aspectRatio) {
      return new Response(JSON.stringify({ error: "prompt e aspectRatio são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isStory = aspectRatio === "story";
    const aspectInstruction = isStory
      ? "OUTPUT FORMAT: vertical 9:16 aspect ratio, 1080x1920px Instagram Story format. Render all text elements in Portuguese Brazil."
      : "OUTPUT FORMAT: perfect 1:1 square aspect ratio, 1080x1080px Instagram post format. Render all text elements in Portuguese Brazil.";
    const size = isStory ? "1024x1536" : "1024x1024";

    // Collect reference images in required order
    const refs: { mime: string; bytes: Uint8Array }[] = [];
    const productImages = Array.isArray(body.productImages) ? body.productImages : [];
    for (const img of productImages.slice(0, 14)) {
      const p = parseDataUrl(img);
      if (p) refs.push(p);
    }
    if (body.logoImage) {
      const p = parseDataUrl(body.logoImage);
      if (p) refs.push(p);
    }
    if (!isStory && body.storyReference) {
      const p = parseDataUrl(body.storyReference);
      if (p) refs.push(p);
    }

    const referenceHints = refs.length > 0
      ? `\n\n[REFERENCE IMAGES]\n${refs.length} reference image(s) attached. Use them as the source of truth for the subject appearance, brand logo and visual style. Preserve faces exactly. Do not alter or recolor the brand logo.`
      : "";

    const fullPrompt = `${aspectInstruction}\n\n${prompt}${referenceHints}`;

    console.log("criativo-generate (evolink gpt-image-2) →", {
      model: MODEL_NAME,
      aspectRatio,
      prompt_chars: fullPrompt.length,
      refs: refs.length,
    });

    const quality = body.quality ?? "medium";
    const requestBody = {
      model: MODEL_NAME,
      prompt: fullPrompt,
      n: 1,
      size,
      quality,
      response_format: "b64_json",
    };

    const resp = await fetch(`${EVOLINK_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EVOLINK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("EvoLink image error", resp.status, t.slice(0, 400));
      const status = resp.status;
      let msg = `EvoLink erro ${status}: ${t.slice(0, 400)}`;
      if (status === 401 || status === 403) msg = "EVOLINK_API_KEY inválida ou sem permissão";
      else if (status === 429) msg = "Limite de uso atingido. Tente novamente em instantes.";
      return new Response(JSON.stringify({ error: msg }), {
        status: status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("Sem imagem na resposta EvoLink:", JSON.stringify(data).slice(0, 600));
      throw new Error("EvoLink não retornou imagem");
    }

    const imageUrl = `data:image/png;base64,${b64}`;

    return new Response(JSON.stringify({ imageUrl, model: MODEL_NAME }), {
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
