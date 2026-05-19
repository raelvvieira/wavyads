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
      input = { directUrls: [url], resultsLimit: 10 };
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

    const items = await res.json();
    let normalized = normalize(items);
    if (source === "top") normalized = normalized.sort((a, b) => b.views - a.views).slice(0, 12);

    return new Response(JSON.stringify({ items: normalized }), {
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
