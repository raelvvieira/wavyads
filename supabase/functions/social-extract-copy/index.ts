// Social Mídia Studio — extrai copy de um post viral
// Reel: transcrição via Apify (invideoiq/video-transcriber)
// Carrossel / Post: OCR via Google Vision (TEXT_DETECTION)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tipo = "reel" | "carrossel" | "post_estatico";

function detectTipo(item: any): Tipo {
  const t = (item?.type || item?.productType || "").toString().toLowerCase();
  if (t.includes("video") || t.includes("reel") || t.includes("clip")) return "reel";
  const children = item?.childPosts || item?.sidecarChildren || [];
  if (t.includes("sidecar") || t.includes("carousel") || (Array.isArray(children) && children.length > 1)) return "carrossel";
  return "post_estatico";
}

async function ocrImage(url: string, visionKey: string): Promise<string> {
  try {
    const imgResp = await fetch(url);
    if (!imgResp.ok) return "";
    const buf = new Uint8Array(await imgResp.arrayBuffer());
    // base64 encode
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const visionResp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: b64 }, features: [{ type: "TEXT_DETECTION", maxResults: 1 }] }],
      }),
    });
    const data = await visionResp.json();
    return data?.responses?.[0]?.fullTextAnnotation?.text?.trim() || "";
  } catch (e) {
    console.error("[OCR] erro:", e);
    return "";
  }
}

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getReelCandidates(item: any): string[] {
  const candidates = new Set<string>();
  const rawType = ((item?.type || item?.productType || "") as string).toLowerCase();
  const isReel = rawType.includes("video") || rawType.includes("reel") || rawType.includes("clip");
  const shortCode = getStringValue(item?.shortCode || item?.code);
  const itemUrl = getStringValue(item?.url || item?.permalink || item?.inputUrl);
  const directVideoUrls = [
    item?.videoUrl,
    item?.video_url,
    item?.videoSrc,
    item?.downloadUrl,
    item?.videoDownloadUrl,
  ]
    .map(getStringValue)
    .filter(Boolean);

  for (const direct of directVideoUrls) candidates.add(direct);

  if (itemUrl) {
    const match = itemUrl.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
    if (match?.[2]) {
      const code = match[2];
      if (isReel) {
        candidates.add(`https://www.instagram.com/reel/${code}/`);
        candidates.add(itemUrl);
        candidates.add(`https://www.instagram.com/tv/${code}/`);
        candidates.add(`https://www.instagram.com/p/${code}/`);
      } else {
        candidates.add(itemUrl);
        candidates.add(`https://www.instagram.com/reel/${code}/`);
        candidates.add(`https://www.instagram.com/p/${code}/`);
        candidates.add(`https://www.instagram.com/tv/${code}/`);
      }
    } else {
      candidates.add(itemUrl);
    }
  }

  if (shortCode) {
    if (isReel) {
      candidates.add(`https://www.instagram.com/reel/${shortCode}/`);
      candidates.add(`https://www.instagram.com/tv/${shortCode}/`);
      candidates.add(`https://www.instagram.com/p/${shortCode}/`);
    } else {
      candidates.add(`https://www.instagram.com/p/${shortCode}/`);
      candidates.add(`https://www.instagram.com/reel/${shortCode}/`);
      candidates.add(`https://www.instagram.com/tv/${shortCode}/`);
    }
  }

  return [...candidates].filter(Boolean);
}

function extractTranscript(result: any): string {
  // Novo formato oficial invideoiq (build 0.0.24+):
  // { status, data: { video_info, transcript: [{text,start,end}] } }
  const nested = result?.data?.transcript;
  if (Array.isArray(nested)) {
    const txt = nested.map((s: any) => (s?.text || "").toString()).filter(Boolean).join(" ").trim();
    if (txt) return txt;
  }
  if (typeof nested === "string" && nested.trim()) return nested.trim();

  // Fallbacks legados / variantes
  const possible = [
    result?.transcript,
    result?.output?.transcript,
    result?.output?.data?.transcript,
    result?.result?.transcript,
    result?.data?.output?.transcript,
  ];
  for (const segs of possible) {
    if (Array.isArray(segs)) {
      const txt = segs.map((s: any) => s?.text || s?.transcript || "").filter(Boolean).join(" ").trim();
      if (txt) return txt;
    }
    if (typeof segs === "string" && segs.trim()) return segs.trim();
  }

  if (typeof result?.text === "string" && result.text.trim()) return result.text.trim();
  return "";
}

async function transcribeReel(item: any, apifyToken: string): Promise<{ transcript: string; attempts: number; actorError: boolean }> {
  const urls = getReelCandidates(item);
  if (!urls.length) return { transcript: "", attempts: 0, actorError: false };
  let actorError = false;
  try {
    const actor = "invideoiq~video-transcriber";
    let attempts = 0;
    let allFailed = true;
    for (const url of urls) {
      attempts += 1;
      console.log("[Transcribe] attempt", attempts, "url:", url);
      const results = await runTranscriber(actor, apifyToken, url);
      console.log("[Transcribe] results length:", Array.isArray(results) ? results.length : "not-array");
      if (!Array.isArray(results) || results.length === 0) {
        actorError = true;
        continue;
      }
      const first = results[0] || {};
      console.log("[Transcribe] item keys:", Object.keys(first), "status:", first?.status, "data keys:", first?.data ? Object.keys(first.data) : null);
      if (first?.status === "error" || first?.error) {
        console.error("[Transcribe] actor returned error:", first?.error || first?.message || first?.data);
        actorError = true;
        continue;
      }
      allFailed = false;
      const txt = extractTranscript(first);
      if (txt) return { transcript: txt, attempts, actorError: false };
    }
    if (!allFailed) actorError = false;
    return { transcript: "", attempts, actorError };
  } catch (e) {
    console.error("[Transcribe] erro:", e);
    return { transcript: "", attempts: urls.length, actorError: true };
  }
}

async function runTranscriber(actor: string, apifyToken: string, url: string): Promise<any[]> {
  const runEndpoint = `https://api.apify.com/v2/acts/${actor}/run-sync?token=${apifyToken}&timeout=300`;
  const datasetEndpoint = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}&timeout=300`;

  try {
    const runResp = await fetch(runEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_urls: [url] }),
    });

    if (!runResp.ok) {
      console.error("[Transcribe] run-sync http", runResp.status, (await runResp.text()).slice(0, 500));
      return await runTranscriberDatasetFallback(datasetEndpoint, url);
    }

    const runPayload = await runResp.json();
    const runData = runPayload?.data || runPayload;
    const runStatus = runData?.status;
    const datasetId = runData?.defaultDatasetId;
    console.log("[Transcribe] run-sync status:", runStatus || "unknown", "dataset:", datasetId || "none");

    if (!datasetId) {
      return await runTranscriberDatasetFallback(datasetEndpoint, url);
    }

    const itemsResp = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&clean=true&format=json`);
    if (!itemsResp.ok) {
      console.error("[Transcribe] dataset http", itemsResp.status, (await itemsResp.text()).slice(0, 500));
      return await runTranscriberDatasetFallback(datasetEndpoint, url);
    }

    const items = await itemsResp.json();
    if (Array.isArray(items) && items.length > 0) return items;

    console.warn("[Transcribe] run-sync dataset empty; trying legacy dataset endpoint");
    return await runTranscriberDatasetFallback(datasetEndpoint, url);
  } catch (e) {
    console.error("[Transcribe] run-sync erro:", e);
    return await runTranscriberDatasetFallback(datasetEndpoint, url);
  }
}

async function runTranscriberDatasetFallback(endpoint: string, url: string): Promise<any[]> {
  const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_urls: [url] }),
      });
      if (!resp.ok) {
    console.error("[Transcribe] legacy http", resp.status, (await resp.text()).slice(0, 500));
    return [];
      }
      const results = await resp.json();
  return Array.isArray(results) ? results : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
    const VISION_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    const { item } = await req.json();
    if (!item || typeof item !== "object") {
      return new Response(JSON.stringify({ error: "item é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tipo = detectTipo(item);
    const legenda: string = (item.caption || item.text || item.description || "").toString();
    const hashtags: string[] = Array.isArray(item.hashtags) ? item.hashtags : [];

    const status: Record<string, string | null> = {
      legenda: legenda ? "ok" : "ausente",
      transcricao: null,
      ocr: null,
    };

    let transcricao = "";
    let textoVisual = "";
    let slides: { slide: number; texto: string; status: string }[] | undefined;
    let transcribe_calls = 0;
    let ocr_calls = 0;

    if (tipo === "reel") {
      if (!APIFY_TOKEN) {
        status.transcricao = "erro_config";
      } else {
        const res = await transcribeReel(item, APIFY_TOKEN);
        transcricao = res.transcript;
        transcribe_calls = res.attempts;
        status.transcricao = transcricao ? "ok" : res.actorError ? "erro_actor" : "sem_fala_detectada";
      }
    } else if (tipo === "carrossel") {
      const children: any[] = item.childPosts || item.sidecarChildren || [];
      if (!VISION_KEY) {
        status.ocr = "ocr_desabilitado";
        slides = children.map((_, i) => ({ slide: i + 1, texto: "", status: "ocr_desabilitado" }));
      } else {
        slides = [];
        for (let i = 0; i < children.length; i++) {
          const slideUrl = children[i]?.displayUrl || children[i]?.imageUrl || children[i]?.url;
          if (slideUrl) ocr_calls++;
          const texto = slideUrl ? await ocrImage(slideUrl, VISION_KEY) : "";
          slides.push({ slide: i + 1, texto, status: texto ? "ok" : "sem_texto" });
        }
        const totalTxt = slides.filter((s) => s.texto).length;
        status.ocr = totalTxt > 0 ? "ok" : "sem_texto_detectado";
      }
    } else {
      const imgUrl = item.displayUrl || (item.images || [])[0] || item.thumbnailUrl;
      if (!VISION_KEY) {
        status.ocr = "ocr_desabilitado";
      } else if (imgUrl) {
        ocr_calls = 1;
        textoVisual = await ocrImage(imgUrl, VISION_KEY);
        status.ocr = textoVisual ? "ok" : "sem_texto_detectado";
      } else {
        status.ocr = "ausente";
      }
    }

    // Monta copy_consolidada
    const parts: string[] = [];
    if (tipo === "reel" && transcricao) parts.push(transcricao);
    if (tipo === "post_estatico" && textoVisual) parts.push(textoVisual);
    if (tipo === "carrossel" && slides && slides.length) {
      const slidesTxt = slides.filter((s) => s.texto).map((s) => `[Slide ${s.slide}] ${s.texto}`).join("\n\n");
      if (slidesTxt) parts.push(slidesTxt);
    }
    if (legenda) parts.push(legenda);
    const copy_consolidada = parts.join("\n\n").trim();

    return new Response(JSON.stringify({
      tipo,
      transcricao: transcricao || undefined,
      texto_visual: textoVisual || undefined,
      slides,
      legenda,
      hashtags,
      copy_consolidada,
      status,
      usage: { transcribe_calls, ocr_calls },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[social-extract-copy] fatal", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
