import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "claude-sonnet-4-20250514";

interface CarrosselReq {
  mode: "carrossel";
  formato: "carrossel_imagem" | "carrossel_texto" | "carrossel_lista";
  tema: string;
  briefing: string;
  num_slides: number;
}
interface PostUnicoReq {
  mode: "post_unico";
  tema: string;
  briefing: string;
}
interface ReelReq {
  mode: "reel";
  tema: string;
  briefing: string;
}
interface RewriteReq {
  mode: "rewrite";
  slide: any;
  instrucao: string;
  contexto: { tema: string; formato: string };
}

type Req = CarrosselReq | PostUnicoReq | ReelReq | RewriteReq;

const SYSTEM_RULES = `Você é um copywriter sênior de Instagram em PT-BR. Regras:
- Nunca use travessões (—) ou hífens estilísticos. Use vírgulas ou ponto.
- Hook deve gerar conflito/curiosidade, nunca "Você sabia que".
- Uma ideia por slide. Frases curtas. Sem jargão.
- CTA específico (Salva esse post, Comenta X, Manda pra alguém).
- Hashtags relevantes e específicas, não genéricas.
- Sempre responda em JSON válido puro, sem markdown, sem texto fora do JSON.`;

function buildCarrosselPrompt(r: CarrosselReq) {
  return `Crie um carrossel de ${r.num_slides} slides sobre "${r.tema}".

Formato: ${r.formato} ${r.formato === "carrossel_texto" ? "(fundo sólido + tipografia grande, sem foto)" : r.formato === "carrossel_lista" ? "(formato lista numerada/bullets)" : "(foto de fundo + texto sobreposto)"}

Briefing de pesquisa:
${r.briefing}

Retorne JSON:
{
  "slides": [
    { "tipo": "cover" | "problema" | "agitacao" | "solucao" | "lista" | "prova" | "cta",
      "titulo": "texto curto e impactante (max 60 chars)",
      "corpo": "texto do slide (max 180 chars)",
      "visual_prompt": "descrição em inglês para gerar imagem do slide" }
  ],
  "legenda": "legenda do post, 3-6 parágrafos curtos, com quebras de linha",
  "hashtags": ["#tag1", "#tag2", ...]
}

Slide 1 sempre tipo "cover". Último sempre "cta".`;
}

function buildPostUnicoPrompt(r: PostUnicoReq) {
  return `Crie 1 post único sobre "${r.tema}".

Briefing:
${r.briefing}

Retorne JSON:
{
  "slides": [
    { "tipo": "cover", "titulo": "frase única impactante (max 80 chars)", "corpo": "", "visual_prompt": "descrição em inglês para imagem" }
  ],
  "legenda": "legenda completa, 3-6 parágrafos",
  "hashtags": ["#tag1", ...]
}`;
}

function buildReelPrompt(r: ReelReq) {
  return `Crie um roteiro de reel (15-30s) sobre "${r.tema}".

Briefing:
${r.briefing}

Retorne JSON:
{
  "roteiro": [
    { "tempo": "0-3s", "cena": "descrição visual da cena", "fala": "fala/texto na tela" }
  ],
  "legenda": "legenda do reel",
  "hashtags": ["#tag1", ...]
}

Mínimo 4 cenas, máximo 7. Primeira cena = hook visual forte.`;
}

function buildRewritePrompt(r: RewriteReq) {
  return `Reescreva este slide seguindo a instrução do usuário.

Contexto: tema="${r.contexto.tema}", formato=${r.contexto.formato}
Slide atual: ${JSON.stringify(r.slide)}
Instrução do usuário: ${r.instrucao}

Retorne JSON com o slide reescrito no mesmo formato (mantenha os mesmos campos).`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Req;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPrompt = "";
    if (body.mode === "carrossel") userPrompt = buildCarrosselPrompt(body);
    else if (body.mode === "post_unico") userPrompt = buildPostUnicoPrompt(body);
    else if (body.mode === "reel") userPrompt = buildReelPrompt(body);
    else if (body.mode === "rewrite") userPrompt = buildRewritePrompt(body);
    else {
      return new Response(JSON.stringify({ error: "mode inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: body.mode === "rewrite" ? 800 : 3000,
        system: SYSTEM_RULES,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("anthropic error", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim()
      : "";

    // tenta extrair JSON puro (remove possíveis cercas)
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("parse error", e, text);
      return new Response(JSON.stringify({ error: "Resposta do modelo não é JSON válido", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-copy error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
