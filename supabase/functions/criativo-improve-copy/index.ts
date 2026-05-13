import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Você é copywriter sênior de criativos publicitários. Aplique a metodologia da skill criativo-studio:

AVALIAÇÃO (5 critérios):
1. Clareza — mensagem em 3 segundos
2. Hierarquia — label/título/subtítulo/dados/CTA bem definidos
3. Brevidade — cada palavra ganha seu lugar
4. Gatilho — usa pelo menos um: urgência, escassez, benefício concreto, prova ou curiosidade
5. Tom — alinhado com o mood visual (se fornecido)

ESTRUTURA EM 5 BLOCOS VISUAIS (cada bloco corresponde a uma posição na arte):
- LABEL: topo, pequeno, uppercase (opcional — string vazia se não fizer sentido)
- TÍTULO: dominante, grande (obrigatório)
- SUBTÍTULO: complementar, médio (opcional)
- DADOS: data, local, vagas, preço (opcional — string vazia se não houver)
- CTA: ação, pill ou botão (obrigatório)

REGRAS:
- Português brasileiro, sem clichês, sem emojis exagerados
- Foco em benefício e gatilho
- Nunca prometa resultado mágico nem use superlativos absolutos proibidos pela Meta
- Se a copy for evento/lançamento, preencha DADOS. Se for branding/produto contínuo, deixe DADOS vazio.`;

const TOOL_PARAMS = {
  type: "object",
  properties: {
    label: { type: "string", description: "Label de topo, uppercase curto. String vazia se não fizer sentido." },
    titulo: { type: "string", description: "Título principal — dominante, até 60 caracteres" },
    subtitulo: { type: "string", description: "Subtítulo opcional, até 90 caracteres. String vazia se não usar." },
    dados: { type: "string", description: "Dados objetivos: data, local, vagas, preço. String vazia se não houver." },
    cta: { type: "string", description: "Call to action curto e direto" },
    avaliacao: {
      type: "object",
      properties: {
        clareza: { type: "string" },
        hierarquia: { type: "string" },
        brevidade: { type: "string" },
        gatilho: { type: "string" },
        tom: { type: "string" },
      },
      required: ["clareza", "hierarquia", "brevidade", "gatilho", "tom"],
      additionalProperties: false,
    },
    justificativa: { type: "string", description: "1-2 frases explicando o porquê dessa copy funcionar" },
  },
  required: ["label", "titulo", "subtitulo", "dados", "cta", "avaliacao", "justificativa"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const { rawCopy, context, moodAdjetivos } = await req.json();
    if (!rawCopy || typeof rawCopy !== "string") {
      return new Response(JSON.stringify({ error: "Envie a copy bruta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Ideia/copy bruta do anunciante:
"""
${rawCopy}
"""
${context ? `\nContexto do negócio: ${context}` : ""}
${moodAdjetivos ? `\nMood visual identificado: ${moodAdjetivos}` : ""}

Aplique os 5 critérios de avaliação e devolva a copy reescrita nos 5 blocos visuais.`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "improve_copy",
              description: "Devolve copy estruturada em 5 blocos visuais + avaliação",
              parameters: TOOL_PARAMS,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "improve_copy" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
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
    if (!toolCall) throw new Error("IA não retornou copy estruturada");
    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criativo-improve-copy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
