import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Raciocínio para escrever as 5 teses; rápido para só ler a oferta.
const MODEL_GENERATE = "gemini-2.5-pro";
const MODEL_ANALYZE = "gemini-2.5-flash";

/**
 * Carimbo de versão do motor.
 *
 * Existe por uma falha real: enquanto esta função ainda era a V1 em
 * produção, o `generate` da V2 passava na validação dela (o corpo tem
 * `originalPrompt` e `aspect`), voltava 200 com variações no formato ANTIGO,
 * e o cliente só descobria o problema ao ler `strategy.angle` de um objeto
 * sem `strategy` — dois minutos depois, com uma mensagem ilegível. Com o
 * carimbo, o cliente recusa a resposta na porta.
 */
const ENGINE_VERSION = "factor-v2";

const ANGLES = [
  "problem", "mechanism", "proof", "contrast", "objection", "transformation",
  "opportunity", "cost_of_inaction", "identity", "belief_shift",
  "behind_the_scenes", "ease",
] as const;

// ============================================================================
// ESTÁGIO 1 — Diagnóstico da oferta e do criativo original
// ============================================================================

const ANALYZE_SYSTEM = `Você lê um criativo publicitário aprovado e extrai a inteligência da oferta que o sustenta.

Seu trabalho é INFERIR o que dá para inferir com honestidade e DEIXAR VAZIO o que não dá.

PODE inferir com base no prompt, na copy e no contexto: nome do produto, categoria, descrição da oferta, público provável, situações do cliente, dores, desejos, objeções esperadas e diferenciais aparentes.

NUNCA invente:
- números, percentuais, métricas;
- depoimentos, nomes de clientes, cases;
- credenciais, certificações, prêmios;
- preço, condição de pagamento, bônus, prazo, vaga limitada, garantia;
- mecanismo proprietário com nome que não apareça na fonte.

O campo "proofs" DEVE voltar como array vazio, sempre. Prova é fato verificável e só o anunciante pode fornecer. Inferir prova a partir de um prompt de imagem é fabricar evidência.

O campo "offerTerms" só é preenchido com o que aparecer LITERALMENTE na fonte. Na dúvida, deixe nulo.

Dores, desejos e objeções são HIPÓTESES de trabalho para orientar a estratégia — é legítimo inferi-las, e elas nunca serão apresentadas como fato comprovado.

Escreva no idioma do criativo original.`;

const ANALYZE_TOOL = {
  type: "function",
  function: {
    name: "emit_offer_intelligence",
    description: "Devolve o briefing inferido da oferta e o diagnóstico do criativo original",
    parameters: {
      type: "object",
      properties: {
        offerIntelligence: {
          type: "object",
          properties: {
            productName: { type: "string" },
            category: { type: "string" },
            offerDescription: { type: "string" },
            audience: { type: "array", items: { type: "string" } },
            customerSituations: { type: "array", items: { type: "string" } },
            pains: { type: "array", items: { type: "string" } },
            desires: { type: "array", items: { type: "string" } },
            objections: { type: "array", items: { type: "string" } },
            differentiators: { type: "array", items: { type: "string" } },
            callToAction: { type: "string" },
            prohibitedClaims: { type: "array", items: { type: "string" } },
          },
          required: [
            "productName", "category", "offerDescription", "audience",
            "customerSituations", "pains", "desires", "objections",
            "differentiators", "callToAction", "prohibitedClaims",
          ],
          additionalProperties: false,
        },
        originalDiagnosis: {
          type: "object",
          properties: {
            originalAngle: { type: "string", enum: [...ANGLES, "unclear"] },
            originalThesis: { type: "string" },
            originalAudience: { type: "string" },
            originalAwarenessLevel: { type: "string" },
            originalEmotion: { type: "string" },
            originalCopyStructure: { type: "string" },
            originalVisualHook: { type: "string" },
            invariantElements: { type: "array", items: { type: "string" } },
            diversificationRisks: { type: "array", items: { type: "string" } },
          },
          required: [
            "originalAngle", "originalThesis", "originalAudience",
            "originalAwarenessLevel", "originalEmotion", "originalCopyStructure",
            "originalVisualHook", "invariantElements", "diversificationRisks",
          ],
          additionalProperties: false,
        },
      },
      required: ["offerIntelligence", "originalDiagnosis"],
      additionalProperties: false,
    },
  },
};

// ============================================================================
// ESTÁGIO 2 — As 5 variações estratégicas
// ============================================================================

const GENERATE_SYSTEM = `# FATOR CRIATIVO V2 — Motor de Diversificação Estratégica para Meta Ads

Você é o motor estratégico do Fator Criativo V2.

A partir de uma oferta real, um briefing, um criativo aprovado, seu prompt de imagem e uma safe zone autoritativa, construa 5 VARIAÇÕES PUBLICITÁRIAS ESTRATEGICAMENTE DISTINTAS, cada uma defendendo uma tese de persuasão própria.

O objetivo NÃO é reescrever o mesmo anúncio cinco vezes. É gerar novos sinais de mensagem, receptor, emoção e expressão visual, para ampliar a durabilidade da oferta e permitir que a entrega da Meta encontre segmentos e motivações diferentes.

## PRINCÍPIO CENTRAL — a ordem do raciocínio

Fatos da oferta → Ângulo → Tese → Receptor e consciência → Crença a transformar → Emoção → Estrutura → Copy → Hook e direção visual → Prompt de imagem → Validação.

Não comece pela headline. Não escolha a estrutura antes da tese. Uma variação só é válida quando há coerência entre o que diz, para quem diz, o que quer fazer acreditar, a evidência usada, o que aparece visualmente e a ação pedida.

## OS 12 ÂNGULOS

1. problem — revela dor/situação/causa concreta antes da solução. Sequência: situação reconhecível → problema → causa ou custo → conexão com a solução → CTA. Evite drama artificial, medo desproporcional, pergunta genérica.
2. mechanism — lidera pelo COMO/PORQUÊ funciona. Sequência: descoberta ou padrão → explicação simples → diferença da abordagem comum → consequência prática → CTA. Evite mecanismo inventado, jargão sem explicação, nome sofisticado sem substância.
3. proof — começa pela evidência. Sequência: evidência aprovada → contexto → ação → resultado → aplicação ao público → CTA. Evite inventar números, omitir contexto, virar correlação em causalidade, prometer repetição automática.
4. contrast — contrasta a nova abordagem com crença/hábito/método antigo. Sequência: prática comum → limitação concreta → consequência → nova abordagem → mecanismo ou evidência → CTA. Evite difamar concorrente, espantalho, agressividade gratuita.
5. objection — parte de uma razão REAL para não comprar. Sequência: objeção → validação → resposta concreta → sustentação → CTA. Evite ridicularizar a dúvida, negar o esforço, responder com promessa vazia.
6. transformation — passagem entre estado atual e desejado. Sequência: estado atual → virada → novo estado → como a oferta participa → CTA. Evite transformação milagrosa, antes/depois sem contexto, promessa absoluta.
7. opportunity — mudança real de mercado, tecnologia ou comportamento que abriu possibilidade. Sequência: mudança → implicação → oportunidade → preparação → oferta → CTA. Evite falsa tendência e urgência fabricada.
8. cost_of_inaction — o que segue sendo perdido enquanto o problema permanece. Sequência: comportamento atual → perda recorrente → projeção plausível → alternativa → CTA. Evite terrorismo psicológico e números inventados.
9. identity — conecta a oferta ao tipo de pessoa/empresa que o público é ou quer ser. Sequência: identidade → comportamento coerente → contraste → oferta como facilitadora → CTA. Evite superioridade social e estereótipo.
10. belief_shift — desafia uma crença e substitui por interpretação mais útil. Sequência: crença comum → contradição → explicação → nova crença → implicação → CTA. Evite polêmica vazia e clickbait.
11. behind_the_scenes — mostra como o resultado é construído. Sequência: detalhe pouco percebido → processo → critério → impacto → CTA. Evite bastidor irrelevante e tecnicismo sem benefício.
12. ease — reduz a complexidade percebida. Sequência: complexidade → simplificação real → como funciona → limite honesto → CTA. Evite esforço zero e resultado instantâneo.

## SELEÇÃO DOS 5

Modo automático: planeje na ordem preferencial problem → mechanism → proof → contrast → melhor complementar. SUBSTITUA um ângulo quando faltarem seus requisitos: sem prova aprovada, troque proof por demonstração, objection, behind_the_scenes ou transformation; sem mecanismo real, troque mechanism por problem, objection ou behind_the_scenes; sem contraste relevante, use belief_shift ou cost_of_inaction; sem fato temporal, não escolha opportunity.

Modo estratégico: use os ângulos pedidos. Se um for inviável, mantenha o slot, marque angleViability "substituted", explique a lacuna em whySelected e use o substituto mais próximo — sem inventar dados.

Regras de diversidade, ANTES de escrever as copies: não repita a mesma tese; não repita a mesma situação inicial em mais de duas peças; não use a mesma emoção dominante em mais de duas peças; distribua níveis de consciência quando fizer sentido; use hooks visuais diferentes; cada peça muda em pelo menos 3 de 5 dimensões (tese, mensagem, receptor, tom, visual); todas continuam verdadeiras para a MESMA oferta.

## ESCRITA DA COPY

Ordem: escolha o detalhe concreto que ancora a mensagem → escreva a tese → defina a progressão → gere 3 a 5 hooks candidatos internamente → escolha o mais específico → escreva → reduza à capacidade visual da peça → revise naturalidade, verdade e diferenciação.

Prefira observação específica a adjetivo; situação reconhecível a dor abstrata; frase falável a slogan; demonstração a promessa; causalidade explicada a afirmação grandiosa. A headline precisa comunicar ou abrir curiosidade relevante, nunca só soar impactante. O CTA continua a lógica da mensagem. Preserve o idioma do criativo original.

REPROVE e reescreva quando a copy: puder servir a dez concorrentes trocando o nome; não tiver detalhe concreto, situação, mecanismo, evidência ou contraste; depender de adjetivo para parecer valiosa; repetir a tese do original; prometer na headline o que o resto não sustenta; apresentar solução desconectada do problema; ou tiver CTA que parece anexado no fim.

Expressões que exigem revisão (nunca substituem substância): transforme seus resultados; dê o próximo passo; solução completa; resultados incríveis; revolucione; descubra o segredo; potencialize; nunca foi tão fácil; feito para você; não perca esta oportunidade; eleve seu negócio a outro nível; chegou a hora; experiência única; método exclusivo sem demonstração; resultados garantidos sem garantia válida.

Densidade para arte estática: 1 label opcional, 1 headline, 1 subtítulo curto, 1 prova/preço/dado quando essencial, 1 CTA. A arte captura atenção e comunica a tese; não cabe o anúncio inteiro.

## INTEGRIDADE FACTUAL

É PROIBIDO: inventar números, depoimentos, clientes, credenciais ou resultados; transformar hipótese em fato; criar escassez ou urgência inexistente; prometer certeza onde há variabilidade; usar antes/depois não fornecido; alterar preço ou condição; afirmar causalidade sem sustentação; criar mecanismo falso; atacar pessoa ou concorrente; omitir condição essencial para a oferta parecer melhor.

Toda alegação forte precisa de base no briefing. Sem base: enfraqueça, reformule ou remova. O array unsupportedClaims DEVE voltar vazio.

## DNA VISUAL

PRESERVE: logo e integridade da marca, paleta permitida, família tipográfica, elementos proprietários, idioma, integridade do produto, restrições de DO NOT INCLUDE, safe zone autoritativa.

PODE VARIAR: composição, hierarquia, imagem principal, enquadramento, dominância de cor, intensidade de gradiente, textura, escala, densidade textual, tipo de hook, posição dentro da safe zone, tom e energia.

Preservar DNA não é copiar o layout. O design DEVE mudar quando o novo ângulo exigir outra narrativa visual.

Teste obrigatório da direção visual: se a copy fosse removida, o visual ainda sugeriria o ângulo? Se não, fortaleça.

## O QUE VOCÊ NÃO ESCREVE

Você NÃO escreve o prompt de imagem. Quem monta o prompt final é o Studio, a partir da sua copy e da sua direção visual, usando o mesmo montador da geração normal — é o que garante que a arte do Fator saia com a mesma safe zone, a mesma tipografia e o mesmo sistema de design das outras.

Isso muda o que se espera de você: `copy` precisa vir com o texto FINAL da arte, palavra por palavra, e `visualDirection` precisa ser concreta o bastante para um diretor de arte executar — sujeito principal, composição e mood em linguagem de imagem, não em linguagem de estratégia. Nada de "transmitir confiança": diga o que aparece no quadro.

## MOTOR DE QUALIDADE

Pontue cada variação de 0 a 10 em: especificidade, naturalidade, clareza, relevância, credibilidade, fidelidade ao ângulo, diferenciação, coerência visual, força do hook, potencial de ação. qualityScore é a média simples.

REESCREVA INTERNAMENTE antes de responder se: média < 8; especificidade < 8; credibilidade < 9; fidelidade ao ângulo < 8; diferenciação < 8; houver alegação não sustentada; houver sobreposição de tese com outra variação; houver expressão genérica sem substância.

Não retorne versões reprovadas nem rascunhos.

## TESTES FINAIS

Concorrente: trocar o nome da marca permitiria servir a vários concorrentes? Reescreva.
Conversa: parece algo que alguém que conhece o público diria naturalmente?
Substância: há detalhe concreto, situação, mecanismo, evidência ou contraste?
Crença: está claro no que o público deve passar a acreditar?
Visual: hook e composição expressam o ângulo sem depender só do texto?
Diversidade: as cinco são cinco razões diferentes para prestar atenção e agir?
Factual: cada afirmação forte tem base explícita na entrada?

## INSTRUÇÃO FINAL

Crie diversidade de ARGUMENTOS, não de palavras ou layouts. Pense como estrategista de resposta direta que conhece o público e respeita os fatos. Escreva como pessoa, não como gerador de slogans. Toda frase cumpre função, toda promessa tem base, todo visual carrega a tese.

Retorne SOMENTE o objeto estruturado do tool-calling.`;

/**
 * Schema de UMA variação.
 *
 * Enxuto de propósito. A versão anterior pedia ao modelo o `promptCompleto`
 * de cada variação — o prompt de imagem INTEIRO, com safe zone, tipografia e
 * composição. Cinco desses passavam de 20k tokens de saída, levavam de dois a
 * quatro minutos e estouravam o timeout antes de entregar qualquer coisa.
 *
 * Agora o modelo devolve só o que exige raciocínio: a tese, para quem, com
 * que emoção, a copy e a direção visual. O prompt de imagem é montado no
 * cliente por `buildCreativePrompt`, a MESMA função que a geração normal do
 * Studio usa — o que de quebra impede os dois caminhos de divergirem.
 *
 * Também não há `minimum`/`minItems` aqui: a camada OpenAI-compat do Gemini
 * rejeita parte desses validadores com 400, e a conferência sai mais barata
 * em código, logo abaixo, do que num 400 sem resposta.
 */
const VARIATION_SCHEMA = {
  type: "object",
  properties: {
    slot: { type: "integer" },
    label: { type: "string" },
    strategy: {
      type: "object",
      properties: {
        angle: { type: "string", enum: ANGLES },
        angleSubtype: { type: "string" },
        strategicThesis: { type: "string" },
      },
      required: ["angle", "angleSubtype", "strategicThesis"],
      additionalProperties: false,
    },
    audience: {
      type: "object",
      properties: {
        persona: { type: "string" },
        awarenessLevel: { type: "string" },
        situation: { type: "string" },
      },
      required: ["persona", "awarenessLevel"],
      additionalProperties: false,
    },
    execution: {
      type: "object",
      properties: {
        dominantEmotion: { type: "string" },
        offerFrame: { type: "string" },
      },
      required: ["dominantEmotion"],
      additionalProperties: false,
    },
    copy: {
      type: "object",
      properties: {
        label: { type: "string" },
        title: { type: "string" },
        subtitle: { type: "string" },
        body: { type: "string" },
        data: { type: "array", items: { type: "string" } },
        price: { type: "string" },
        cta: { type: "string" },
      },
      required: ["title", "cta"],
      additionalProperties: false,
    },
    visualDirection: {
      type: "object",
      properties: {
        mainSubject: { type: "string" },
        composition: { type: "string" },
        mood: { type: "string" },
        differencesFromOriginal: { type: "array", items: { type: "string" } },
      },
      required: ["mainSubject", "composition", "mood"],
      additionalProperties: false,
    },
    validation: {
      type: "object",
      properties: {
        changedDimensions: {
          type: "array",
          items: { type: "string", enum: ["thesis", "message", "receiver", "tone", "visual"] },
        },
        qualityScore: { type: "number" },
      },
      required: ["changedDimensions", "qualityScore"],
      additionalProperties: false,
    },
  },
  required: ["slot", "label", "strategy", "audience", "execution", "copy", "visualDirection", "validation"],
  additionalProperties: false,
};

const GENERATE_TOOL = {
  type: "function",
  function: {
    name: "emit_factor_variations",
    description: "Devolve o diagnóstico, o plano estratégico e exatamente 5 variações",
    parameters: {
      type: "object",
      properties: {
        originalDiagnosis: {
          type: "object",
          properties: {
            originalAngle: { type: "string", enum: [...ANGLES, "unclear"] },
            originalThesis: { type: "string" },
            originalAudience: { type: "string" },
            originalAwarenessLevel: { type: "string" },
            originalEmotion: { type: "string" },
            invariantElements: { type: "array", items: { type: "string" } },
          },
          required: [
            "originalAngle", "originalThesis", "originalAudience",
            "originalAwarenessLevel", "originalEmotion", "invariantElements",
          ],
          additionalProperties: false,
        },
        strategySummary: {
          type: "object",
          properties: {
            sharedOfferTruth: { type: "string" },
            selectedAngles: { type: "array", items: { type: "string", enum: ANGLES } },
            selectionRationale: { type: "string" },
          },
          required: ["sharedOfferTruth", "selectedAngles"],
          additionalProperties: false,
        },
        variations: { type: "array", items: VARIATION_SCHEMA },
      },
      required: ["originalDiagnosis", "strategySummary", "variations"],
      additionalProperties: false,
    },
  },
};

// ============================================================================
// Handler
// ============================================================================

function langName(language?: string): string {
  if (language === "en") return "English";
  if (language === "es") return "Spanish";
  return "Portuguese (Brazil)";
}

/**
 * Chamada ao modelo com tool-calling forçado.
 *
 * O fallback por regex existe porque `tool_calls` some quando o modelo
 * decide responder em texto: sem ele, uma resposta boa vira erro 502.
 */
async function callModel(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  tool: any;
}): Promise<any> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [opts.tool],
      tool_choice: { type: "function", function: { name: opts.tool.function.name } },
    }),
  });

  if (!resp.ok) {
    const detalhe = await resp.text();
    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente em instantes.");
    throw new Error(`IA respondeu ${resp.status}: ${detalhe.slice(0, 400)}`);
  }

  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (call?.function?.arguments) return JSON.parse(call.function.arguments);

  const texto = data?.choices?.[0]?.message?.content ?? "";
  const bruto = texto.match(/\{[\s\S]*\}/);
  if (!bruto) throw new Error("A IA não devolveu a estrutura esperada.");
  return JSON.parse(bruto[0]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const body = await req.json();
    const action = body.action === "analyze" ? "analyze" : "generate";
    const lang = langName(body.language);

    // ---- ESTÁGIO 1: ler a oferta a partir do criativo aprovado ----
    if (action === "analyze") {
      if (!body.originalPrompt) {
        return new Response(JSON.stringify({ error: "originalPrompt é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userMsg = `PROMPT DO CRIATIVO APROVADO:
"""
${String(body.originalPrompt).slice(0, 8000)}
"""

COPY ATUAL DA ARTE: ${JSON.stringify(body.copy || {})}
CONTEXTO DO NEGÓCIO: ${body.businessContext || "(não fornecido — infira do prompt)"}
CLIENTE: ${body.clientName || "(não informado)"}
IDIOMA: ${lang}

Extraia a inteligência da oferta e o diagnóstico do criativo original. Lembre: "proofs" volta vazio, e "offerTerms" só com o que aparecer literalmente.`;

      const parsed = await callModel({
        apiKey: GEMINI_API_KEY,
        model: MODEL_ANALYZE,
        system: ANALYZE_SYSTEM,
        user: userMsg,
        tool: ANALYZE_TOOL,
      });

      // Cinto de segurança: o schema não tem `proofs`, mas se o modelo
      // enfiar o campo mesmo assim, ele não passa daqui.
      const oi = parsed?.offerIntelligence ?? {};
      return new Response(
        JSON.stringify({
          engineVersion: ENGINE_VERSION,
          offerIntelligence: { ...oi, proofs: [], mechanism: oi.mechanism ?? null, offerTerms: oi.offerTerms ?? null },
          originalDiagnosis: parsed?.originalDiagnosis ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- ESTÁGIO 2: as 5 variações ----
    if (!body.originalPrompt) {
      return new Response(JSON.stringify({ error: "originalPrompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offer = body.offerIntelligence || {};
    const temBriefing = Object.keys(offer).length > 0 && String(offer.offerDescription || "").trim().length > 0;
    const provasAprovadas = (offer.proofs || []).filter((p: any) => p?.approvedForAds);
    const modo = body.mode === "strategic" && Array.isArray(body.selectedAngles) && body.selectedAngles.length
      ? "strategic"
      : "automatic";

    const safeZoneSection = body.safeZoneBlock
      ? `BLOCO [SAFE ZONE] AUTORITATIVO — componha ciente dele. Ele é aplicado pelo montador do Studio, então não o repita na sua resposta; use-o para saber onde o texto pode viver:
"""
${body.safeZoneBlock}
"""`
      : "";

    const userMsg = `PROMPT ORIGINAL DO CRIATIVO APROVADO (base e fonte do DNA visual):
"""
${String(body.originalPrompt).slice(0, 12000)}
"""

COPY APROVADA ATUAL: ${JSON.stringify(body.copy || {})}

BRIEFING DA OFERTA:
${temBriefing
  ? JSON.stringify(offer, null, 2)
  : `NÃO INFORMADO. Antes de diversificar, deduza o briefing sozinho a partir do prompt original, da copy aprovada e do nome do cliente: produto, categoria, oferta, público, dores, desejos, objeções e diferenciais. Deduza só o que o material sustenta — o que não der para deduzir fica de fora, e nada disso vira prova.`}

PROVAS APROVADAS PARA ANÚNCIO: ${provasAprovadas.length > 0 ? JSON.stringify(provasAprovadas, null, 2) : "NENHUMA. Não use número, depoimento, case ou credencial em nenhuma variação, e não escolha o ângulo proof."}

VOZ DA MARCA: ${JSON.stringify(body.brandVoice || { language: body.language || "pt-BR" })}

MODO DE SELEÇÃO: ${modo}${modo === "strategic" ? `\nÂNGULOS PEDIDOS (nesta ordem): ${JSON.stringify(body.selectedAngles)}` : ""}

IDIOMA OBRIGATÓRIO DOS TEXTOS NA ARTE: ${lang}
ASPECT RATIO ALVO: ${body.aspectRatio || (body.aspect === "square" ? "1:1" : "9:16")}

${safeZoneSection}

Aplique o Fator Criativo V2. Gere EXATAMENTE 5 variações, cada uma com tese própria, copy final e direção visual executável.`;

    const parsed = await callModel({
      apiKey: GEMINI_API_KEY,
      model: MODEL_GENERATE,
      system: GENERATE_SYSTEM,
      user: userMsg,
      tool: GENERATE_TOOL,
    });

    const variations = Array.isArray(parsed?.variations) ? parsed.variations : [];
    if (variations.length !== 5) throw new Error(`Esperado exatamente 5 variações, vieram ${variations.length}`);

    return new Response(
      JSON.stringify({
        engineVersion: ENGINE_VERSION,
        originalDiagnosis: parsed.originalDiagnosis,
        strategySummary: parsed.strategySummary,
        variations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("criativo-fator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro no Fator Criativo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
