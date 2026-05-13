import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é diretor de arte sênior especializado em criativos publicitários para redes sociais. Analise as imagens de referência fornecidas e extraia TODOS os detalhes visuais que servirão para recriar uma arte com o mesmo estilo. Responda em português brasileiro, de forma objetiva e estruturada.`;

const TOOL_PARAMS = {
  type: "object",
  properties: {
    paletaCores: {
      type: "array",
      description: "Cores principais identificadas em HEX",
      items: { type: "string" },
    },
    tipografia: {
      type: "string",
      description: "Estilo das fontes (serif, sans-serif moderno, display, manuscrita, peso, tamanho relativo)",
    },
    composicao: {
      type: "string",
      description: "Layout, hierarquia visual, alinhamento, regra dos terços, áreas de destaque",
    },
    elementosGraficos: {
      type: "string",
      description: "Formas, ícones, recortes, sobreposições, gradientes, texturas, efeitos especiais",
    },
    estilo: {
      type: "string",
      description: "Estilo geral (minimalista, maximalista, retrô, futurista, orgânico, brutalista, etc.)",
    },
    mood: {
      type: "string",
      description: "Sensação transmitida (luxuoso, divertido, urgente, sofisticado, jovem, etc.)",
    },
    promptVisual: {
      type: "string",
      description: "Prompt visual consolidado em INGLÊS pronto para usar em modelo de geração de imagem (Flux/Mystic/Imagen). Descreva cenário, paleta, composição, tipografia e efeitos. NÃO inclua texto/copy ainda.",
    },
  },
  required: ["paletaCores", "tipografia", "composicao", "elementosGraficos", "estilo", "mood", "promptVisual"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Envie ao menos uma imagem" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      {
        type: "text",
        text: `Analise estas ${images.length} imagem(ns) de referência e extraia todos os detalhes visuais para que possamos criar uma nova arte inspirada nelas.`,
      },
      ...images.map((url: string) => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_visual_analysis",
              description: "Estrutura a análise visual das referências",
              parameters: TOOL_PARAMS,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_visual_analysis" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou análise estruturada");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-analyze-refs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
