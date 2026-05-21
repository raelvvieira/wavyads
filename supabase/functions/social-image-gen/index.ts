// Direct Gemini image generation com Wavy Image Skill (12 camadas + sufixos de template).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildWavyPrompt } from "./wavy-skill.ts";

type PatternId = "1A" | "1B" | "2A" | "2B" | "3" | "4" | "5";

interface ReqBody {
  visual_prompt: string;
  /** Novo: pattern_id da Wavy Copy Skill. Tem precedência sobre `formato`. */
  pattern_id?: PatternId;
  /** Legacy: formato antigo. Mantido para compat. */
  formato?: "carrossel_imagem" | "carrossel_texto" | "carrossel_lista" | "post_unico";
  tema: string;
  estilo_global?: string;
  slide_index: number;
  slide_titulo?: string;
  slide_corpo?: string;
  style_id?: string;
  /** Sufixo de composição (ex: template_1a_step, template_2b_dark). Override opcional. */
  template_id?: string;
  sujeito?: string;
}

type GeminiModel = "gemini-3.1-flash-image-preview" | "gemini-3-pro-image-preview" | "gemini-2.5-flash-image";
const DEFAULT_MODEL: GeminiModel = "gemini-3.1-flash-image-preview";

function defaultTemplateFromPattern(p?: PatternId): string {
  switch (p) {
    case "1A": return "template_1a_step";
    case "1B": return "template_1b_contrast";
    case "2A": return "template_2a_editorial";
    case "2B": return "template_2b_dark";
    case "4":  return "post_frase_a";
    case "5":  return "template_5_master";
    default:   return "template_1_cover";
  }
}
function defaultTemplateFromFormato(f?: ReqBody["formato"]): string {
  if (f === "carrossel_texto" || f === "post_unico") return "post_frase_a";
  if (f === "carrossel_lista") return "template_1_content";
  return "template_1_cover";
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

    const { prompt, style_id, caminho } = buildWavyPrompt({
      style_id: body.style_id,
      template_id: body.template_id || defaultTemplateFromFormato(body.formato),
      visual_prompt: body.visual_prompt,
      tema: body.tema,
      slide_titulo: body.slide_titulo,
      slide_corpo: body.slide_corpo,
      sujeito: body.sujeito,
      estilo_global: body.estilo_global,
    });

    if (caminho === "upload") {
      return new Response(
        JSON.stringify({
          error: `Estilo "${style_id}" requer UPLOAD manual (foto real). Use o botão de upload.`,
          requires_upload: true,
          style_id,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      return new Response(
        JSON.stringify({ error: blockReason ? `Bloqueado pelo Gemini: ${blockReason}` : "Modelo não retornou imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, serviceKey);
    const path = `${Date.now()}-s${body.slide_index}-${style_id}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supa.storage.from("social-media").upload(path, bytes, { contentType: mime, upsert: false });

    if (upErr) {
      console.error("upload err", upErr);
      return new Response(
        JSON.stringify({ url: `data:${mime};base64,${b64}`, prompt_usado: prompt, style_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: pub } = supa.storage.from("social-media").getPublicUrl(path);

    return new Response(
      JSON.stringify({ url: pub.publicUrl, prompt_usado: prompt, model: DEFAULT_MODEL, style_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("social-image-gen error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
