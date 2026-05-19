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

function buildPrompt(b: ReqBody) {
  const base = `Tema: ${b.tema}. ${b.estilo_global ? `Estilo visual: ${b.estilo_global}.` : ""}`;
  if (b.formato === "carrossel_texto") {
    return `${base} Instagram square 1:1. Solid color background, large bold typography. Featured text: "${b.slide_titulo || ""}". Minimal, editorial design. No photo. ${b.visual_prompt}`;
  }
  if (b.formato === "carrossel_lista") {
    return `${base} Instagram square 1:1. Clean design with list/bullet visual structure. Headline: "${b.slide_titulo || ""}". Modern infographic style. ${b.visual_prompt}`;
  }
  return `${base} Instagram square 1:1. ${b.visual_prompt}. Photographic or illustrative, suitable as background for text overlay. Leave negative space at the top for headline.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(body);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de geração atingido. Tente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha na geração de imagem" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const imgUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imgUrl) {
      console.error("no image in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Modelo não retornou imagem" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // upload to storage
    const match = imgUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
      return new Response(JSON.stringify({ url: imgUrl, prompt_usado: prompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const mime = match[1];
    const b64 = match[2];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = mime.includes("png") ? "png" : "jpg";

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, serviceKey);

    const path = `${Date.now()}-s${body.slide_index}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supa.storage.from("social-media").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) {
      console.error("upload err", upErr);
      return new Response(JSON.stringify({ url: imgUrl, prompt_usado: prompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: pub } = supa.storage.from("social-media").getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl, prompt_usado: prompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-image-gen error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
