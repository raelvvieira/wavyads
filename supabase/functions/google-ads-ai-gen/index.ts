import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

let SKILL_TEXT = "";
try {
  SKILL_TEXT = await Deno.readTextFile(new URL("./skill.md", import.meta.url));
} catch (e) {
  console.warn("skill.md not loaded:", e);
}
const SKILL_BLOCK = SKILL_TEXT
  ? `\n\n=== SKILL OBRIGATÓRIA — GOOGLE ADS BRASIL ===\nSiga ESTRITAMENTE estas regras de método, estrutura e conteúdo:\n${SKILL_TEXT}\n=== FIM DA SKILL ===\n`
  : "";

function obsBlock(obs: string) {
  return obs && obs.trim()
    ? `\n\nOBSERVAÇÕES IMPORTANTES (do cliente / equipe) — devem influenciar fortemente o resultado:\n${obs.trim()}`
    : "";
}

function descricaoGrupoBlock(d: string) {
  return d && d.trim()
    ? `\nContexto adicional do grupo: ${d.trim()}`
    : "";
}

async function callAI(systemPrompt: string, userPrompt: string, toolName: string, toolParams: Record<string, unknown>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: `Return structured data for ${toolName}`,
            parameters: toolParams,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    console.error(`AI gateway error [${status}]:`, text);
    if (status === 429) throw { status: 429, message: "Rate limit excedido. Tente novamente em alguns instantes." };
    if (status === 402) throw { status: 402, message: "Créditos insuficientes. Adicione créditos ao workspace." };
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        throw new Error("AI não retornou dados estruturados");
      }
    }
    throw new Error("AI não retornou dados estruturados");
  }
  return JSON.parse(toolCall.function.arguments);
}

function cidadeWarning(cidadeCampanha: string) {
  if (!cidadeCampanha) return "";
  return `\n\nATENÇÃO: Esta campanha é exclusiva para a cidade ${cidadeCampanha}. Todos os títulos, descrições e palavras-chave devem referenciar apenas esta cidade. Nunca misture cidades diferentes no mesmo grupo.`;
}

// ── CHAMADA 0: ANÁLISE ──
const SYSTEM_ANALYZE = `Você é especialista em Google Ads Performance Max para o mercado brasileiro. Analise sites e identifique frentes de anúncios de alta conversão. Responda APENAS JSON puro. Sem markdown. Sem backticks. Sem texto fora do JSON. Português do Brasil. Nunca use portuguesismos de Portugal.

REGRA CRÍTICA: cada frente é UM serviço único (message-match). Nunca misture serviços no mesmo grupo. A campanha é por cidade — todos os grupos referenciam a mesma cidade.${SKILL_BLOCK}`;

function buildAnalyzePrompt(site: string, descricao: string, cidadeCampanha: string, observacoes: string) {
  return `Analise o site ${site} com base nestas informações adicionais:
${descricao}

Identifique empresa, cidade, diferenciais e sugira EXATAMENTE 6 frentes de anúncio (grupos) de alta conversão para Google Ads Performance Max — cada frente sendo UM serviço/oferta específico (nunca genérico, nunca combinando serviços).

Retorne os dados estruturados com: empresa, segmento, cidade, cta (whatsapp/formulario/telefone), diferenciais (array de strings), e frentes (array com EXATAMENTE 6 itens — id slug curto, nome do serviço, icone emoji representativo, descricao curta de 1 linha, potencial alto/medio).${cidadeWarning(cidadeCampanha)}${obsBlock(observacoes)}`;
}

const ANALYZE_TOOL_PARAMS = {
  type: "object",
  properties: {
    empresa: { type: "string" },
    segmento: { type: "string" },
    cidade: { type: "string" },
    cta: { type: "string" },
    diferenciais: { type: "array", items: { type: "string" } },
    frentes: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          icone: { type: "string" },
          descricao: { type: "string" },
          potencial: { type: "string", enum: ["alto", "medio"] },
        },
        required: ["id", "nome", "icone", "descricao", "potencial"],
        additionalProperties: false,
      },
    },
  },
  required: ["empresa", "segmento", "cidade", "cta", "diferenciais", "frentes"],
  additionalProperties: false,
};

// ── CHAMADA 1: TÍTULOS ──
const SYSTEM_TITLES = `Você é especialista em Google Ads Performance Max para o mercado brasileiro. Crie títulos de alta conversão seguindo rigorosamente as regras abaixo. Responda APENAS JSON puro. Português do Brasil. Nunca use portuguesismos de Portugal.

REGRAS ABSOLUTAS:
- 15 títulos curtos: MÁXIMO 30 caracteres cada (nunca ultrapasse)
- 5 títulos longos: MÁXIMO 90 caracteres cada
- Títulos 1 e 2 DEVEM ser fixados (fixar: true). T1 = keyword principal. T2 = keyword + cidade.
- Use fórmulas: Benefício + Ação, Diferencial + CTA, KW + Local, Pergunta retórica, Prova social numérica
- Nunca repita a mesma informação entre títulos
- Nunca use preços, portuguesismos de Portugal, superlativos absolutos
- CTA brasileiro: WhatsApp é o mais eficiente. Use "Agende pelo WhatsApp", "Fale no WhatsApp"
- Inclua prova social com números reais quando possível
- Texto único: 200-280 caracteres descrevendo o negócio de forma objetiva, rico em keywords
- Caminho de exibição: dominio › slug-servico › cidade — sem acento, sem espaço${SKILL_BLOCK}`;

function buildTitlesPrompt(p: { empresa: string; servico: string; cidade: string; diferenciais: string; cta: string; cidadeCampanha: string; observacoes: string; descricaoGrupo: string }) {
  return `Empresa: ${p.empresa}
Serviço: ${p.servico}${descricaoGrupoBlock(p.descricaoGrupo)}
Cidade: ${p.cidadeCampanha || p.cidade}
Diferenciais: ${p.diferenciais}
CTA: ${p.cta}

Crie 15 títulos curtos (máx 30 chars), 5 títulos longos (máx 90 chars), caminho de exibição e texto único para Google Ads Performance Max para este grupo.${cidadeWarning(p.cidadeCampanha)}${obsBlock(p.observacoes)}`;
}

const TITLES_TOOL_PARAMS = {
  type: "object",
  properties: {
    grupo: { type: "string" },
    caminhoExibicao: { type: "string" },
    textoUnico: { type: "string" },
    titulos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          num: { type: "number" },
          texto: { type: "string" },
          fixar: { type: "boolean" },
        },
        required: ["num", "texto", "fixar"],
        additionalProperties: false,
      },
    },
    titulosLongos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string" },
        },
        required: ["texto"],
        additionalProperties: false,
      },
    },
  },
  required: ["grupo", "caminhoExibicao", "textoUnico", "titulos", "titulosLongos"],
  additionalProperties: false,
};

// ── CHAMADA 2: DESCRIÇÕES ──
const SYSTEM_DESCRIPTIONS = `Você é especialista em Google Ads Performance Max para o mercado brasileiro. Crie descrições de alta conversão seguindo rigorosamente as regras abaixo. Responda APENAS JSON puro. Português do Brasil. Nunca use portuguesismos de Portugal.

REGRAS ABSOLUTAS:
- Cada descrição: MÁXIMO 85 caracteres (nunca ultrapasse)
- Use fórmulas de alta conversão:
  PAS: Problema → Agitação → Solução
  Dado + CTA: "X anos de experiência. Agende pelo WhatsApp!"
  Benefício + Diferencial: "Resultado natural e preciso. Escola certificada."
  Emocional + Garantia: "Sorria com confiança. Garantia de satisfação."
- Sempre inclua pelo menos 1 descrição com CTA direto (WhatsApp, agende)
- Sempre inclua pelo menos 1 descrição com prova social
- Sempre inclua pelo menos 1 descrição com benefício do serviço
- Nunca repita informação entre descrições
- Nunca use preços, portuguesismos, superlativos absolutos${SKILL_BLOCK}`;

function buildDescriptionsPrompt(p: { empresa: string; servico: string; cidade: string; diferenciais: string; cta: string; cidadeCampanha: string; observacoes: string; descricaoGrupo: string }) {
  return `Empresa: ${p.empresa}
Serviço: ${p.servico}${descricaoGrupoBlock(p.descricaoGrupo)}
Cidade: ${p.cidadeCampanha || p.cidade}
Diferenciais: ${p.diferenciais}
CTA: ${p.cta}

Crie 5 descrições de Google Ads Performance Max para este grupo.${cidadeWarning(p.cidadeCampanha)}${obsBlock(p.observacoes)}`;
}

const DESCRIPTIONS_TOOL_PARAMS = {
  type: "object",
  properties: {
    descricoes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string" },
        },
        required: ["texto"],
        additionalProperties: false,
      },
    },
  },
  required: ["descricoes"],
  additionalProperties: false,
};

// ── CHAMADA 3: KEYWORDS + EXTENSÕES ──
const SYSTEM_KEYWORDS = `Você é especialista em Google Ads Performance Max para o mercado brasileiro. Crie palavras-chave, extensões e instruções de configuração. Responda APENAS JSON puro. Português do Brasil.

REGRAS:
- Palavras-chave: foco total no serviço específico, inclua variações com cidade, bairro, "perto de mim", variações de intenção (contratar, agendar, preço)
- Frases de destaque: 6 frases curtas e impactantes
- Snippets: 6 snippets relevantes
- Negativos específicos: termos a bloquear para este grupo
- Negativos globais: termos genéricos (grátis, barato, diy, emprego, vaga, etc.)
- Sitelinks: 6 sitelinks com texto (máx 25 chars), descricao1 e descricao2 (máx 35 chars cada), url
- Segmento público: mínimo 10 termos que pessoas realmente pesquisam no Google
- Diretrizes: exclusões e restrições de texto
- Instruções de campanha: tipo Performance Max, método de conversão, expansão URL false, otimização true, público 25-54

SNIPPETS: cada snippet deve ter no máximo 25 caracteres. Devem ser termos curtos e diretos como: Iniciantes, Avançados, Aulas Individuais, Aulas em Grupo, Certificado IKO, Equipamento Incluso. Nunca use frases longas nos snippets.

REGRA CRÍTICA DE ACENTUAÇÃO: Todas as palavras-chave devem usar português brasileiro correto com acentuação completa. Exemplos corretos: florianópolis, são paulo, goiânia, curitiba. Nunca omita acentos. O Google Ads no Brasil trata termos com e sem acento de forma diferente.

FRASES DE DESTAQUE: nunca use pontuação no final das frases de destaque (sem ponto, sem exclamação, sem interrogação). O Google Ads rejeita automaticamente frases de destaque com pontuação. Correto: 'Instrutores Certificados IKO'. Errado: 'Instrutores Certificados IKO!'.${SKILL_BLOCK}`;

function buildKeywordsPrompt(p: { empresa: string; servico: string; cidade: string; segmento: string; diferenciais: string; cidadeCampanha: string; observacoes: string; descricaoGrupo: string }) {
  return `Empresa: ${p.empresa}
Serviço: ${p.servico}${descricaoGrupoBlock(p.descricaoGrupo)}
Cidade: ${p.cidadeCampanha || p.cidade}
Segmento: ${p.segmento}
Diferenciais: ${p.diferenciais}

Crie temas de pesquisa, extensões e configurações para Google Ads Performance Max.${cidadeWarning(p.cidadeCampanha)}${obsBlock(p.observacoes)}`;
}

const KEYWORDS_TOOL_PARAMS = {
  type: "object",
  properties: {
    palavrasChave: { type: "array", items: { type: "string" } },
    frasesDestaque: { type: "array", items: { type: "string" } },
    snippets: { type: "array", items: { type: "string" } },
    negativasEspecificas: { type: "array", items: { type: "string" } },
    negativasGlobais: { type: "array", items: { type: "string" } },
    temasIndicadores: { type: "array", items: { type: "string" } },
    segmentoPublico: { type: "array", items: { type: "string" } },
    sitelinks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto: { type: "string" },
          descricao1: { type: "string" },
          descricao2: { type: "string" },
          url: { type: "string" },
        },
        required: ["texto", "descricao1", "descricao2", "url"],
        additionalProperties: false,
      },
    },
    diretrizes: {
      type: "object",
      properties: {
        exclusoes: { type: "array", items: { type: "string" } },
        restricoes: { type: "array", items: { type: "string" } },
      },
      required: ["exclusoes", "restricoes"],
      additionalProperties: false,
    },
    instrucoesCampanha: {
      type: "object",
      properties: {
        tipoCampanha: { type: "string" },
        metodoConversao: { type: "string" },
        expansaoUrl: { type: "boolean" },
        otimizacaoRecursos: { type: "boolean" },
        publicoIdade: { type: "string" },
        publicoGenero: { type: "string" },
        dicas: { type: "array", items: { type: "string" } },
      },
      required: ["tipoCampanha", "metodoConversao", "expansaoUrl", "otimizacaoRecursos", "publicoIdade", "publicoGenero", "dicas"],
      additionalProperties: false,
    },
  },
  required: ["palavrasChave", "frasesDestaque", "snippets", "negativasEspecificas", "negativasGlobais", "temasIndicadores", "segmentoPublico", "sitelinks", "diretrizes", "instrucoesCampanha"],
  additionalProperties: false,
};

// ── CHAMADA EXTRA: REGENERAR TEXTO ÚNICO ──
const SYSTEM_REGENERATE_TEXTO = `Você é especialista em Google Ads Performance Max para o mercado brasileiro. Reescreva o texto único de um anúncio. Responda APENAS JSON puro. Português do Brasil. Nunca use portuguesismos de Portugal.`;

const REGENERATE_TEXTO_TOOL_PARAMS = {
  type: "object",
  properties: {
    textoUnico: { type: "string" },
  },
  required: ["textoUnico"],
  additionalProperties: false,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require valid JWT and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas admins podem usar este recurso" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;
    const cidadeCampanha = body.cidadeCampanha || "";
    const observacoes = body.observacoes || "";
    const descricaoGrupo = body.descricaoGrupo || "";

    let result: unknown;

    switch (action) {
      case "analyze": {
        const { site, descricao } = body;
        if (!site && !descricao) throw new Error("Informe o site ou a descrição da empresa");
        result = await callAI(SYSTEM_ANALYZE, buildAnalyzePrompt(site || "", descricao || "", cidadeCampanha, observacoes), "analyze_site", ANALYZE_TOOL_PARAMS);
        break;
      }
      case "titles": {
        const { empresa, servico, cidade, diferenciais, cta } = body;
        if (!empresa || !servico) throw new Error("empresa e servico são obrigatórios");
        result = await callAI(SYSTEM_TITLES, buildTitlesPrompt({ empresa, servico, cidade, diferenciais, cta, cidadeCampanha, observacoes, descricaoGrupo }), "generate_titles", TITLES_TOOL_PARAMS);
        break;
      }
      case "descriptions": {
        const { empresa, servico, cidade, diferenciais, cta } = body;
        if (!empresa || !servico) throw new Error("empresa e servico são obrigatórios");
        result = await callAI(SYSTEM_DESCRIPTIONS, buildDescriptionsPrompt({ empresa, servico, cidade, diferenciais, cta, cidadeCampanha, observacoes, descricaoGrupo }), "generate_descriptions", DESCRIPTIONS_TOOL_PARAMS);
        break;
      }
      case "keywords": {
        const { empresa, servico, cidade, segmento, diferenciais } = body;
        if (!empresa || !servico) throw new Error("empresa e servico são obrigatórios");
        result = await callAI(SYSTEM_KEYWORDS, buildKeywordsPrompt({ empresa, servico, cidade, segmento, diferenciais, cidadeCampanha, observacoes, descricaoGrupo }), "generate_keywords", KEYWORDS_TOOL_PARAMS);
        break;
      }
      case "regenerate_texto_unico": {
        const { empresa, servico, cidade, diferenciais, cta, textoAtual } = body;
        if (!textoAtual) throw new Error("textoAtual é obrigatório");
        const userPrompt = `O texto único anterior ficou com ${textoAtual.length} caracteres. Reescreva em no máximo 270 caracteres mantendo: nome da empresa (${empresa}), cidade (${cidadeCampanha || cidade}), especialidade (${servico}), 2 diferenciais principais (${diferenciais}) e CTA WhatsApp. Seja objetivo, sem texto poético.${cidadeWarning(cidadeCampanha)}${obsBlock(observacoes)}`;
        result = await callAI(SYSTEM_REGENERATE_TEXTO, userPrompt, "regenerate_texto", REGENERATE_TEXTO_TOOL_PARAMS);
        break;
      }
      default:
        throw new Error(`Action desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("google-ads-ai-gen error:", e);
    const status = (e as any)?.status || 500;
    const message = e instanceof Error ? e.message : (e as any)?.message || "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
