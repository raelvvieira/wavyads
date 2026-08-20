import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/** Ver a mesma lista em `criativo-fator`: modelo descontinuado é recorrente. */
const MODELOS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.1-pro-preview"];

/**
 * Palavras por segundo de fala em anúncio UGC.
 *
 * Não é chute: ~2.7 é a cadência de fala natural em português para vídeo
 * curto. O número importa porque o vídeo é gerado com duração FIXA — texto
 * curto demais faz o modelo preencher o silêncio com balbucio, e longo
 * demais faz a fala ser cortada no meio. O orçamento de palavras é o que
 * mantém a fala dentro do tempo.
 */
const PALAVRAS_POR_SEGUNDO = 2.7;

const SYSTEM = `Você escreve roteiros de UGC (user-generated content) para anúncios verticais de resposta direta.

UGC não é comercial. É uma pessoa real falando com a câmera do celular, como se estivesse contando para uma amiga. A escrita reflete isso: primeira pessoa, frases curtas, vocabulário do dia a dia, zero jargão de marketing. Nada de "revolucionário", "solução completa", "transforme sua vida".

Você devolve QUATRO segmentos, e cada um tem um trabalho distinto:

HOOK — para o dedo. Uma frase que interrompe a rolagem: um problema reconhecível, uma contradição, uma pergunta que a pessoa se faz. Nunca começa apresentando o produto.

BODY PT.1 — nomeia a dor por dentro. Como é conviver com o problema. Aqui a pessoa se reconhece.

BODY PT.2 — a virada. O que mudou, e por quê. É onde o produto entra, como meio, não como herói.

CTA — o próximo passo, dito de forma leve. Convite, não ordem.

REGRAS DURAS

Cada segmento tem um orçamento de palavras que você recebe. Respeite-o: escrever menos deixa silêncio que o gerador de vídeo preenche com balbucio; escrever mais faz a fala ser cortada no meio da frase.

Não invente número, percentual, prazo, preço, depoimento nem selo. Se o material não trouxer, não existe. Uma promessa sem base transforma o anúncio em problema jurídico do cliente.

Escreva a fala como ela sai da boca — sem rubricas, sem indicação de cena, sem emoji, sem aspas. O que você escrever é literalmente o que a pessoa vai falar.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_ugc_script",
    description: "Devolve os quatro segmentos do roteiro UGC",
    parameters: {
      type: "object",
      properties: {
        hook: { type: "string" },
        body_1: { type: "string" },
        body_2: { type: "string" },
        cta: { type: "string" },
      },
      required: ["hook", "body_1", "body_2", "cta"],
      additionalProperties: false,
    },
  },
};

const SEGMENTOS = ["hook", "body_1", "body_2", "cta"] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const body = await req.json();
    if (!body.productDescription) {
      return new Response(JSON.stringify({ error: "productDescription é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const segundos = Number(body.durationSeconds) || 8;
    const orcamento = Math.round(segundos * PALAVRAS_POR_SEGUNDO);

    const userMsg = `PRODUTO / OFERTA:
"""
${String(body.productDescription).slice(0, 4000)}
"""

CLIENTE: ${body.clientName || "(não informado)"}
IDIOMA: ${body.language === "en" ? "English" : "Português (Brasil)"}

ORÇAMENTO DE PALAVRAS: cada segmento dura ${segundos}s, então cada fala tem cerca de ${orcamento} palavras. Fique entre ${Math.round(orcamento * 0.8)} e ${orcamento}.

Escreva os quatro segmentos.`;

    let resposta: Response | undefined;
    let ultimoCorpo = "";

    for (const modelo of MODELOS) {
      const r = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
          tools: [TOOL],
          tool_choice: { type: "function", function: { name: TOOL.function.name } },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (r.ok) { resposta = r; break; }

      ultimoCorpo = await r.text();
      if (r.status === 404 && /NOT_FOUND|no longer available|not found/i.test(ultimoCorpo)) {
        console.warn(`ugc-script: modelo ${modelo} indisponível, tentando o próximo`);
        continue;
      }
      if (r.status === 429) throw new Error("Limite de uso da IA atingido. Tente em instantes.");
      throw new Error(`IA respondeu ${r.status}: ${ultimoCorpo.slice(0, 400)}`);
    }

    if (!resposta) {
      throw new Error(`Nenhum modelo de IA disponível para o roteiro. Tentei ${MODELOS.join(", ")}.`);
    }

    const dados = await resposta.json();
    const call = dados?.choices?.[0]?.message?.tool_calls?.[0];
    let roteiro: any;
    if (call?.function?.arguments) {
      roteiro = JSON.parse(call.function.arguments);
    } else {
      const bruto = (dados?.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/);
      if (!bruto) throw new Error("A IA não devolveu a estrutura esperada.");
      roteiro = JSON.parse(bruto[0]);
    }

    const faltando = SEGMENTOS.filter((s) => !String(roteiro?.[s] ?? "").trim());
    if (faltando.length) {
      throw new Error(`O roteiro voltou incompleto — faltou: ${faltando.join(", ")}.`);
    }

    return new Response(
      JSON.stringify({
        script: {
          hook: roteiro.hook,
          body_1: roteiro.body_1,
          body_2: roteiro.body_2,
          cta: roteiro.cta,
        },
        wordBudget: orcamento,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ugc-script error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao escrever o roteiro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
