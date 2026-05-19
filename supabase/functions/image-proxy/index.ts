// Proxy de imagens (Instagram CDN bloqueia hotlink direto por causa do Referer).
// Acessível publicamente — só faz GET de imagens.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const u = new URL(req.url);
    const target = u.searchParams.get("url");
    if (!target) {
      return new Response("missing url", { status: 400, headers: corsHeaders });
    }
    // Permitir só http/https
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response("bad url", { status: 400, headers: corsHeaders });
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      return new Response("bad protocol", { status: 400, headers: corsHeaders });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: {
        // Cabeçalhos que ajudam a passar pelo bloqueio do IG/FB CDN
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(`upstream ${upstream.status}`, {
        status: 502,
        headers: corsHeaders,
      });
    }

    const ct = upstream.headers.get("content-type") || "image/jpeg";
    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": ct,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
