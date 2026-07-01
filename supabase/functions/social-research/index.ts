import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function clip(value: string, max = 220): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function toLines(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tema, angulo, copy_referencia } = await req.json();
    if (!tema || typeof tema !== "string") {
      return new Response(JSON.stringify({ error: "tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = (copy_referencia && typeof copy_referencia === "string" && copy_referencia.trim())
      ? copy_referencia.trim().slice(0, 4500)
      : "";

    const userMessage = `Você NÃO está criando a copy final.
Sua função é intensificar a referência para a próxima etapa, preservando o assunto central e condensando o que deve sobreviver na recriação.

Tema base: ${tema}
${angulo ? `Ângulo informado: ${angulo}` : ""}
${reference ? `\nCopy original de referência:\n"""\n${reference}\n"""` : ""}

Pesquise na internet apenas para reforçar esse mesmo assunto, sem desviar a intenção original.
Priorize dados, tensões, dores e provas que ajudem a copy a ficar mais precisa.

Retorne SOMENTE um JSON válido, sem markdown, com esta estrutura:
{
  "tema": "tema final refinado em poucas palavras",
  "angulo": "uma linha explicando a leitura estratégica do assunto",
  "voz": "Rael" | "Wavy",
  "referencia_resumo": "resumo curto do post de referência",
  "tese_central": "frase que resume a tese que a copy deve defender",
  "gancho": "abertura mais forte possível para a nova copy",
  "dor_principal": "dor ou objeção que precisa ser atacada",
  "conflito_principal": "tensão central entre crença antiga e nova leitura",
  "promessa": "transformação ou ganho que a copy deve prometer",
  "preservar": ["3 a 5 ideias que precisam sobreviver da referência"],
  "ampliar": ["3 a 5 ângulos que devem ganhar força na recriação"],
  "evitar": ["3 a 5 desvios que não podem entrar na copy final"],
  "provas_e_dados": ["1 a 5 dados, estatísticas ou observações úteis"],
  "palavras_chave": ["3 a 8 termos que devem aparecer naturalmente"],
  "briefing_texto": "síntese final curta, pronta para ser lida na Etapa 3"
}

Regras importantes:
- Não copie a referência literalmente.
- Não invente personagens, empresas ou números fora da referência ou da pesquisa.
- Se a voz da referência for mais pessoal, retorne "Rael". Se for mais institucional/técnica, retorne "Wavy".
- O campo briefing_texto deve ser curto, objetivo e acionável.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2200,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Anthropic error:", data);
      return new Response(JSON.stringify({ error: data?.error?.message || "Falha na pesquisa" }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n\n").trim()
      : "";

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("social-research parse error:", parseErr, text);
      return new Response(JSON.stringify({ error: "Resposta da pesquisa não é JSON válido", raw: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const intensificacao = {
      tema: clip(String(parsed?.tema || tema), 72),
      angulo: clip(String(parsed?.angulo || angulo || ""), 180),
      voz: parsed?.voz === "Rael" ? "Rael" : "Wavy",
      referencia_resumo: clip(String(parsed?.referencia_resumo || reference || ""), 240),
      tese_central: clip(String(parsed?.tese_central || tema), 220),
      gancho: clip(String(parsed?.gancho || ""), 220),
      dor_principal: clip(String(parsed?.dor_principal || ""), 220),
      conflito_principal: clip(String(parsed?.conflito_principal || ""), 220),
      promessa: clip(String(parsed?.promessa || ""), 220),
      preservar: toLines(parsed?.preservar).slice(0, 5),
      ampliar: toLines(parsed?.ampliar).slice(0, 5),
      evitar: toLines(parsed?.evitar).slice(0, 5),
      provas_e_dados: toLines(parsed?.provas_e_dados).slice(0, 5),
      palavras_chave: toLines(parsed?.palavras_chave).slice(0, 8),
      briefing_texto: clip(String(parsed?.briefing_texto || "").trim() || [
        `Tema refinado, ${clip(String(parsed?.tema || tema), 72)}`,
        `Ângulo, ${clip(String(parsed?.angulo || angulo || ""), 120)}`,
        `Tese, ${clip(String(parsed?.tese_central || tema), 120)}`,
        `Ganho esperado, ${clip(String(parsed?.promessa || ""), 120)}`,
      ].filter(Boolean).join(". "), 360),
    };

    return new Response(JSON.stringify({ briefing: intensificacao.briefing_texto, intensificacao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-research error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
