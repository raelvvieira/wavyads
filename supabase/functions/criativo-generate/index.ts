import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ImgModel = "nano-banana-pro" | "nano-banana-2";

interface GenerateBody {
  model: ImgModel;
  prompt: string;
  aspectRatio: "story" | "square";
  referenceImages?: string[]; // data:... or https URLs (product/scene refs)
  logoImage?: string | null; // single logo
  storyReference?: string | null; // already-generated Story image, used as visual ground truth for the square
}

function modelId(m: ImgModel) {
  return m === "nano-banana-pro"
    ? "google/gemini-3-pro-image-preview"
    : "google/gemini-3.1-flash-image-preview";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { model, prompt, aspectRatio } = body;
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.filter(Boolean) : [];
    const logoImage = body.logoImage || null;

    if (!model || !prompt || !aspectRatio) {
      return new Response(JSON.stringify({ error: "model, prompt e aspectRatio são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reinforce aspect ratio at the very top (Nano Banana respects strong textual instructions).
    const dimsLine = aspectRatio === "story"
      ? "OUTPUT IMAGE FORMAT (mandatory): exactly 1080x1920 pixels, vertical 9:16 Instagram Story aspect ratio. The full canvas MUST be vertical 9:16 — do not output square or landscape."
      : "OUTPUT IMAGE FORMAT (mandatory): exactly 1080x1080 pixels, perfect 1:1 square Instagram post. The full canvas MUST be a square — do not output vertical or landscape.";

    const refsHint = referenceImages.length > 0 || logoImage
      ? `\n\n[ATTACHED REFERENCE IMAGES — ROLES]\n${
          referenceImages.length > 0
            ? `- The first ${referenceImages.length} attached image(s) are the SUBJECT/PRODUCT/SCENE photo(s). Use them as the literal subject of the composition. Preserve faces, body, product shape and likeness.`
            : ""
        }${logoImage ? `\n- The LAST attached image is the BRAND LOGO. Place it small in a corner (top-left or bottom-right) without distortion, recoloring, or redrawing. Treat it as a fixed brand asset.` : ""}`
      : "";

    const fullPrompt = `${dimsLine}\n\n${prompt}${refsHint}`;

    const userContent: any[] = [{ type: "text", text: fullPrompt }];
    for (const url of referenceImages) {
      userContent.push({ type: "image_url", image_url: { url } });
    }
    if (logoImage) {
      userContent.push({ type: "image_url", image_url: { url: logoImage } });
    }

    console.log(
      "criativo-generate →",
      model,
      aspectRatio,
      `prompt_chars=${fullPrompt.length}`,
      `refs=${referenceImages.length}`,
      `logo=${logoImage ? 1 : 0}`,
    );

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId(model),
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway erro ${resp.status}: ${t.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

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
