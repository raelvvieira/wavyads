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
  const alvos = [
    "https://api.evolink.ai/v1/models?type=video",
    "https://api.evolink.ai/v1/video/models",
    "https://api.evolink.ai/v1/videos/models",
    "https://api.evolink.ai/v1/models/video",
  ];
  const out: any[] = [];
  for (const u of alvos) {
    try {
      const r = await fetch(u, { headers: { Authorization: `Bearer ${key}` } });
      out.push({ url: u, status: r.status, body: (await r.text()).slice(0, 4000) });
    } catch (e) {
      out.push({ url: u, error: String(e) });
    }
  }
  // Sonda barata: modelo inexistente. Se a API validar o nome antes de
  // cobrar, o erro revela o vocabulário aceito sem gerar nada.
  try {
    const r = await fetch("https://api.evolink.ai/v1/videos/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "__inexistente__", prompt: "x" }),
    });
    out.push({ url: "POST /videos/generations", status: r.status, body: (await r.text()).slice(0, 4000) });
  } catch (e) {
    out.push({ url: "POST /videos/generations", error: String(e) });
  }
  return new Response(JSON.stringify({ out }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
