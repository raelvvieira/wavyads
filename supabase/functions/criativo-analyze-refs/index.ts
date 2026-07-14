import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é diretor de arte sênior de criativos publicitários. Sua tarefa NÃO é descrever o que está nas imagens — é DECODIFICAR as decisões de design por trás delas, dimensão por dimensão, com a profundidade técnica que uma IA geradora de imagem precisa para reproduzir o DNA visual.

Princípio central: "Uma IA geradora não vê, ela LÊ." Não use palavras vagas como "elegante", "premium", "bonito". Use instruções precisas: opacidade %, blur strength, hex de cor, peso tipográfico (300/400/500/700), border-radius em px, posição em % do canvas.

Analise as 8 dimensões da metodologia: Composição, Fotografia, Paleta, Tipografia, Camadas/Efeitos, Hierarquia, Espaço, Mood. Responda em português brasileiro nos campos descritivos, mas o campo designSystemDoc deve ser em INGLÊS técnico (vai direto para o prompt de geração).

Além disso, gere antiPadroes: uma lista de 5-9 regras EXPLÍCITAS do que a IA geradora NUNCA deve fazer para não quebrar esse estilo específico. Isso é diferente de mood.evita (que são só adjetivos/palavras-chave curtas) — antiPadroes são regras acionáveis e específicas, no formato "NEVER faça X" ou "NEVER use Y — porque Z quebra o estilo". Escreva em INGLÊS técnico (mesmo motivo do designSystemDoc: vai direto pro prompt final). Derive as regras do que você observou nas imagens: se a composição tem muito espaço negativo, uma regra é "NEVER fill negative space with decorative elements". Se a tipografia é serifada e elegante, uma regra é "NEVER use bold geometric sans-serif for headlines". Seja específico à imagem analisada, não genérico.`;

const TOOL_PARAMS = {
  type: "object",
  properties: {
    composicao: {
      type: "object",
      properties: {
        formato: { type: "string", description: "ex: 9:16 vertical, 1:1 quadrado, 4:5 retrato" },
        estrutura: { type: "string", description: "Como o espaço é dividido — onde fica foto, onde fica texto, em que proporção" },
        hierarquia: { type: "string", description: "Ordem de leitura: o que o olho pousa primeiro, segundo, terceiro" },
        silencio: { type: "string", description: "Onde existe espaço intencional sem elementos" },
      },
      required: ["formato", "estrutura", "hierarquia", "silencio"],
      additionalProperties: false,
    },
    fotografia: {
      type: "object",
      properties: {
        tipo: { type: "string", description: "ex: pessoa meio corpo, produto centralizado, ambiente, abstrato" },
        luz: { type: "string", description: "Direção, qualidade, temperatura — ex: natural lateral quente, estúdio frontal difusa" },
        tratamento: { type: "string", description: "Tratamento de cor — ex: overlay warm 7%, dessaturado, virage cyan" },
        integracao: { type: "string", description: "Foto é background completo, recortada sobre fundo sólido, ou elemento gráfico" },
      },
      required: ["tipo", "luz", "tratamento", "integracao"],
      additionalProperties: false,
    },
    paleta: {
      type: "object",
      properties: {
        dominante: { type: "string", description: "Cor dominante com hex aproximado, ex: 'off-white #F4F0E8'" },
        secundaria: { type: "string", description: "Cor secundária com hex aproximado" },
        acento: { type: "string", description: "Cor de acento (usada em pouca quantidade mas com força)" },
        saturacao: { type: "string", description: "baixa, média ou alta" },
        hexes: {
          type: "array",
          description: "Lista achatada de todos os hex codes identificados, ex: ['#0A0A0A', '#F4F0E8', '#C9A84C']",
          items: { type: "string" },
        },
      },
      required: ["dominante", "secundaria", "acento", "saturacao", "hexes"],
      additionalProperties: false,
    },
    tipografia: {
      type: "object",
      properties: {
        familiaA: { type: "string", description: "Família 1 — referência de fonte (ex: Cormorant Garamond style serif), peso, uso, estilo" },
        familiaB: { type: "string", description: "Família 2 — referência de fonte, peso, uso, estilo. String vazia se só houver uma." },
        contraste: { type: "string", description: "Como as duas famílias contrastam (ex: serif elegante para título + sans bold uppercase para label)" },
        alinhamento: { type: "string", description: "Dominante: centralizado, esquerda, direita" },
      },
      required: ["familiaA", "familiaB", "contraste", "alinhamento"],
      additionalProperties: false,
    },
    camadas: {
      type: "array",
      description: "Camadas em ORDEM, de baixo para cima. Cada item descreve uma camada com especificações técnicas (opacidade, blur, cor, posição). Ex: 'Layer 1 — Background: full-bleed photo of subject, warm natural light'. 'Layer 2 — Gradient: bottom-to-top rgba(0,0,0,0.55) to rgba(0,0,0,0), covering 40% from bottom, for text legibility'. 'Layer 3 — Glass panel: white at 25% opacity, soft blur behind, 0.5px white border, border-radius 24px, centered at 70% from top'. Sempre inclua opacity, blur, border, radius e posição quando aplicável.",
      items: { type: "string" },
    },
    hierarquiaVisual: { type: "string", description: "Hierarquia em 3 níveis e o que guia o olhar" },
    espaco: { type: "string", description: "Densidade geral, uso de espaço negativo, padding interno dos painéis" },
    mood: {
      type: "object",
      properties: {
        adjetivos: {
          type: "array",
          description: "3-5 adjetivos de mood (ex: editorial, minimalista, bold, clínico)",
          items: { type: "string" },
        },
        referencias: {
          type: "array",
          description: "Marcas/publicações que esse design lembra (ex: Vogue Brasil, Apple, Aesop)",
          items: { type: "string" },
        },
        evita: {
          type: "array",
          description: "O que esse design NÃO é — coisas que ele rejeita (ex: cores vibrantes, sombras pesadas, poluição visual, clip-art)",
          items: { type: "string" },
        },
      },
      required: ["adjetivos", "referencias", "evita"],
      additionalProperties: false,
    },
    designSystemDoc: {
      type: "string",
      description: "Documento Design System COMPLETO em INGLÊS técnico, formato markdown, pronto para ser injetado no prompt final de geração. Deve incluir todas as 8 dimensões com as especificações técnicas (opacity %, blur, hex, border, radius, %position). Esse texto vai direto para o modelo gerador (Flux/Mystic/Imagen/GPT Image).",
    },
    antiPadroes: {
      type: "array",
      description: "5-9 regras EXPLÍCITAS e acionáveis do que a IA geradora NUNCA deve fazer para não quebrar este estilo específico (não confundir com mood.evita, que são só palavras-chave curtas). Em INGLÊS técnico, formato 'NEVER faça X — porque Y'. Específicas à imagem analisada, não genéricas.",
      items: { type: "string" },
    },
  },
  required: ["composicao", "fotografia", "paleta", "tipografia", "camadas", "hierarquiaVisual", "espaco", "mood", "designSystemDoc", "antiPadroes"],
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
        text: `Analise estas ${images.length} imagem(ns) de referência aplicando a metodologia das 8 dimensões. Decodifique decisões de design — não descreva conteúdo. Documente camadas com opacidade, blur, borda, radius e posição. Devolva também o designSystemDoc em inglês técnico, pronto pra prompt, e antiPadroes: regras explícitas do que a IA geradora nunca deve fazer para não quebrar este estilo específico.`,
      },
      ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
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
              description: "Estrutura a análise visual em 8 dimensões + Design System Document",
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
