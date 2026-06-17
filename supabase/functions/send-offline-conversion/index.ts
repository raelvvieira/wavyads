import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Remove diacríticos (acentos): "góllo" -> "gollo", "são" -> "sao"
const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ============================================================================
// Normalizers — cada um retorna string normalizada OU null se inválido.
// Quando null, o campo é OMITIDO do user_data (melhor não enviar do que
// enviar dado errado que polui o hash e quebra o match no Meta).
// Padrões: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
// ============================================================================

// Meta CAPI em: lowercase, trim, formato válido de email
const normEmail = (s: string): string | null => {
  const v = s.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
};

// Meta CAPI ph: E.164 só dígitos (com country code, sem "+", sem espaços/símbolos).
// Para Brasil: garantir prefixo 55. Telefones nacionais 10–11 dígitos viram 55XXXXXXXXXX.
const normPhone = (s: string): string | null => {
  let digits = s.replace(/\D/g, "");
  // remove zeros à esquerda (ex.: tronco "0" antigo no Brasil)
  digits = digits.replace(/^0+/, "");
  if (!digits) return null;
  // BR sem DDI: 10 (fixo DDD+8) ou 11 (celular DDD+9) → prefixar 55
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  // E.164 aceita 8 a 15 dígitos no total; exigimos pelo menos 10
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
};

// Meta CAPI fn/ln: lowercase, sem acentos, somente letras a–z
const normName = (s: string): string | null => {
  const v = stripDiacritics(s.trim().toLowerCase()).replace(/[^a-z]/g, "");
  return v || null;
};

// Meta CAPI zp: só dígitos. BR exige 8 dígitos (CEP).
const normZip = (s: string, country: string | null): string | null => {
  const v = s.replace(/\D/g, "");
  if (!v) return null;
  if (country === "br" && v.length !== 8) return null;
  if (v.length < 3 || v.length > 10) return null;
  return v;
};

// Meta CAPI ct: lowercase, sem acentos, sem números/símbolos/espaços
const normCt = (s: string): string | null => {
  const v = stripDiacritics(s.trim().toLowerCase()).replace(/[^a-z]/g, "");
  return v || null;
};

// Meta CAPI country: ISO-2 lowercase ("br", "us", "mx"...)
const COUNTRY_MAP: Record<string, string> = {
  brasil: "br",
  brazil: "br",
  eua: "us",
  usa: "us",
  estadosunidos: "us",
  mexico: "mx",
  portugal: "pt",
  argentina: "ar",
  chile: "cl",
  colombia: "co",
  espanha: "es",
  spain: "es",
};
const normCountry = (s: string): string | null => {
  const cleaned = stripDiacritics(s.trim().toLowerCase()).replace(/[^a-z]/g, "");
  if (cleaned.length === 2) return cleaned;
  return COUNTRY_MAP[cleaned] ?? null;
};

// Meta CAPI db (date of birth): YYYYMMDD (8 dígitos)
const normDob = (s: string): string | null => {
  const v = s.replace(/\D/g, "");
  if (v.length !== 8) return null;
  const year = parseInt(v.slice(0, 4), 10);
  const month = parseInt(v.slice(4, 6), 10);
  const day = parseInt(v.slice(6, 8), 10);
  const nowYear = new Date().getUTCFullYear();
  if (year < 1900 || year > nowYear) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return v;
};

// Meta CAPI doby: YYYY (4 dígitos)
const normDoby = (s: string): string | null => {
  const v = s.replace(/\D/g, "");
  if (v.length !== 4) return null;
  const y = parseInt(v, 10);
  const nowYear = new Date().getUTCFullYear();
  if (y < 1900 || y > nowYear) return null;
  return v;
};

// Meta CAPI ge (gender): "m" ou "f"
const GENDER_MAP: Record<string, "m" | "f"> = {
  m: "m",
  male: "m",
  masculino: "m",
  homem: "m",
  h: "m",
  f: "f",
  female: "f",
  feminino: "f",
  mulher: "f",
};
const normGen = (s: string): string | null => {
  const cleaned = stripDiacritics(s.trim().toLowerCase()).replace(/[^a-z]/g, "");
  return GENDER_MAP[cleaned] ?? null;
};

// Meta CAPI age: inteiro positivo 1–120 (enviado como string antes do hash)
const normAge = (s: string): string | null => {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 120) return null;
  return String(n);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Auth (validate caller via JWT claims)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const conversionId = body?.conversion_id as string | undefined;
    if (!conversionId || typeof conversionId !== "string") {
      return new Response(
        JSON.stringify({ error: "conversion_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Fetch the conversion
    const { data: conv, error: convErr } = await adminClient
      .from("offline_conversions")
      .select("*")
      .eq("id", conversionId)
      .maybeSingle();
    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "Conversão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Fetch the pixel
    const { data: pixelRow, error: pixelErr } = await adminClient
      .from("client_pixels")
      .select("pixel_id, access_token, offline_event_set_id")
      .eq("client_id", conv.client_id)
      .maybeSingle();
    if (pixelErr || !pixelRow) {
      const msg = "Pixel Meta não configurado para este cliente";
      await adminClient
        .from("offline_conversions")
        .update({ send_status: "error", error_message: msg })
        .eq("id", conversionId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offlineEventSetId = (pixelRow as any).offline_event_set_id as string | null;
    const useOfflineDataset = !!offlineEventSetId && String(offlineEventSetId).trim().length > 0;

    // 3) Build hashed user_data. Cada campo passa pelo normalizer; se retornar
    //    null, é descartado (não enviar dado errado é melhor que enviar errado).
    const user_data: Record<string, string | string[]> = {};
    const droppedKeys: string[] = [];

    const addHashed = async (
      key: string,
      raw: unknown,
      normalizer: (s: string) => string | null,
      asArray = false,
    ) => {
      if (raw === null || raw === undefined) return;
      const s = String(raw);
      if (!s.trim()) return;
      const n = normalizer(s);
      if (!n) {
        droppedKeys.push(key);
        return;
      }
      const h = await hashSHA256(n);
      user_data[key] = asArray ? [h] : h;
    };

    // country precisa ser normalizado primeiro pois zip depende dele
    let countryIso: string | null = null;
    if (conv.country !== null && conv.country !== undefined && String(conv.country).trim()) {
      countryIso = normCountry(String(conv.country));
      if (countryIso) {
        user_data.country = await hashSHA256(countryIso);
      } else {
        droppedKeys.push("country");
      }
    }

    await addHashed("em", conv.email, normEmail, true);
    await addHashed("ph", conv.phone, normPhone, true);
    await addHashed("fn", conv.fn, normName);
    await addHashed("ln", conv.ln, normName);
    await addHashed("zp", conv.zip, (s) => normZip(s, countryIso));
    await addHashed("ct", conv.ct, normCt);
    await addHashed("db", conv.dob, normDob);
    await addHashed("doby", conv.doby, normDoby);
    await addHashed("ge", conv.gen, normGen);
    await addHashed("age", conv.age, normAge);

    // 4) Build payload
    const eventTime = Math.floor(new Date(conv.conversion_date).getTime() / 1000);
    const eventId = conv.id as string;

    const event: Record<string, unknown> = {
      event_name: conv.event_name || "Purchase",
      event_time: eventTime,
      action_source: useOfflineDataset ? "system_generated" : "other",
      event_id: eventId,
      user_data,
    };

    if (conv.value !== null && conv.value !== undefined && String(conv.value).trim()) {
      event.custom_data = {
        value: parseFloat(String(conv.value)),
        currency: conv.currency || "BRL",
      };
    }

    const payload: Record<string, unknown> = { data: [event] };
    if (useOfflineDataset) {
      payload.upload_tag = "wavy_dash_crm";
    }

    // 5) POST to Meta CAPI
    const targetId = useOfflineDataset ? offlineEventSetId : pixelRow.pixel_id;
    const url = `https://graph.facebook.com/v24.0/${targetId}/events?access_token=${encodeURIComponent(
      pixelRow.access_token,
    )}`;

    console.log("send-offline-conversion", {
      conversion_id: conversionId,
      mode: useOfflineDataset ? "offline_dataset" : "pixel_events",
      target_id: targetId,
      included_keys: Object.keys(user_data),
      dropped_keys: droppedKeys,
    });

    const fbResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const fbJson = await fbResp.json().catch(() => ({}));

    // 6/7) Update status
    if (fbResp.status === 200 && !(fbJson as any)?.error) {
      await adminClient
        .from("offline_conversions")
        .update({
          send_status: "sent",
          error_message: null,
          meta_event_id: eventId,
        })
        .eq("id", conversionId);

      return new Response(
        JSON.stringify({
          ok: true,
          event_id: eventId,
          meta: fbJson,
          included_keys: Object.keys(user_data),
          dropped_keys: droppedKeys,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const errMsg =
      (fbJson as any)?.error?.message ||
      `Meta CAPI retornou status ${fbResp.status}`;
    await adminClient
      .from("offline_conversions")
      .update({
        send_status: "error",
        error_message: errMsg,
      })
      .eq("id", conversionId);

    return new Response(
      JSON.stringify({ error: errMsg, meta: fbJson, dropped_keys: droppedKeys }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-offline-conversion error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
