import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 12_000;
const MAX_TEXT = 5_000;

function stripTags(html: string, tag: string) {
  return html.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
}

function extractMeta(html: string, prop: string, attr: "name" | "property" = "name"): string {
  const re = new RegExp(`<meta[^>]+${attr}=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${prop}["']`, "i");
  return (html.match(re)?.[1] || html.match(re2)?.[1] || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let target: URL;
    try {
      target = new URL(url.trim());
      if (!/^https?:$/.test(target.protocol)) throw new Error("protocolo inválido");
    } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let html = "";
    try {
      const r = await fetch(target.toString(), {
        signal: ctl.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await r.arrayBuffer();
      html = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, MAX_BYTES));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error && e.name === "AbortError" ? "Tempo esgotado" : `Não consegui acessar o site` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      clearTimeout(t);
    }

    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
    const description =
      extractMeta(html, "description") ||
      extractMeta(html, "og:description", "property") ||
      extractMeta(html, "twitter:description");
    const ogTitle = extractMeta(html, "og:title", "property");

    let body = html;
    body = stripTags(body, "script");
    body = stripTags(body, "style");
    body = stripTags(body, "noscript");
    body = stripTags(body, "nav");
    body = stripTags(body, "footer");
    body = stripTags(body, "header");
    body = stripTags(body, "svg");

    // Extract main/body inner
    const main = body.match(/<main[\s\S]*?<\/main>/i)?.[0] || body.match(/<body[\s\S]*?<\/body>/i)?.[0] || body;
    const text = main
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT);

    return new Response(
      JSON.stringify({
        title: ogTitle || title,
        description,
        text,
        url: target.toString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("criativo-fetch-url error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
