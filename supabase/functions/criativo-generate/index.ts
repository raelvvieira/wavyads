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
  productImages?: string[];
  logoImage?: string | null;
  storyReference?: string | null;
}

const MODEL = "gpt-image-1";

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("data URL inválida");
  const mime = m[1];
  const b64 = m[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extToName(mime: string, idx: number): string {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return `ref_${idx}.${ext}`;
}

function mapErrorResponse(status: number, text: string): Response {
  if (status === 401) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY inválida." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 429) {
    return new Response(JSON.stringify({ error: "Limite de uso da OpenAI atingido. Tente novamente em instantes." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 402 || /insufficient_quota|billing/i.test(text)) {
    return new Response(JSON.stringify({ error: "Créditos da OpenAI esgotados. Adicione saldo no painel da OpenAI." }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: `OpenAI erro ${status}: ${text.slice(0, 400)}` }), {
    status: 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    // Collect references
    const refs: { blob: Blob; name: string }[] = [];
    const productImages = Array.isArray(body.productImages) ? body.productImages : [];
    for (let i = 0; i < productImages.length && refs.length < 14; i++) {
      try {
        const blob = dataUrlToBlob(productImages[i]);
        refs.push({ blob, name: extToName(blob.type, refs.length) });
      } catch (_) { /* skip invalid */ }
    }
    if (body.logoImage && refs.length < 15) {
      try {
        const blob = dataUrlToBlob(body.logoImage);
        refs.push({ blob, name: extToName(blob.type, refs.length) });
      } catch (_) { /* skip */ }
    }
    if (!isStory && body.storyReference && refs.length < 16) {
      try {
        const blob = dataUrlToBlob(body.storyReference);
        refs.push({ blob, name: extToName(blob.type, refs.length) });
      } catch (_) { /* skip */ }
    }

    const useEdits = refs.length > 0;
    const endpoint = useEdits
      ? "https://api.openai.com/v1/images/edits"
      : "https://api.openai.com/v1/images/generations";

    console.log("criativo-generate (openai) →", {
      endpoint: useEdits ? "edits" : "generations",
      aspectRatio,
      size,
      quality: finalQuality,
      isVariation: !!isVariation,
      prompt_chars: prompt.length,
      refs: refs.length,
    });

    let resp: Response;
    if (useEdits) {
      const fd = new FormData();
      fd.append("model", MODEL);
      fd.append("prompt", prompt);
      fd.append("n", "1");
      fd.append("size", size);
      fd.append("quality", finalQuality);
      for (const r of refs) fd.append("image[]", r.blob, r.name);

      resp = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: fd,
      });
    } else {
      resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          n: 1,
          size,
          quality: finalQuality,
        }),
      });
    }

    if (!resp.ok) {
      const t = await resp.text();
      console.error("OpenAI image error", resp.status, t);
      return mapErrorResponse(resp.status, t);
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
