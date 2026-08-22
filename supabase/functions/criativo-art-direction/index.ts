import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/**
 * Modelos em ordem de preferência.
 *
 * Mesma lista-em-vez-de-string do Fator Criativo, pelo mesmo motivo: o
 * `gemini-2.5-pro` foi descontinuado no meio da vida daquele recurso e
 * derrubou a função com um 404. Uma string única aqui só prepararia a
 * próxima queda. O `2.5-flash` fica por último porque está comprovadamente
 * vivo neste projeto — é rede, não escolha.
 */
const MODELS = ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash"];

/**
 * Carimbo de versão.
 *
 * O cliente recusa na porta uma resposta que não tenha este campo. Sem
 * isso, uma função desatualizada em produção responde 200 com um formato
 * antigo e o erro só aparece minutos depois, ilegível — foi exatamente o
 * que aconteceu com o Fator Criativo.
 */
const ENGINE_VERSION = "art-direction-v1";

const SYSTEM = `Você é diretor de arte de anúncios estáticos para Meta Ads. Recebe um pedido de criativo e devolve DUAS coisas: a direção visual da peça e a distribuição tipográfica da copy.

## O QUE VOCÊ ESCREVE

### 1. visualDirection — o que aparece no quadro

Escreva em LINGUAGEM DE IMAGEM, não em linguagem de estratégia. Nada de "transmitir confiança", "passar credibilidade", "reforçar autoridade": diga o que a câmera vê.

- mainSubject: a pessoa, o produto, o objeto ou a cena que domina o quadro. Um sujeito só. Diga quem/o quê, em que gesto ou situação, e com que enquadramento.
- composition: como o quadro se organiza — onde o sujeito fica, onde a massa de texto vive, que proporção ocupa cada um, qual o tratamento do fundo. Se houver foto anexada, diga como ela se integra (sangra no frame inteiro, recortada sobre fundo sólido, dividida ao meio).
- mood: dois a quatro adjetivos de tratamento visual, separados por vírgula. Luz, temperatura, saturação, textura. Não é emoção do público — é acabamento da imagem.

Regras que valem mais que a criatividade:

CONCRETUDE. Nunca use ideia invisível como sujeito. "O conceito de inovação" não se fotografa; uma pessoa, um objeto, um comportamento ou um ambiente, sim.

MOMENTO ESPECÍFICO. "Uma dentista trabalhando" é fraco. "Uma dentista de luvas aproximando a escala de cor do sorriso da paciente" é executável.

AÇÃO EM VEZ DE ADJETIVO. Prefira o que se vê acontecendo ao que se quer que pareça.

ESPECIFICIDADE VENCE GENERALIDADE. "Painel branco translúcido, opacidade 30%, borda de 0,5px, cantos de 24px" produz resultado melhor que "painel elegante". Quando souber a especificação, dê a especificação.

PROTEJA O TEXTO. Se a composição põe texto sobre foto, diga como o contraste é garantido — gradiente, painel, vinheta, área mais limpa. Nunca presuma que a foto terá contraste sozinha.

REJEITE POR PADRÃO: pessoa genérica em frente ao notebook; equipe sorrindo para a câmera; executivo apontando para gráfico; dashboards falsos; telas com texto ilegível; ícones flutuando; cérebro brilhando; holograma; lâmpada de ideia; engrenagem; alvo; sala futurista genérica; expressão dramática sem causa na cena.

### 2. copyRoles — a distribuição tipográfica da copy

Só preencha se houver copy na entrada. Se não houver, devolva null.

VOCÊ NÃO ESCREVE UMA PALAVRA. Não reescreve, não encurta, não expande, não corrige, não traduz, não acrescenta pontuação. Você apenas REPARTE o texto que recebeu entre os papéis disponíveis.

A regra é aritmética: concatenar label, title, subtitle, data e cta, nessa ordem, tem que reproduzir exatamente o texto de entrada. Só espaços e quebras de linha podem mudar — é isso que repartir significa. Qualquer palavra a mais ou a menos invalida a resposta inteira, e ela é descartada do outro lado.

Os papéis:
- label: uma abertura curta, quando existir. Vira caixa alta pequena com tracking largo.
- title: a linha dominante. É o único papel obrigatório.
- subtitle: o apoio do título.
- data: informação factual — data, local, preço, vagas.
- cta: SÓ se uma das linhas recebidas já for uma chamada à ação. Se nenhuma for, deixe cta vazio. Nunca promova uma linha comum a CTA e nunca invente uma.

Repartir uma frase longa em title e subtitle é legítimo e desejável: é assim que a hierarquia nasce. Repartir no meio de uma palavra, não.

## SAÍDA

Escreva visualDirection em PORTUGUÊS. Devolva SOMENTE o objeto estruturado do tool-calling.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_art_direction",
    description: "Devolve a direção visual da peça e a distribuição tipográfica da copy recebida",
    parameters: {
      type: "object",
      properties: {
        visualDirection: {
          type: "object",
          properties: {
            mainSubject: { type: "string" },
            composition: { type: "string" },
            mood: { type: "string" },
          },
          required: ["mainSubject", "composition", "mood"],
          additionalProperties: false,
        },
        copyRoles: {
          type: "object",
          properties: {
            label: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            data: { type: "string" },
            cta: { type: "string" },
          },
          required: ["title"],
          additionalProperties: false,
        },
      },
      required: ["visualDirection"],
      additionalProperties: false,
    },
  },
};

function langName(language?: string): string {
  if (language === "en") return "English";
  if (language === "es") return "Spanish";
  return "Portuguese (Brazil)";
}

/**
 * Percorre a lista de modelos e para no primeiro que existir.
 *
 * Só continua descendo em 404 de modelo inexistente. Qualquer outro erro é
 * problema real e sobe — insistir nele mascararia a causa.
 */
async function callModel(apiKey: string, user: string): Promise<any> {
  let ultimoIndisponivel = "";

  for (const model of MODELS) {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: TOOL.function.name } },
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const bruto = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (bruto) return JSON.parse(bruto);
      const texto = data?.choices?.[0]?.message?.content ?? "";
      const match = String(texto).match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("A IA não devolveu a estrutura esperada.");
    }

    const detalhe = await resp.text();
    if (resp.status === 404 && /NOT_FOUND|no longer available|not found/i.test(detalhe)) {
      console.warn(`criativo-art-direction: modelo ${model} indisponível, tentando o próximo`);
      ultimoIndisponivel = model;
      continue;
    }
    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente em instantes.");
    throw new Error(`IA respondeu ${resp.status}: ${detalhe.slice(0, 400)}`);
  }

  throw new Error(
    `Nenhum modelo de IA disponível para a direção de arte. Tentei ${MODELS.join(", ")} — o último a recusar foi ${ultimoIndisponivel}. É preciso apontar a função para um modelo válido nesta conta.`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

    const body = await req.json();
    const lang = langName(body.language);
    const brief = String(body.brief ?? "").trim();
    const copy = String(body.copy ?? "").trim();

    if (!brief && !copy) {
      throw new Error("Sem pedido nem copy, não há o que dirigir.");
    }

    const anexos = [
      body.hasAvatar ? "uma pessoa (avatar de persona) que precisa aparecer na arte" : "",
      body.hasProduct ? "o produto anunciado, que precisa aparecer fiel à foto" : "",
      body.hasReferences ? "imagens de referência visual" : "",
      body.hasLogo ? "o logo da marca" : "",
    ].filter(Boolean);

    const user = [
      `PEDIDO DO USUÁRIO: ${brief || "(não escreveu nada — deduza a peça a partir da copy e dos anexos)"}`,
      `CLIENTE: ${body.clientName || "(não informado)"}`,
      `FORMATO: ${body.aspectRatio || "9:16"}`,
      `IDIOMA DOS TEXTOS NA ARTE: ${lang}`,
      anexos.length
        ? `ANEXOS QUE VÃO PARA O GERADOR DE IMAGEM: ${anexos.join("; ")}. Componha contando com eles.`
        : "SEM ANEXOS: a imagem inteira será gerada do zero.",
      body.designSystemDoc
        ? `SISTEMA VISUAL JÁ EXTRAÍDO DAS REFERÊNCIAS (respeite; sua direção não pode contrariá-lo):\n"""\n${String(body.designSystemDoc).slice(0, 4000)}\n"""`
        : "",
      copy
        ? `COPY ESCRITA PELO USUÁRIO — reparta entre os papéis, sem mudar uma palavra:\n"""\n${copy.slice(0, 2000)}\n"""`
        : "SEM COPY: devolva copyRoles nulo.",
      "Devolva a direção visual e, se houver copy, a distribuição dela.",
    ].filter(Boolean).join("\n\n");

    const parsed = await callModel(apiKey, user);
    const vd = parsed?.visualDirection ?? {};

    return new Response(
      JSON.stringify({
        engineVersion: ENGINE_VERSION,
        visualDirection: {
          mainSubject: String(vd.mainSubject ?? "").trim(),
          composition: String(vd.composition ?? "").trim(),
          mood: String(vd.mood ?? "").trim(),
        },
        // Sem copy na entrada não pode haver papéis na saída — se o modelo
        // devolver algum, ele inventou o texto, que é justamente o que não
        // pode acontecer.
        copyRoles: copy ? (parsed?.copyRoles ?? null) : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("criativo-art-direction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
