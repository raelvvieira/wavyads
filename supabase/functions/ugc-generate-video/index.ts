import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVOLINK_BASE_URL = "https://api.evolink.ai/v1";
const STORAGE_BUCKET = "creative-assets";

/**
 * Modelos de vídeo em ordem de preferência.
 *
 * A lista existe pelo mesmo motivo que existe no Fator Criativo: modelo
 * descontinuado é evento recorrente, e amarrar o recurso a uma string só
 * significa que a próxima descontinuação vira uma queda.
 *
 * Aqui ela cumpre um segundo papel, mais imediato: NÃO foi possível
 * confirmar quais modelos de vídeo o plano EvoLink desta conta oferece — a
 * rede desta máquina não alcança a API deles e sondar com a chave de
 * produção não seria correto. Então em vez de um palpite único, a função
 * desce a lista na primeira chamada e descobre sozinha. Se nenhum existir,
 * o erro diz exatamente o que foi tentado, que é o diagnóstico de que
 * precisamos para escolher outro provedor.
 */
const MODELOS_VIDEO = ["veo-3.1", "kling-v2.5", "seedance-2.0-pro", "sora-2"];

// Vídeo leva de 1 a 5 minutos, não os ~60s de uma imagem. Manter a janela da
// imagem aqui faria toda geração "falhar" por tempo justamente quando o
// provedor estava trabalhando direito.
const MAX_POLL_ATTEMPTS = 90;
const POLL_INTERVAL_MS = 4000;

interface Body {
  /** Prompt já montado pelo cliente. */
  prompt: string;
  /** Primeiro quadro: o retrato do avatar, ou a foto do produto. */
  imageUrl?: string | null;
  durationSeconds?: number;
  resolution?: string;
  audio?: boolean;
  aspectRatio?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      let host = url;
      try { host = new URL(url).hostname; } catch { /* mantém url bruta */ }
      throw new Error(`Tempo limite (${Math.round(timeoutMs / 1000)}s) ao chamar ${host}`);
    }
    throw e;
  }
}

function safeJsonParse(texto: string): any | null {
  try { return JSON.parse(texto); } catch { return null; }
}

/** Procura a URL do vídeo em qualquer um dos formatos que o provedor usa. */
function extrairUrlDeVideo(payload: any): string | null {
  const candidatos = [
    payload?.data?.[0]?.url,
    payload?.data?.[0]?.video_url,
    payload?.data?.video_url,
    payload?.results?.[0]?.url,
    payload?.video_url,
    payload?.output?.[0],
    payload?.url,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

function ehModeloInexistente(status: number, corpo: string): boolean {
  return (status === 404 || status === 400)
    && /not_found|no longer available|not found|unknown model|invalid model/i.test(corpo);
}

/**
 * Move o vídeo do provedor para o nosso Storage.
 *
 * Ao contrário da imagem, o vídeo NÃO passa por base64. Um mp4 de 8s em
 * 1080p passa de 10MB, e converter isso para base64 na memória do worker
 * custa ~33% a mais e já derrubou geração de imagem 4K no passado. Aqui os
 * bytes vão direto da resposta do provedor para o upload.
 *
 * A URL do provedor costuma expirar em horas — por isso não basta guardar
 * o link dele e ir embora.
 */
async function persistirVideo(urlDoProvedor: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.warn("SUPABASE_URL/SERVICE_ROLE_KEY ausentes — devolvendo a URL do provedor");
    return null;
  }

  const baixado = await fetchWithTimeout(urlDoProvedor, {}, 120_000);
  if (!baixado.ok) {
    console.error("Falha ao baixar o vídeo do provedor:", baixado.status);
    return null;
  }

  const mime = baixado.headers.get("content-type")?.split(";")[0] || "video/mp4";
  const ext = mime === "video/quicktime" ? "mov" : "mp4";
  const caminho = `ugc/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const upload = await fetchWithTimeout(
    `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${caminho}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": mime,
        "x-upsert": "true",
        "cache-control": "3600",
      },
      body: new Uint8Array(await baixado.arrayBuffer()),
    },
    120_000,
  );

  if (!upload.ok) {
    console.error("Falha ao gravar o vídeo no Storage:", upload.status, (await upload.text()).slice(0, 400));
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${caminho}`;
}

async function aguardarTask(taskId: string, apiKey: string): Promise<string> {
  for (let tentativa = 1; tentativa <= MAX_POLL_ATTEMPTS; tentativa++) {
    const resp = await fetchWithTimeout(
      `${EVOLINK_BASE_URL}/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      20_000,
    );
    const texto = await resp.text();
    const dados = safeJsonParse(texto);

    const url = extrairUrlDeVideo(dados);
    if (url) return url;

    const status = dados?.status ?? dados?.data?.status;
    if (status === "failed" || status === "error") {
      throw new Error(dados?.error?.message ?? "O provedor recusou a geração do vídeo.");
    }
    if (status === "completed" || status === "succeeded") {
      throw new Error("O provedor concluiu a task mas não devolveu o vídeo.");
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const minutos = Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000);
  throw new Error(`O vídeo não ficou pronto em ${minutos} minutos. A geração pode ainda estar rodando no provedor.`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("EVOLINK_API_KEY");
    if (!apiKey) throw new Error("EVOLINK_API_KEY não configurada");

    const body = (await req.json()) as Body;
    if (!body.prompt) {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resposta: Response | undefined;
    let usado = "";
    let ultimoCorpo = "";

    for (const modelo of MODELOS_VIDEO) {
      const r = await fetchWithTimeout(
        `${EVOLINK_BASE_URL}/videos/generations`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelo,
            prompt: body.prompt,
            duration: body.durationSeconds ?? 8,
            resolution: body.resolution ?? "1080p",
            aspect_ratio: body.aspectRatio ?? "9:16",
            audio: body.audio ?? true,
            ...(body.imageUrl ? { image_url: body.imageUrl } : {}),
          }),
        },
        60_000,
      );

      if (r.ok) { resposta = r; usado = modelo; break; }

      ultimoCorpo = await r.text();
      console.log(`ugc-generate-video: ${modelo} respondeu ${r.status}`);

      // Só modelo inexistente justifica descer a lista. Chave inválida ou
      // cota estourada seriam recusadas igual pelos outros — repetir
      // esconderia a causa real atrás do último erro.
      if (ehModeloInexistente(r.status, ultimoCorpo)) continue;

      if (r.status === 401 || r.status === 403) throw new Error("Chave da API EvoLink inválida ou sem permissão para vídeo.");
      if (r.status === 429) throw new Error("Limite de requisições EvoLink atingido. Tente novamente em instantes.");
      throw new Error(`EvoLink erro ${r.status}: ${ultimoCorpo.slice(0, 400)}`);
    }

    if (!resposta) {
      throw new Error(
        `A EvoLink não ofereceu nenhum modelo de vídeo. Tentei ${MODELOS_VIDEO.join(", ")}. `
        + `Última resposta: ${ultimoCorpo.slice(0, 200)}. `
        + `É preciso confirmar se o plano inclui vídeo, ou apontar esta função para outro provedor.`,
      );
    }

    const criado = safeJsonParse(await resposta.text());

    // O provedor pode devolver o vídeo direto ou uma task para acompanhar.
    let urlDoProvedor = extrairUrlDeVideo(criado);
    if (!urlDoProvedor) {
      const taskId = criado?.id ?? criado?.data?.id ?? criado?.task_id;
      if (!taskId) throw new Error("O provedor não devolveu vídeo nem identificador de task.");
      urlDoProvedor = await aguardarTask(String(taskId), apiKey);
    }

    const persistida = await persistirVideo(urlDoProvedor);

    return new Response(
      JSON.stringify({ videoUrl: persistida ?? urlDoProvedor, model: usado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ugc-generate-video error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro ao gerar o vídeo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
