// Motor de Conceito (Diretor de Arte) — decide O QUE a imagem do slide mostra.
// Roda ENTRE a copy e a geração de imagem. A saída `image_generation_core`
// alimenta o placeholder {VISUAL_PROMPT} do motor de renderização.
// Ver docs/wavy-image-skill/04-motor-de-conceito.md
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ART_DIRECTOR_SKILL, buildConceptPrompt } from "./art-director-skill.ts";

const MODEL = "claude-sonnet-5";

interface ReqBody {
  tema: string;
  briefing?: string;
  titulo: string;
  corpo?: string;
  tipoSlide?: string;
  formato?: string;
  slide_index: number;
  total: number;
  slides_around?: { titulo: string; corpo?: string }[];
  headline_safe_area?: string;
  marca?: string;
  publico?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body?.titulo?.trim()) {
      return new Response(JSON.stringify({ error: "titulo é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = buildConceptPrompt({
      tema: body.tema || "",
      briefing: body.briefing,
      titulo: body.titulo,
      corpo: body.corpo,
      tipoSlide: body.tipoSlide,
      formato: body.formato,
      slideIndex: body.slide_index ?? 0,
      total: body.total ?? 1,
      slidesAround: body.slides_around,
      headlineSafeArea: body.headline_safe_area,
      marca: body.marca,
      publico: body.publico,
    });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: ART_DIRECTOR_SKILL,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("anthropic error", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha ao gerar conceito" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim()
      : "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

    let concept: any;
    try {
      concept = JSON.parse(cleaned);
    } catch (e) {
      console.error("parse error", e, text.slice(0, 400));
      return new Response(JSON.stringify({ error: "Conceito não retornou JSON válido", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!concept?.image_generation_core) {
      return new Response(JSON.stringify({ error: "Conceito sem image_generation_core" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ concept }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-visual-concept error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
