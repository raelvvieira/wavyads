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

const isPresent = (v: unknown): v is string | number => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  return false;
};

// Per-field normalizers per spec
const normEmail = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => {
  const trimmed = s.trim();
  const lead = trimmed.startsWith("+") ? "+" : "";
  return lead + trimmed.replace(/\D/g, "");
};
const normName = (s: string) => s.trim().toLowerCase();
const normZip = (s: string) => s.replace(/[\s-]/g, "");
const normCt = (s: string) => s.trim().toLowerCase();
const normCountry = (s: string) => s.toLowerCase();
const normDob = (s: string) => s.replace(/\D/g, "");
const normDoby = (s: string) => s.trim();
const normGen = (s: string) => s.toLowerCase();

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

    // 3) Build hashed user_data — only include fields that are present.
    //    Per spec: em/ph as arrays; others as scalar strings.
    const user_data: Record<string, string | string[]> = {};

    if (isPresent(conv.email)) {
      user_data.em = [await hashSHA256(normEmail(String(conv.email)))];
    }
    if (isPresent(conv.phone)) {
      user_data.ph = [await hashSHA256(normPhone(String(conv.phone)))];
    }
    if (isPresent(conv.fn)) {
      user_data.fn = await hashSHA256(normName(String(conv.fn)));
    }
    if (isPresent(conv.ln)) {
      user_data.ln = await hashSHA256(normName(String(conv.ln)));
    }
    if (isPresent(conv.zip)) {
      user_data.zp = await hashSHA256(normZip(String(conv.zip)));
    }
    if (isPresent(conv.ct)) {
      user_data.ct = await hashSHA256(normCt(String(conv.ct)));
    }
    if (isPresent(conv.country)) {
      user_data.country = await hashSHA256(normCountry(String(conv.country)));
    }
    if (isPresent(conv.dob)) {
      user_data.db = await hashSHA256(normDob(String(conv.dob)));
    }
    if (isPresent(conv.doby)) {
      user_data.doby = await hashSHA256(normDoby(String(conv.doby)));
    }
    if (isPresent(conv.gen)) {
      user_data.ge = await hashSHA256(normGen(String(conv.gen)));
    }
    if (isPresent(conv.age)) {
      user_data.age = await hashSHA256(String(conv.age));
    }

    // 4) Build payload
    const eventTime = Math.floor(new Date(conv.conversion_date).getTime() / 1000);
    const eventId = conv.id as string;

    const event: Record<string, unknown> = {
      event_name: conv.event_name || "Purchase",
      event_time: eventTime,
      action_source: "other",
      event_id: eventId,
      user_data,
    };

    if (isPresent(conv.value)) {
      event.custom_data = {
        value: parseFloat(String(conv.value)),
        currency: conv.currency || "BRL",
      };
    }

    const payload = { data: [event] };

    // 5) POST to Meta CAPI
    const url = `https://graph.facebook.com/v24.0/${pixelRow.pixel_id}/events?access_token=${encodeURIComponent(
      pixelRow.access_token,
    )}`;

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
        JSON.stringify({ ok: true, event_id: eventId, meta: fbJson }),
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

    return new Response(JSON.stringify({ error: errMsg, meta: fbJson }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-offline-conversion error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
