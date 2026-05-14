import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GeminiModel =
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview"
  | "gemini-3.1-flash-image-preview";

const ALLOWED_MODELS: GeminiModel[] = [
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "gemini-3.1-flash-image-preview",
];

const DEFAULT_MODEL: GeminiModel = "gemini-3.1-flash-image-preview";

interface GenerateBody {
  prompt: string;
  aspectRatio: "story" | "square";
  model?: GeminiModel;
  isVariation?: boolean;
  productImages?: string[];
  logoImage?: string | null;
  storyReference?: string | null;
}

function parseDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { prompt, aspectRatio } = body;

    if (!prompt || !aspectRatio) {
      return new Response(JSON.stringify({ error: "prompt e aspectRatio são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model: GeminiModel = body.model && ALLOWED_MODELS.includes(body.model)
      ? body.model
      : DEFAULT_MODEL;

    const isStory = aspectRatio === "story";
    const aspectInstruction = isStory
      ? "OUTPUT FORMAT: vertical 9:16 aspect ratio, 1080x1920px Instagram Story format."
      : "OUTPUT FORMAT: perfect 1:1 square aspect ratio, 1080x1080px Instagram post format.";

    // Build parts array: text + reference images (inline_data)
    const parts: any[] = [];

    const productImages = Array.isArray(body.productImages) ? body.productImages : [];
    const refBlobs: { mime: string; data: string }[] = [];
    for (const img of productImages.slice(0, 14)) {
      const p = parseDataUrl(img);
      if (p) refBlobs.push(p);
    }
    if (body.logoImage) {
      const p = parseDataUrl(body.logoImage);
      if (p) refBlobs.push(p);
    }
    if (!isStory && body.storyReference) {
      const p = parseDataUrl(body.storyReference);
      if (p) refBlobs.push(p);
    }

    const referenceHints = refBlobs.length > 0
      ? `\n\n[REFERENCE IMAGES]\n${refBlobs.length} reference image(s) attached. Use them as the source of truth for the subject's appearance, brand logo and visual consistency. Do not invent new faces or alter the brand mark.`
      : "";

    const fullPrompt = `${aspectInstruction}\n\n${prompt}${referenceHints}`;

    parts.push({ text: fullPrompt });
    for (const r of refBlobs) {
      parts.push({ inline_data: { mime_type: r.mime, data: r.data } });
    }
    console.log("criativo-generate (gemini direct) →", {
      model,
      aspectRatio,
      prompt_chars: fullPrompt.length,
      refs: refBlobs.length,
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini image error", resp.status, t);
      const status = resp.status;
      let msg = `Gemini erro ${status}: ${t.slice(0, 400)}`;
      if (status === 401 || status === 403) msg = "GEMINI_API_KEY inválida ou sem permissão para este modelo.";
      else if (status === 429) msg = "Limite de uso da API Gemini atingido. Tente novamente em instantes.";
      else if (status === 400 && /quota|billing/i.test(t)) msg = "Cota da API Gemini esgotada. Verifique sua chave no Google AI Studio.";
      return new Response(JSON.stringify({ error: msg }), {
        status: status === 429 ? 429 : status === 401 || status === 403 ? 401 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const candidateParts = data?.candidates?.[0]?.content?.parts ?? [];
    let imageUrl: string | undefined;
    for (const p of candidateParts) {
      const inline = p.inline_data || p.inlineData;
      if (inline?.data) {
        const mime = inline.mime_type || inline.mimeType || "image/png";
        imageUrl = `data:${mime};base64,${inline.data}`;
        break;
      }
    }

    if (!imageUrl) {
      console.error("Sem imagem na resposta Gemini:", JSON.stringify(data).slice(0, 600));
      const blockReason = data?.promptFeedback?.blockReason;
      const finishReason = data?.candidates?.[0]?.finishReason;
      throw new Error(
        blockReason
          ? `Bloqueado pelo Gemini: ${blockReason}`
          : finishReason && finishReason !== "STOP"
          ? `Gemini parou: ${finishReason}`
          : "Modelo não retornou imagem"
      );
    }

    return new Response(JSON.stringify({ imageUrl, model }), {
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
