// Smart image search & generation orchestrator for Social Studio.
// Ports the Python "Image Agent v3.1" logic with Gemini direct as the AI fallback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type TipoVisual = "pessoa" | "empresa" | "hardware" | "diagrama" | "ambiente";

interface ReqBody {
  slide_index: number;
  slide_titulo?: string;
  slide_corpo?: string;
  slide_tipo?: string;
  visual_prompt?: string;
  formato?: string;
  tema?: string;
  estilo_global?: string;
}

const DOMINIOS_REJEITADOS = [
  "shutterstock", "gettyimages", "istockphoto", "dreamstime",
  "alamy", "depositphotos", "stock.adobe", "bigstockphoto",
  "123rf", "canstockphoto", "stockfresh", "vectorstock", "clipart",
];

const DOMINIOS_TECH = ["theverge.com", "techcrunch.com", "wired.com", "arstechnica.com", "engadget.com", "thenextweb.com", "9to5mac.com", "macrumors.com"];
const DOMINIOS_NEGOCIOS = ["bloomberg.com", "businessinsider.com", "fortune.com", "forbes.com", "wsj.com", "ft.com", "cnbc.com"];
const DOMINIOS_IMPRENSA = ["reuters.com", "apnews.com", "bbc.com", "g1.globo.com", "folha.uol.com.br", "estadao.com.br", "valor.com.br"];
const DOMINIOS_HARDWARE = ["nvidia.com", "intel.com", "amd.com", "apple.com", "samsung.com", "micron.com", "qualcomm.com", "arm.com", "tsmc.com", "tomshardware.com", "anandtech.com", "techpowerup.com"];
const DOMINIOS_LIFESTYLE = ["pexels.com", "unsplash.com"];

const BRAND_ICONS: Record<string, string> = {
  meta: "Mark Zuckerberg", facebook: "Mark Zuckerberg", instagram: "Mark Zuckerberg", whatsapp: "Mark Zuckerberg",
  google: "Sundar Pichai", youtube: "Sundar Pichai",
  apple: "Tim Cook", microsoft: "Satya Nadella",
  openai: "Sam Altman", chatgpt: "Sam Altman",
  anthropic: "Dario Amodei", claude: "Dario Amodei",
  tesla: "Elon Musk", spacex: "Elon Musk", twitter: "Elon Musk", "x.com": "Elon Musk",
  amazon: "Jeff Bezos", aws: "Andy Jassy",
  nvidia: "Jensen Huang", geforce: "Jensen Huang", rtx: "NVIDIA",
  deepseek: "DeepSeek",
  tiktok: "Shou Zi Chew", linkedin: "Ryan Roslansky", spotify: "Daniel Ek",
  uber: "Dara Khosrowshahi", airbnb: "Brian Chesky", netflix: "Ted Sarandos",
  nubank: "David Vélez", ifood: "iFood",
  "mercado livre": "Mercado Livre", mercadolivre: "Mercado Livre",
  samsung: "Samsung", intel: "Intel", amd: "AMD", qualcomm: "Qualcomm", micron: "Micron",
  disney: "Disney", mcdonalds: "McDonald's", mcdonald: "McDonald's",
  "coca-cola": "Coca-Cola", "coca cola": "Coca-Cola",
};

const HARDWARE_KEYWORDS = ["gpu", "cpu", "chip", "placa de vídeo", "rtx", "rx ", "arc ", "gddr", "hbm", "tpu", "npu", "processador", "servidor", "iphone", "ipad", "macbook", "pixel ", "galaxy ", "surface", "headset", "óculos vr", "quest ", "vision pro", "data center", "supercomputador"];
const DIAGRAMA_KEYWORDS = ["como funciona", "processo de", "passo a passo", "fluxo", "diagrama", "arquitetura", "pipeline", "framework", "funciona assim", "veja como", "entenda o"];

const LIFESTYLE_QUERIES: Record<string, string> = {
  gaming: "gaming setup RGB dark room ultrawide monitor",
  gamer: "gaming pc build neon lights dark desk",
  esport: "esports setup dark aesthetic multiple monitors",
  "data center": "data center server room blue light rows corridor",
  código: "computer code screen dark room developer programming",
  developer: "developer laptop coding dark room focused",
  "marketing digital": "minimalist home office natural light laptop workspace",
  agência: "creative agency workspace modern open office",
  empreendedor: "entrepreneur laptop coffee shop focused working",
  reunião: "business meeting glass office modern architecture",
  startup: "startup team working modern open space office",
  trading: "stock market trading screens multiple monitors dark",
  cripto: "cryptocurrency trading setup monitors dark room",
  investimento: "financial charts graphs dark background professional",
  bitcoin: "bitcoin crypto digital finance dark background",
  "inteligência artificial": "artificial intelligence technology abstract digital",
  "machine learning": "neural network visualization abstract technology",
  automação: "automation technology digital abstract blue",
  default: "professional editorial modern workspace technology",
};

function classificarTipoVisual(titulo: string, corpo: string, prompt: string): TipoVisual {
  const texto = `${titulo} ${corpo} ${prompt}`.toLowerCase();
  if (HARDWARE_KEYWORDS.some((kw) => texto.includes(kw))) return "hardware";
  if (DIAGRAMA_KEYWORDS.some((kw) => texto.includes(kw))) return "diagrama";
  for (const [brand, person] of Object.entries(BRAND_ICONS)) {
    const match = brand.length <= 2
      ? new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(texto)
      : texto.includes(brand);
    if (match) {
      if (texto.includes(person.toLowerCase())) return "pessoa";
      return "empresa";
    }
  }
  return "ambiente";
}

function extrairEntidade(titulo: string, corpo: string, prompt: string): { entidade: string; contexto: string } {
  const texto = `${titulo} ${corpo} ${prompt}`.toLowerCase();
  const marcas: string[] = [];
  for (const brand of Object.keys(BRAND_ICONS)) {
    const match = brand.length <= 2
      ? new RegExp(`\\b${brand}\\b`).test(texto)
      : texto.includes(brand);
    if (match) marcas.push(brand);
  }
  marcas.sort((a, b) => b.length - a.length);
  const entidade = marcas[0] || "";
  const nomeMapeado = BRAND_ICONS[entidade] || entidade;
  const stopwords = new Set(["que", "com", "para", "uma", "um", "foi", "são", "está", "mais", "como", "por", "sobre", "isso", "mas", "até", "de", "do", "da", "o", "a", "e"]);
  const palavras = titulo.split(/\s+/).filter((w) => !stopwords.has(w.toLowerCase()));
  return { entidade: nomeMapeado || entidade, contexto: palavras.slice(0, 6).join(" ") };
}

function construirQuery(tipo: TipoVisual, titulo: string, corpo: string, prompt: string, tipoSlide: string): string {
  const { entidade, contexto } = extrairEntidade(titulo, corpo, prompt);
  const ano = "2025";
  if (tipo === "pessoa") return `"${entidade}" keynote OR announcement OR stage OR event ${ano}`;
  if (tipo === "empresa") {
    const produtoKw = ["app", "plataforma", "serviço", "sistema", "interface", "dashboard", "software", "modelo", "versão", "update"];
    if (produtoKw.some((kw) => (titulo + corpo).toLowerCase().includes(kw))) {
      return `"${entidade}" app OR interface OR screenshot OR product ${ano}`;
    }
    return `"${entidade}" headquarters OR campus OR office building ${ano}`;
  }
  if (tipo === "hardware") {
    const palavras = titulo.split(/\s+/);
    let produto = "";
    for (let i = 0; i < palavras.length; i++) {
      const p = palavras[i];
      if (/\d/.test(p) || (p.length > 1 && p === p.toUpperCase())) {
        produto = palavras.slice(Math.max(0, i - 1), i + 2).join(" ").trim();
        break;
      }
    }
    if (!produto) produto = entidade || contexto;
    return `"${produto}" official press photo OR "press kit" OR "product shot"`;
  }
  if (tipo === "diagrama") {
    const fonte = entidade || contexto;
    return `"${fonte}" diagram OR infographic OR slide ${ano}`;
  }
  return `${contexto} professional photo editorial`;
}

function queryLifestyle(titulo: string, corpo: string): string {
  const texto = `${titulo} ${corpo}`.toLowerCase();
  for (const [kw, q] of Object.entries(LIFESTYLE_QUERIES)) {
    if (kw !== "default" && texto.includes(kw)) return q;
  }
  return LIFESTYLE_QUERIES.default;
}

function urlRejeitada(url: string): boolean {
  const u = url.toLowerCase();
  return DOMINIOS_REJEITADOS.some((d) => u.includes(d));
}

function scoreUrl(url: string, tipo: TipoVisual): number {
  const u = url.toLowerCase();
  let fontes: string[];
  if (tipo === "pessoa" || tipo === "empresa" || tipo === "diagrama") fontes = [...DOMINIOS_TECH, ...DOMINIOS_NEGOCIOS, ...DOMINIOS_IMPRENSA];
  else if (tipo === "hardware") fontes = [...DOMINIOS_HARDWARE, ...DOMINIOS_TECH];
  else fontes = [...DOMINIOS_LIFESTYLE, ...DOMINIOS_TECH];
  for (let i = 0; i < fontes.length; i++) if (u.includes(fontes[i])) return fontes.length - i;
  return 0;
}

function selecionarMelhor(resultados: any[], tipo: TipoVisual, tipoSlide: string): string | null {
  const aprovados: { url: string; score: number; orientacaoOk: boolean }[] = [];
  for (const item of resultados) {
    const url = item.imageUrl || item.thumbnailUrl || item.image_url || "";
    if (!url || urlRejeitada(url)) continue;
    const w = Number(item.width) || 0;
    const h = Number(item.height) || 0;
    if (w && h && Math.min(w, h) < 800) continue;
    let orientacaoOk = true;
    if (tipoSlide === "cover" && w && h) orientacaoOk = h >= w;
    aprovados.push({ url, score: scoreUrl(url, tipo), orientacaoOk });
  }
  if (!aprovados.length) return null;
  aprovados.sort((a, b) => {
    if (a.orientacaoOk !== b.orientacaoOk) return a.orientacaoOk ? -1 : 1;
    return b.score - a.score;
  });
  return aprovados[0].url;
}

async function buscarGoogleImages(query: string, tipo: TipoVisual, tipoSlide: string, apifyToken: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://api.apify.com/v2/acts/hooli~google-images-scraper/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: [query], maxResultsPerQuery: 8 }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!resp.ok) {
      console.error("apify google error", resp.status);
      return null;
    }
    const data = await resp.json();
    return selecionarMelhor(Array.isArray(data) ? data : [], tipo, tipoSlide);
  } catch (e) {
    console.error("google images err", (e as Error).message);
    return null;
  }
}

async function buscarPexels(query: string, key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`;
    const resp = await fetch(url, { headers: { Authorization: key } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const photos = data.photos || [];
    return photos[0]?.src?.large2x || null;
  } catch (e) {
    console.error("pexels err", (e as Error).message);
    return null;
  }
}

async function buscarFreepikStock(query: string, key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const url = `https://api.freepik.com/v1/resources?term=${encodeURIComponent(query.slice(0, 100))}&page=1&limit=5&order=relevance&filters[orientation]=portrait&filters[content_type]=photo`;
    const resp = await fetch(url, { headers: { "x-freepik-api-key": key, "Accept-Language": "en-US" } });
    if (!resp.ok) return null;
    const data = await resp.json();
    for (const item of data.data || []) {
      const u = item.image?.source?.url;
      if (u) return u;
    }
    return null;
  } catch (e) {
    console.error("freepik stock err", (e as Error).message);
    return null;
  }
}

function enriquecerPromptIA(prompt: string, titulo: string): string {
  return `Cinematic editorial photograph, ${prompt}, ${titulo}, dramatic lighting, ultra-sharp focus, professional composition, high contrast, magazine quality, visually striking for Instagram, 4k, award-winning photography. Vertical 3:4 portrait format.`;
}

async function gerarComGemini(prompt: string, geminiKey: string): Promise<{ mime: string; data: string } | null> {
  const model = "gemini-3.1-flash-image-preview";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!resp.ok) {
    console.error("gemini err", resp.status, (await resp.text()).slice(0, 300));
    return null;
  }
  const data = await resp.json();
  for (const p of data?.candidates?.[0]?.content?.parts ?? []) {
    const inline = p.inline_data || p.inlineData;
    if (inline?.data) {
      return { mime: inline.mime_type || inline.mimeType || "image/png", data: inline.data };
    }
  }
  return null;
}

async function downloadAsBytes(url: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) return null;
    const ab = await resp.arrayBuffer();
    return { bytes: new Uint8Array(ab), mime: resp.headers.get("content-type") || "image/jpeg" };
  } catch {
    return null;
  }
}

async function uploadParaBucket(bytes: Uint8Array, mime: string, slideIndex: number, supa: any): Promise<string | null> {
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${Date.now()}-s${slideIndex}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supa.storage.from("social-media").upload(path, bytes, { contentType: mime, upsert: false });
  if (error) {
    console.error("upload err", error.message);
    return null;
  }
  const { data } = supa.storage.from("social-media").getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const titulo = body.slide_titulo || "";
    const corpo = body.slide_corpo || "";
    const promptRaw = body.visual_prompt || "";
    const tipoSlide = body.slide_tipo || "conteudo";

    const apifyToken = Deno.env.get("APIFY_TOKEN") || "";
    const pexelsKey = Deno.env.get("PEXELS_API_KEY") || "";
    const freepikKey = Deno.env.get("FREEPIK_API_KEY") || "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, serviceKey);

    const tipoVisual = classificarTipoVisual(titulo, corpo, promptRaw);
    const usage = { apify_calls: 0, pexels_calls: 0, freepik_stock_calls: 0, gemini_calls: 0 };
    let externalUrl: string | null = null;
    let fonte = "sem_imagem";
    let source: "google" | "pexels" | "freepik-stock" | "ai" | "none" = "none";

    if (tipoVisual === "pessoa" || tipoVisual === "empresa") {
      const q1 = construirQuery(tipoVisual, titulo, corpo, promptRaw, tipoSlide);
      usage.apify_calls++;
      externalUrl = await buscarGoogleImages(q1, tipoVisual, tipoSlide, apifyToken);
      fonte = "Google Images (editorial)"; source = "google";
      if (!externalUrl) {
        const { entidade } = extrairEntidade(titulo, corpo, promptRaw);
        const q2 = tipoVisual === "pessoa" ? `"${entidade}" 2025 photo` : `"${entidade}" 2025 official photo`;
        usage.apify_calls++;
        externalUrl = await buscarGoogleImages(q2, tipoVisual, tipoSlide, apifyToken);
        fonte = "Google Images (ampla)";
      }
    } else if (tipoVisual === "hardware") {
      const q1 = construirQuery(tipoVisual, titulo, corpo, promptRaw, tipoSlide);
      usage.apify_calls++;
      externalUrl = await buscarGoogleImages(q1, tipoVisual, tipoSlide, apifyToken);
      fonte = "Google Images (press kit)"; source = "google";
      if (!externalUrl) {
        const { entidade } = extrairEntidade(titulo, corpo, promptRaw);
        usage.apify_calls++;
        externalUrl = await buscarGoogleImages(`"${entidade}" official product photo`, tipoVisual, tipoSlide, apifyToken);
        fonte = "Google Images (product)";
      }
    } else if (tipoVisual === "diagrama") {
      const q = construirQuery(tipoVisual, titulo, corpo, promptRaw, tipoSlide);
      usage.apify_calls++;
      externalUrl = await buscarGoogleImages(q, tipoVisual, tipoSlide, apifyToken);
      fonte = "Google Images (diagrama)"; source = "google";
    } else {
      const q = queryLifestyle(titulo, corpo);
      if (pexelsKey) {
        usage.pexels_calls++;
        externalUrl = await buscarPexels(q, pexelsKey);
        if (externalUrl) { fonte = "Pexels"; source = "pexels"; }
      }
      if (!externalUrl) {
        usage.apify_calls++;
        externalUrl = await buscarGoogleImages(q, tipoVisual, tipoSlide, apifyToken);
        if (externalUrl) { fonte = "Google Images (lifestyle)"; source = "google"; }
      }
      if (!externalUrl && freepikKey) {
        usage.freepik_stock_calls++;
        externalUrl = await buscarFreepikStock(q, freepikKey);
        if (externalUrl) { fonte = "Freepik Stock"; source = "freepik-stock"; }
      }
    }

    // Final fallback: gerar com Gemini (apenas para pessoa, empresa, ambiente)
    let finalUrl: string | null = null;
    if (externalUrl) {
      const dl = await downloadAsBytes(externalUrl);
      if (dl) finalUrl = await uploadParaBucket(dl.bytes, dl.mime, body.slide_index, supa);
      if (!finalUrl) finalUrl = externalUrl; // fallback direto
    } else if (tipoVisual !== "hardware" && tipoVisual !== "diagrama" && geminiKey) {
      const enr = enriquecerPromptIA(promptRaw || titulo, titulo);
      usage.gemini_calls++;
      const img = await gerarComGemini(enr, geminiKey);
      if (img) {
        const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
        finalUrl = await uploadParaBucket(bytes, img.mime, body.slide_index, supa);
        fonte = "IA Gemini"; source = "ai";
      }
    }

    if (!finalUrl) {
      return new Response(JSON.stringify({
        ok: false,
        url: null,
        fonte: "sem_imagem",
        source: "none",
        tipo_visual: tipoVisual,
        usage,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      url: finalUrl,
      fonte,
      source,
      tipo_visual: tipoVisual,
      prompt_usado: promptRaw,
      usage,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("social-image-search error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
