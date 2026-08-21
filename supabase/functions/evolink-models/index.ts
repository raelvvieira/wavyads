import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Diagnóstico temporário: lista os modelos que a chave EvoLink enxerga. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const key = Deno.env.get("EVOLINK_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "sem chave" }), { status: 500, headers: cors });
  const r = await fetch("https://api.evolink.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const texto = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: texto.slice(0, 20000) }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
