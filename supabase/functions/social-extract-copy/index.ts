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

async function transcribeReel(item: any, apifyToken: string): Promise<string> {
  const shortCode = item?.shortCode || item?.code || "";
  const url = shortCode ? `https://www.instagram.com/p/${shortCode}/` : (item?.url || "");
  if (!url) return "";
  try {
    const actor = "invideoiq~video-transcriber";
    const endpoint = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}&timeout=300`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_urls: [url] }),
    });
    if (!resp.ok) {
      console.error("[Transcribe] http", resp.status, await resp.text());
      return "";
    }
    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return "";
    const r0 = results[0] || {};
    const segs = r0.transcript || r0?.data?.transcript || [];
    if (Array.isArray(segs)) {
      const txt = segs.map((s: any) => s?.text || "").filter(Boolean).join(" ").trim();
      return txt;
    }
    if (typeof r0.text === "string") return r0.text.trim();
    return "";
  } catch (e) {
    console.error("[Transcribe] erro:", e);
    return "";
  }
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

    if (tipo === "reel") {
      if (!APIFY_TOKEN) {
        status.transcricao = "erro_config";
      } else {
        transcricao = await transcribeReel(item, APIFY_TOKEN);
        status.transcricao = transcricao ? "ok" : "sem_fala_detectada";
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[social-extract-copy] fatal", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
