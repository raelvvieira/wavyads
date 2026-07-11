// Apify proxy for Social Mídia Studio - Viral Scraper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Source = "base" | "theme" | "url" | "top";

interface Req {
  source: Source;
  profiles?: string[];
  theme?: string;
  url?: string;
}

const POST_ACTOR = "apify~instagram-post-scraper";
const HASHTAG_ACTOR = "apify~instagram-hashtag-scraper";

function cleanHandle(h: string) {
  return h.replace(/^@/, "").trim();
}

function cleanUrl(u: string) {
  const trimmed = (u || "").trim();
  try {
    const parsed = new URL(trimmed);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function getItemKeys(it: any): string[] {
  return [
    it?.id,
    it?.shortCode,
    it?.code,
    it?.url,
    it?.permalink,
    it?.inputUrl,
  ]
    .map((v) => (v ?? "").toString().trim())
    .filter(Boolean);
}

function detectType(item: any): "Reel" | "Carrossel" | "Post" {
  const t = (item.type || item.productType || "").toString().toLowerCase();
  if (t.includes("video") || t.includes("reel") || t.includes("clip")) return "Reel";
  if (t.includes("sidecar") || t.includes("carousel") || Array.isArray(item.images) && item.images.length > 1) return "Carrossel";
  return "Post";
}

function normalize(items: any[]) {
  return items
    .map((it, i) => ({
      id: it.id || it.shortCode || it.url || String(i),
      username: it.ownerUsername || it.username || it.owner?.username || "",
      type: detectType(it),
      views: it.videoViewCount || it.videoPlayCount || it.viewsCount || 0,
      likes: it.likesCount || it.likeCount || 0,
      caption: (it.caption || it.text || "").slice(0, 240),
      url: it.url || (it.shortCode ? `https://www.instagram.com/p/${it.shortCode}/` : ""),
      thumbnail: it.displayUrl || it.thumbnailUrl || it.images?.[0] || null,
      shortCode: it.shortCode || it.code || "",
      videoUrl: it.videoUrl || it.video_url || it.videoSrc || it.downloadUrl || "",
      rawType: it.type || it.productType || "",
    }))
    .filter((x) => x.username);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get("APIFY_TOKEN");
    if (!token) throw new Error("APIFY_TOKEN not configured");

    const body: Req = await req.json();
    const { source, profiles = [], theme, url } = body;

    let actor = POST_ACTOR;
    let input: Record<string, unknown> = {};

    if (source === "base") {
      input = {
        username: profiles.map(cleanHandle),
        resultsLimit: 10,
        onlyPostsNewerThan: "5 days",
      };
    } else if (source === "top") {
      input = {
        username: profiles.map(cleanHandle),
        resultsLimit: 20,
        onlyPostsNewerThan: "14 days",
      };
    } else if (source === "theme") {
      actor = HASHTAG_ACTOR;
      input = {
        hashtags: [String(theme || "").replace(/^#/, "").trim()],
        resultsLimit: 10,
      };
    } else if (source === "url") {
      if (!url || !url.trim()) {
        return new Response(JSON.stringify({ error: "URL não informada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Este ator exige o campo "username" (mesmo campo usado em "base"/"top");
      // ele aceita handles OU URLs completas de post/reel/perfil.
      input = { username: [cleanUrl(url)], resultsLimit: 1 };
    }

    const endpoint = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[apify-scrape] error", res.status, txt);
      return new Response(JSON.stringify({ error: `Apify ${res.status}`, detail: txt.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: any[] = await res.json();
    let normalized = normalize(items);
    // Map normalized.id -> raw item for the front to reuse on extract-copy
    const rawById: Record<string, any> = {};
    for (let i = 0; i < normalized.length; i++) {
      const rawItem = items.find((it: any) => getItemKeys(it).includes(normalized[i].id));
      if (rawItem) rawById[normalized[i].id] = rawItem;
    }
    if (source === "top") normalized = normalized.sort((a, b) => b.views - a.views).slice(0, 12);

    return new Response(JSON.stringify({ items: normalized, raw: rawById }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[apify-scrape] fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
