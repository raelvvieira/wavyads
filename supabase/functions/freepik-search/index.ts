import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, page = 1, per_page = 12 } = await req.json();
    const key = Deno.env.get("FREEPIK_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "FREEPIK_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL("https://api.freepik.com/v1/resources");
    url.searchParams.set("term", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(per_page));
    url.searchParams.set("order", "relevance");
    url.searchParams.set("filters[content_type][photo]", "1");

    const resp = await fetch(url.toString(), {
      headers: { "x-freepik-api-key": key, "Accept-Language": "pt-BR" },
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("freepik error", data);
      return new Response(JSON.stringify({ error: data?.message || "Falha na busca Freepik" }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (data?.data || []).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      thumbnail: r.image?.source?.url || r.image?.preview?.url,
      url: r.url,
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("freepik-search error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
