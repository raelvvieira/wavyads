import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateBody {
  prompt: string;
  aspectRatio: "story" | "square";
  model?: string;
  quality?: "low" | "medium" | "high";
  isVariation?: boolean;
  productImages?: string[];
  logoImage?: string | null;
  storyReference?: string | null;
  aspectReference?: string | null;
}

const EVOLINK_BASE_URL = "https://api.evolink.ai/v1";
const EVOLINK_FILES_BASE_URL = "https://files-api.evolink.ai/api/v1";
const MODEL_NAME = "gpt-image-2";
const MAX_POLL_ATTEMPTS = 40;
const POLL_INTERVAL_MS = 1500;

class ProviderHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`EvoLink erro ${status}`);
    this.status = status;
    this.body = body;
  }
}

function parseDataUrl(
  dataUrl: string,
): { mime: string; bytes: Uint8Array } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1], bytes };
  } catch {
    return null;
  }
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readLoggedText(label: string, resp: Response): Promise<string> {
  const respText = await resp.text();
  console.log(`${label} status:`, resp.status);
  console.log(`${label} raw response:`, respText.slice(0, 800));
  return respText;
}

function buildProviderErrorMessage(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return "Chave da API EvoLink inválida ou sem permissão.";
  }
  if (status === 429) {
    return "Limite de requisições EvoLink atingido. Tente novamente em instantes.";
  }
  return `EvoLink erro ${status}: ${body}`;
}

function buildProviderErrorResponse(status: number, body: string): Response {
  return new Response(
    JSON.stringify({
      error: buildProviderErrorMessage(status, body),
      status,
      body,
    }),
    {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function fetchUrlToBase64DataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Falha ao baixar imagem do EvoLink (${r.status})`);
  }
  const mime = r.headers.get("content-type")?.split(";")[0] || "image/png";
  const buf = new Uint8Array(await r.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

function mapResolution(quality: "low" | "medium" | "high"): string {
  if (quality === "high") return "4K";
  if (quality === "medium") return "2K";
  return "1K";
}

const MAX_REFERENCE_IMAGE_BYTES = 9.5 * 1024 * 1024; // EvoLink recusa acima de 10MB

// EvoLink exige que a URL da imagem seja diretamente baixável por eles
// (https://docs.evolink.ai/.../gpt-image-2-image-generation). Uma URL que
// devolve 401/403/redirect/HTML de erro passa despercebida no upload e só
// falha depois, no /images/generations, com a mensagem genérica "Image
// processing failed" — então confirmamos aqui, logo após o upload.
async function verifyUrlPubliclyAccessible(url: string): Promise<void> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return;
  } catch {
    // alguns hosts recusam HEAD — cai pro GET abaixo antes de desistir
  }
  const get = await fetch(url, { headers: { Range: "bytes=0-0" } });
  if (!get.ok && get.status !== 206) {
    throw new Error(`status ${get.status}`);
  }
}

async function uploadReferenceImage(
  ref: string,
  apiKey: string,
  label: string,
): Promise<string> {
  // Referências já hospedadas (logo/produto salvos antes, story reutilizada
  // pra consistência do quadrado) chegam aqui como URL, não como base64. Elas
  // NÃO passam pelo upload/renomeio abaixo se devolvidas direto — e como o
  // app grava tudo com extensão .png independente do formato real (bug à
  // parte, também corrigido no frontend), a URL pode ter extensão errada e
  // ser rejeitada pelo EvoLink por "formato". Por isso baixamos e reenviamos
  // sempre pelo mesmo caminho abaixo, com a extensão derivada do Content-Type
  // real — mais lento, mas elimina essa classe inteira de erro.
  let dataUrl = ref;
  if (/^https?:\/\//i.test(ref)) {
    try {
      dataUrl = await fetchUrlToBase64DataUrl(ref);
    } catch (err) {
      console.error(`Falha ao baixar a imagem "${label}" da URL já hospedada:`, err);
      throw new Error(`Não consegui baixar a imagem "${label}" pra reenviar. Verifique se ela ainda existe.`);
    }
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error(`Imagem inválida (${label})`);

  if (parsed.bytes.length > MAX_REFERENCE_IMAGE_BYTES) {
    const sizeMb = (parsed.bytes.length / (1024 * 1024)).toFixed(1);
    throw new Error(
      `A imagem "${label}" está muito grande (${sizeMb}MB, limite 10MB). Reduza o tamanho e envie de novo.`,
    );
  }

  // Extension hint so EvoLink's image processor accepts the URL
  const extFromMime =
    parsed.mime === "image/jpeg" ? "jpg" :
    parsed.mime === "image/webp" ? "webp" :
    parsed.mime === "image/gif" ? "gif" : "png";
  const filename = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromMime}`;

  const resp = await fetch(`${EVOLINK_FILES_BASE_URL}/files/upload/base64`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64_data: dataUrl,
      filename,
      file_name: filename,
      mime_type: parsed.mime,
    }),
  });

  const respText = await readLoggedText(`EvoLink upload (${label})`, resp);
  if (!resp.ok) throw new ProviderHttpError(resp.status, respText);

  const data = safeJsonParse(respText);
  // file_url é o campo documentado pelo EvoLink; download_url/variantes
  // ficam como fallback caso a resposta venha num formato diferente.
  const fileUrl =
    data?.data?.file_url ??
    data?.data?.fileUrl ??
    data?.data?.download_url ??
    data?.data?.downloadUrl;
  if (!fileUrl || typeof fileUrl !== "string") {
    throw new Error(`EvoLink não retornou URL da imagem "${label}"`);
  }

  try {
    await verifyUrlPubliclyAccessible(fileUrl);
  } catch (err) {
    console.error(`URL da imagem "${label}" não ficou acessível após upload:`, err);
    throw new Error(
      `A imagem "${label}" foi enviada mas não ficou acessível publicamente pra geração. Tente enviar de novo.`,
    );
  }

  return fileUrl;
}

async function resolveImageFromPayload(data: any): Promise<string | null> {
  const b64 = data?.data?.[0]?.b64_json;
  if (typeof b64 === "string" && b64) {
    return `data:image/png;base64,${b64}`;
  }

  const maybeUrl = data?.data?.[0]?.url ?? data?.results?.[0];
  if (typeof maybeUrl === "string" && maybeUrl) {
    return await fetchUrlToBase64DataUrl(maybeUrl);
  }

  return null;
}

const STORAGE_BUCKET = "creative-assets";

// A imagem gerada volta do EvoLink como base64. Trafegar esse base64 inteiro
// (uma imagem 4K passa de 10-20MB) pela resposta do invoke é frágil: chega
// truncado/corrompido no navegador e o arquivo salvo fica quebrado. Então
// gravamos a imagem no Storage aqui, no servidor, e devolvemos só a URL
// pública permanente. Se algo falhar, quem chama volta a devolver o data URI
// (comportamento antigo) pra não quebrar totalmente a geração.
async function persistImageToStorage(dataUrl: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.warn("SUPABASE_URL/SERVICE_ROLE_KEY ausentes — devolvendo data URI");
    return null;
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;

  const ext =
    parsed.mime === "image/jpeg" ? "jpg" :
    parsed.mime === "image/webp" ? "webp" :
    parsed.mime === "image/gif" ? "gif" : "png";
  const objectPath = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const uploadResp = await fetch(
    `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": parsed.mime,
        "x-upsert": "true",
        "cache-control": "3600",
      },
      body: parsed.bytes,
    },
  );

  if (!uploadResp.ok) {
    const body = await uploadResp.text();
    console.error("Falha ao gravar imagem no Storage:", uploadResp.status, body.slice(0, 400));
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}

async function waitForTaskImage(
  taskId: string,
  apiKey: string,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const resp = await fetch(`${EVOLINK_BASE_URL}/tasks/${taskId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const respText = await readLoggedText(
      `EvoLink task ${attempt}/${MAX_POLL_ATTEMPTS}`,
      resp,
    );
    if (!resp.ok) throw new ProviderHttpError(resp.status, respText);

    const data = safeJsonParse(respText);
    if (!data) {
      throw new Error("Resposta inválida ao consultar tarefa do EvoLink");
    }

    const imageUrl = await resolveImageFromPayload(data);
    if (imageUrl) return imageUrl;

    if (data.status === "failed") {
      throw new Error(
        data?.error?.message || "EvoLink falhou ao gerar a imagem",
      );
    }

    if (data.status === "completed") {
      console.error(
        "Sem imagem na tarefa concluída do EvoLink:",
        JSON.stringify(data).slice(0, 600),
      );
      throw new Error("EvoLink não retornou imagem");
    }

    if (attempt < MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error("Tempo limite ao aguardar imagem do EvoLink");
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const EVOLINK_API_KEY = Deno.env.get("EVOLINK_API_KEY");
    if (!EVOLINK_API_KEY) throw new Error("EVOLINK_API_KEY não configurada");

    const body = (await req.json()) as GenerateBody;
    const { prompt, aspectRatio } = body;

    if (!prompt || !aspectRatio) {
      return new Response(
        JSON.stringify({ error: "prompt e aspectRatio são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isStory = aspectRatio === "story";
    const aspectInstruction = isStory
      ? "OUTPUT FORMAT: vertical 9:16 aspect ratio, 1080x1920px Instagram Story format. Render all text elements in Portuguese Brazil."
      : "OUTPUT FORMAT: perfect 1:1 square aspect ratio, 1080x1080px Instagram post format. Render all text elements in Portuguese Brazil.";
    const size = isStory ? "2:3" : "1:1";
    const quality = body.quality ?? "low";
    const resolution = mapResolution(quality);

    const rawRefs: { label: string; data: string }[] = [];
    const productImages = Array.isArray(body.productImages)
      ? body.productImages
      : [];
    productImages.slice(0, 14).forEach((img, i) =>
      rawRefs.push({ label: `produto/pessoa #${i + 1}`, data: img })
    );
    if (body.logoImage) rawRefs.push({ label: "logo", data: body.logoImage });
    const aspectRef = body.aspectReference ?? (!isStory ? body.storyReference : null);
    if (aspectRef) rawRefs.push({ label: "referência de consistência visual", data: aspectRef });

    const hasRefs = rawRefs.length > 0;
    const referenceHints = hasRefs
      ? `[REFERENCE IMAGES]\n${rawRefs.length} reference image(s) attached. Use them as the exact source of truth for faces, product appearance and brand logo. Preserve every detail — do not alter faces, skin tone, hair, clothing, product shape or brand mark.`
      : "";

    const fullPrompt = [aspectInstruction, prompt, referenceHints]
      .filter(Boolean)
      .join("\n\n");

    console.log("criativo-generate (evolink gpt-image-2) →", {
      route: "generations",
      aspectRatio,
      size,
      resolution,
      quality,
      prompt_chars: fullPrompt.length,
      refs: rawRefs.length,
    });

    const imageUrls = hasRefs
      ? await Promise.all(
          rawRefs.map((ref) => uploadReferenceImage(ref.data, EVOLINK_API_KEY, ref.label)),
        )
      : [];

    const requestBody: Record<string, unknown> = {
      model: MODEL_NAME,
      prompt: fullPrompt,
      n: 1,
      size,
      resolution,
      quality,
    };

    if (imageUrls.length > 0) {
      requestBody.image_urls = imageUrls;
    }

    const createResp = await fetch(`${EVOLINK_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EVOLINK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const createRespText = await readLoggedText("EvoLink create", createResp);
    if (!createResp.ok) {
      return buildProviderErrorResponse(createResp.status, createRespText);
    }

    const createData = safeJsonParse(createRespText);
    if (!createData) {
      throw new Error("Resposta inválida do EvoLink");
    }

    const immediateImage = await resolveImageFromPayload(createData);
    const taskId = createData?.id;

    let imageUrl = immediateImage;
    if (!imageUrl) {
      if (!taskId || typeof taskId !== "string") {
        console.error(
          "Sem imagem e sem task id na resposta EvoLink:",
          JSON.stringify(createData).slice(0, 600),
        );
        throw new Error("EvoLink não retornou imagem");
      }
      imageUrl = await waitForTaskImage(taskId, EVOLINK_API_KEY);
    }

    // Grava no Storage (servidor) e devolve URL permanente em vez do base64
    // gigante — evita corrupção/truncamento no trânsito. Fallback: data URI.
    if (imageUrl.startsWith("data:")) {
      const storedUrl = await persistImageToStorage(imageUrl);
      if (storedUrl) imageUrl = storedUrl;
    }

    return new Response(JSON.stringify({ imageUrl, model: MODEL_NAME }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof ProviderHttpError) {
      return buildProviderErrorResponse(e.status, e.body);
    }

    console.error("criativo-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
