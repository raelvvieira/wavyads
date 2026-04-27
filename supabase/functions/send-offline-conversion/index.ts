import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SHA-256 helper for Meta CAPI user data hashing
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toString().trim().toLowerCase();

// Phone: only digits (with country code)
const normPhone = (s: string | null | undefined) =>
  (s ?? "").toString().replace(/\D/g, "");

// ZIP: digits only, no dash
const normZip = (s: string | null | undefined) =>
  (s ?? "").toString().replace(/\D/g, "");

// Country: 2-letter lowercase
const normCountry = (s: string | null | undefined) =>
  (s ?? "BR").toString().trim().toLowerCase().slice(0, 2);

// Gender: m or f
const normGen = (s: string | null | undefined) => {
  const v = (s ?? "").toString().trim().toLowerCase();
  if (v === "m" || v === "male" || v === "masculino") return "m";
  if (v === "f" || v === "female" || v === "feminino") return "f";
  return "";
};

// DOB MM/DD/YY -> YYYYMMDD (Meta expects YYYYMMDD)
function normDob(s: string | null | undefined): string {
  if (!s) return "";
  const v = s.toString().trim();
  // Accept MM/DD/YY or MM/DD/YYYY or YYYY-MM-DD
  let m = v.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (m) {
    const mm = m[1];
    const dd = m[2];
    let yyyy = m[3];
    if (yyyy.length === 2) {
      const n = parseInt(yyyy, 10);
      yyyy = (n <= 30 ? 2000 + n : 1900 + n).toString();
    }
    return `${yyyy}${mm}${dd}`;
  }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate caller
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const conversionId = body?.conversion_id as string | undefined;
    if (!conversionId) {
      return new Response(JSON.stringify({ error: "conversion_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the conversion row
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

    // Fetch the pixel for this client
    const { data: pixelRow, error: pixelErr } = await adminClient
      .from("client_pixels")
      .select("pixel_id, access_token")
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

    // Build hashed user_data
    const user_data: Record<string, string | string[]> = {};

    const email = norm(conv.email);
    if (email) user_data.em = [await sha256(email)];

    const phone = normPhone(conv.phone);
    if (phone) user_data.ph = [await sha256(phone)];

    const fn = norm(conv.fn);
    if (fn) user_data.fn = [await sha256(fn)];

    const ln = norm(conv.ln);
    if (ln) user_data.ln = [await sha256(ln)];

    const zip = normZip(conv.zip);
    if (zip) user_data.zp = [await sha256(zip)];

    const ct = norm(conv.ct);
    if (ct) user_data.ct = [await sha256(ct.replace(/\s+/g, ""))];

    const country = normCountry(conv.country);
    if (country) user_data.country = [await sha256(country)];

    const dob = normDob(conv.dob);
    if (dob) user_data.db = [await sha256(dob)];

    const doby = norm(conv.doby);
    if (doby) user_data.doby = [await sha256(doby)];

    const gen = normGen(conv.gen);
    if (gen) user_data.ge = [await sha256(gen)];

    if (conv.age != null) user_data.age = [await sha256(String(conv.age))];

    if (Object.keys(user_data).length === 0) {
      const msg = "É necessário pelo menos um dado de contato (e-mail ou telefone)";
      await adminClient
        .from("offline_conversions")
        .update({ send_status: "error", error_message: msg })
        .eq("id", conversionId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventTime = Math.floor(new Date(conv.conversion_date).getTime() / 1000);
    const eventId = conv.meta_event_id || `oc-${conv.id}`;

    const eventPayload: Record<string, unknown> = {
      event_name: conv.event_name || "Purchase",
      event_time: eventTime,
      action_source: "physical_store",
      event_id: eventId,
      user_data,
    };

    if (conv.value != null) {
      eventPayload.custom_data = {
        currency: conv.currency || "BRL",
        value: Number(conv.value),
      };
    }

    const url = `https://graph.facebook.com/v21.0/${pixelRow.pixel_id}/events?access_token=${encodeURIComponent(
      pixelRow.access_token,
    )}`;

    const fbResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventPayload] }),
    });
    const fbJson = await fbResp.json().catch(() => ({}));

    if (!fbResp.ok || (fbJson as any)?.error) {
      const errMsg =
        (fbJson as any)?.error?.message ||
        `Meta CAPI retornou status ${fbResp.status}`;
      await adminClient
        .from("offline_conversions")
        .update({
          send_status: "error",
          error_message: errMsg,
          meta_event_id: eventId,
        })
        .eq("id", conversionId);
      return new Response(JSON.stringify({ error: errMsg, meta: fbJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("offline_conversions")
      .update({
        send_status: "sent",
        error_message: null,
        meta_event_id: eventId,
      })
      .eq("id", conversionId);

    return new Response(
      JSON.stringify({ ok: true, meta: fbJson, event_id: eventId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
