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

async function fetchUrlToBase64DataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Falha ao baixar imagem do EvoLink (${r.status})`);
  }
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

function mapResolution(quality: "low" | "medium" | "high"): string {
  if (quality === "high") return "4K";
  if (quality === "medium") return "2K";
  return "1K";
}

function extExt(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
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
    const size = isStory ? "2:3" : "1:1";
    const quality = body.quality ?? "low";
    const resolution = mapResolution(quality);

    // Collect reference images
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

    const hasRefs = refs.length > 0;
    const referenceHints = hasRefs
      ? `[REFERENCE IMAGES]\n${refs.length} reference image(s) attached. Use them as the exact source of truth for faces, product appearance and brand logo. Preserve every detail — do not alter faces, skin tone, hair, clothing, product shape or brand mark.`
      : "";

    const fullPrompt = [aspectInstruction, prompt, referenceHints]
      .filter(Boolean)
      .join("\n\n");

    console.log("criativo-generate (evolink gpt-image-2) →", {
      route: hasRefs ? "edits" : "generations",
      aspectRatio,
      size,
      resolution,
      quality,
      prompt_chars: fullPrompt.length,
      refs: refs.length,
    });

    let resp: Response;

    if (hasRefs) {
      const formData = new FormData();
      formData.append("model", MODEL_NAME);
      formData.append("prompt", fullPrompt);
      formData.append("n", "1");
      formData.append("size", size);
      formData.append("resolution", resolution);
      formData.append("quality", quality);

      refs.forEach((r, idx) => {
        const blob = new Blob([r.bytes], { type: r.mime });
        formData.append("image[]", blob, `ref_${idx}.${extExt(r.mime)}`);
      });

      resp = await fetch(`${EVOLINK_BASE_URL}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${EVOLINK_API_KEY}` },
        body: formData,
      });
    } else {
      const requestBody = {
        model: MODEL_NAME,
        prompt: fullPrompt,
        n: 1,
        size,
        resolution,
        quality,
        response_format: "b64_json",
      };
      resp = await fetch(`${EVOLINK_BASE_URL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${EVOLINK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    }

    const respText = await resp.text();
    console.log("EvoLink status:", resp.status);
    console.log("EvoLink raw response:", respText.slice(0, 800));

    if (!resp.ok) {
      let msg = `EvoLink erro ${resp.status}: ${respText.slice(0, 500)}`;
      if (resp.status === 401) msg = "Chave da API EvoLink inválida ou expirada.";
      else if (resp.status === 403) msg = "Permissão negada na API EvoLink.";
      else if (resp.status === 429) msg = "Limite de requisições EvoLink atingido. Tente novamente em instantes.";
      return new Response(JSON.stringify({ error: msg, status: resp.status, body: respText.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(respText);
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;

    let imageUrl: string;
    if (b64) {
      imageUrl = `data:image/png;base64,${b64}`;
    } else if (url) {
      imageUrl = await fetchUrlToBase64DataUrl(url);
    } else {
      console.error("Sem imagem na resposta EvoLink:", JSON.stringify(data).slice(0, 600));
      throw new Error("EvoLink não retornou imagem");
    }

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
