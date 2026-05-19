// Direct Gemini image generation (same API as Criativo Studio) — no gateway.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface ReqBody {
  visual_prompt: string;
  formato: "carrossel_imagem" | "carrossel_texto" | "carrossel_lista" | "post_unico";
  tema: string;
  estilo_global?: string;
  slide_index: number;
  slide_titulo?: string;
  slide_corpo?: string;
}

type GeminiModel = "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview" | "gemini-2.5-flash-image";
const DEFAULT_MODEL: GeminiModel = "gemini-3.1-flash-image-preview";

function buildPrompt(b: ReqBody): string {
  const base = `Tema: ${b.tema}. ${b.estilo_global ? `Estilo visual: ${b.estilo_global}.` : ""}`;
  const formatHint = "OUTPUT FORMAT: perfect 1:1 square aspect ratio, 1080x1080px Instagram post format.";
  let body: string;
  if (b.formato === "carrossel_texto") {
    body = `Instagram square 1:1. Solid color background, large bold typography. Featured text: "${b.slide_titulo || ""}". Minimal, editorial design. No photo. ${b.visual_prompt}`;
  } else if (b.formato === "carrossel_lista") {
    body = `Instagram square 1:1. Clean design with list/bullet visual structure. Headline: "${b.slide_titulo || ""}". Modern infographic style. ${b.visual_prompt}`;
  } else {
    body = `Instagram square 1:1. ${b.visual_prompt}. Photographic or illustrative, suitable as background for text overlay. Leave negative space at the top for headline.`;
  }
  return `${formatHint}\n\n${base} ${body}\n\nCinematic editorial photograph, dramatic lighting, ultra-sharp focus, professional composition, high contrast, magazine quality, visually striking for Instagram, 4k, award-winning photography.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(body);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${geminiKey}`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini error", resp.status, t.slice(0, 400));
      let msg = `Gemini erro ${resp.status}`;
      if (resp.status === 401 || resp.status === 403) msg = "GEMINI_API_KEY inválida ou sem permissão.";
      else if (resp.status === 429) msg = "Limite da API Gemini atingido. Tente em instantes.";
      else if (resp.status === 400 && /quota|billing/i.test(t)) msg = "Cota Gemini esgotada.";
      return new Response(JSON.stringify({ error: msg }), {
        status: resp.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let mime = "image/png";
    let b64: string | undefined;
    for (const p of data?.candidates?.[0]?.content?.parts ?? []) {
      const inline = p.inline_data || p.inlineData;
      if (inline?.data) {
        b64 = inline.data;
        mime = inline.mime_type || inline.mimeType || mime;
        break;
      }
    }
    if (!b64) {
      const blockReason = data?.promptFeedback?.blockReason;
      return new Response(JSON.stringify({ error: blockReason ? `Bloqueado pelo Gemini: ${blockReason}` : "Modelo não retornou imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, serviceKey);
    const path = `${Date.now()}-s${body.slide_index}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supa.storage.from("social-media").upload(path, bytes, { contentType: mime, upsert: false });

    if (upErr) {
      console.error("upload err", upErr);
      return new Response(JSON.stringify({ url: `data:${mime};base64,${b64}`, prompt_usado: prompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: pub } = supa.storage.from("social-media").getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl, prompt_usado: prompt, model: DEFAULT_MODEL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-image-gen error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
