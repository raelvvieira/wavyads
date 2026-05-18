import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

const SYSTEM_BUILDER = `You are a surgical photo-edit prompt writer for an image-generation model. Your job is to convert short user feedback into a precise, IMPERATIVE edit instruction that applies EVERY change the user asked for — additive AND subtractive — while preserving everything else with pixel-level fidelity.

CRITICAL PARSING RULES (most failures happen here):
1. DECOMPOSE the feedback into atomic changes. If the user mentioned N distinct changes (even in a single sentence with "e"/"and"/"mas"/"but"/"porém"), output exactly N numbered changes. Never merge multiple requests into one vague instruction.
2. SUBTRACTIVE CHANGES ARE MANDATORY. If the user asked to remove, reduce, take out, "menos", "sem", "tirar", "remover" — you MUST emit it as its own numbered change with the same strength as additive ones. NEVER silently drop a subtractive instruction in favor of an additive one. This is the #1 failure mode.
3. CONVERT QUALITATIVE INTO QUANTITATIVE IMPERATIVE:
   - "menos X" / "less X" / "fewer X" → "REMOVE at least 60-70% of the existing X. Only 1-2 small, subtle instances of X may remain, if any."
   - "sem X" / "no X" / "without X" → "COMPLETELY REMOVE every X. ZERO X must remain visible anywhere in the image."
   - "mais Y" / "more Y" → "SIGNIFICANTLY INCREASE Y, making it a clearly dominant element in its area (roughly 2-3x more than currently visible)."
   - "trocar X por Y" / "replace X with Y" → "REMOVE every X and REPLACE with Y in the same positions."

PRESERVATION RULES (apply to everything NOT mentioned by the user):
- Preserve identity: faces, body, hair, skin tone, clothing, hands, pose — EXACT.
- Preserve composition, framing, aspect ratio, camera angle, depth of field, lighting direction, color grading, mood and atmosphere.
- Preserve brand assets: logo, typography, copy text (every character), CTA, badges, colors, palette, gradients.
- No quality degradation, no resizing, no cropping, no re-rendering of untouched areas.
- When removing something, fill the area seamlessly matching the surrounding background/style.
- When changing text, change ONLY that text, keeping font, size, color, position and language identical.
- Do not invent new elements that were not asked for.

OUTPUT FORMAT (strict):
Start with the literal line: "EDIT THIS IMAGE — apply EVERY numbered change below. Each item is mandatory."
Then a numbered list (1., 2., 3., …) with one atomic change per line, written as an imperative command in English.
End with the literal line: "Preserve absolutely everything else: identity, framing, composition, lighting, palette, typography, all other text, logo, and overall quality. Do not skip any numbered change above — subtractive changes are as mandatory as additive ones."`;

function parseDataUrl(dataUrl: string): { mime: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

async function buildEditPrompt(userFeedback: string, originalPrompt: string, lang: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
  const userMsg = `User feedback (in ${lang === "en" ? "English" : lang === "es" ? "Spanish" : "Portuguese (Brazil)"}):
"""
${userFeedback}
"""

For context, this is the original prompt that produced the image (do NOT repeat it — use it ONLY to understand what must be preserved):
"""
${originalPrompt.slice(0, 4000)}
"""

Write the surgical edit instruction now.`;

  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_BUILDER },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    if (r.status === 429) throw new Error("Limite de uso atingido.");
    if (r.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Prompt builder: ${r.status} ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  const out = (data.choices?.[0]?.message?.content || "").trim();
  if (!out) throw new Error("Builder não retornou prompt");
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const { originalImage, userFeedback, originalPrompt, aspect, language } = await req.json();
    if (!originalImage || !userFeedback) {
      return new Response(JSON.stringify({ error: "originalImage e userFeedback obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const editPrompt = await buildEditPrompt(userFeedback, originalPrompt || "", language || "pt-BR");

    const ref = parseDataUrl(originalImage);
    if (!ref) throw new Error("originalImage deve ser data URL base64");

    const aspectNote = aspect === "square"
      ? "Keep the exact 1:1 square framing of the original (1080x1080)."
      : "Keep the exact 9:16 vertical framing of the original (1080x1920).";

    const fullPrompt = `CRITICAL: Apply EVERY numbered change in the instructions below. Do not skip any. Subtractive changes (remove / reduce / "menos" / "sem") are AS MANDATORY as additive ones — if you only add new elements without removing the ones the user asked to remove, the edit is a failure.\n\n${editPrompt}\n\n${aspectNote}`;

    console.log("[edit-image] userFeedback:", userFeedback);
    console.log("[edit-image] built editPrompt:", editPrompt);

    const parts: any[] = [{ text: fullPrompt }, { inline_data: { mime_type: ref.mime, data: ref.data } }];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini edit error", resp.status, t);
      const status = resp.status === 429 ? 429 : 502;
      return new Response(JSON.stringify({ error: `Gemini erro ${resp.status}: ${t.slice(0, 300)}` }), {
        status,
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
    if (!imageUrl) throw new Error("Modelo não retornou imagem editada");

    return new Response(JSON.stringify({ editedImageUrl: imageUrl, editPrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-edit-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
