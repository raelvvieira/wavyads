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

async function uploadReferenceImage(
  ref: string,
  apiKey: string,
): Promise<string> {
  if (/^https?:\/\//i.test(ref)) return ref;
  const parsed = parseDataUrl(ref);
  if (!parsed) throw new Error("Imagem de referência inválida");

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
      base64_data: ref,
      filename,
      file_name: filename,
      mime_type: parsed.mime,
    }),
  });

  const respText = await readLoggedText("EvoLink upload", resp);
  if (!resp.ok) throw new ProviderHttpError(resp.status, respText);

  const data = safeJsonParse(respText);
  // Prefer download_url (served with proper content-type) over file_url (no extension → EvoLink image processor rejects)
  const fileUrl =
    data?.data?.download_url ??
    data?.data?.downloadUrl ??
    data?.data?.file_url ??
    data?.data?.fileUrl;
  if (!fileUrl || typeof fileUrl !== "string") {
    throw new Error("EvoLink não retornou URL da imagem de referência");
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

    const rawRefs: string[] = [];
    const productImages = Array.isArray(body.productImages)
      ? body.productImages
      : [];
    rawRefs.push(...productImages.slice(0, 14));
    if (body.logoImage) rawRefs.push(body.logoImage);
    const aspectRef = body.aspectReference ?? (!isStory ? body.storyReference : null);
    if (aspectRef) rawRefs.push(aspectRef);

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
          rawRefs.map((ref) => uploadReferenceImage(ref, EVOLINK_API_KEY)),
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
