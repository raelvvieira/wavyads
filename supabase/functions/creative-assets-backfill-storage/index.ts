import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STORAGE_BUCKET = "creative-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1], bytes };
  } catch {
    return null;
  }
}

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "png";
}

function extractPrivateObjectPath(url: string, supabaseUrl: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0 || !url.startsWith(supabaseUrl)) return null;
  const raw = url.slice(idx + marker.length).split("?")[0];
  return raw ? decodeURIComponent(raw) : null;
}

async function signObject(adminClient: any, path: string): Promise<string | null> {
  const { data, error } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl as string;
}

async function persistDataUrl(adminClient: any, dataUrl: string, assetId: string, field: "url" | "thumbnail_url") {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const path = `backfill/${assetId}/${field}-${Date.now()}.${extForMime(parsed.mime)}`;
  const { error: uploadError } = await adminClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, parsed.bytes, {
      contentType: parsed.mime,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) throw uploadError;
  return await signObject(adminClient, path);
}

async function normalizeStoredValue(
  adminClient: any,
  value: string | null,
  assetId: string,
  field: "url" | "thumbnail_url",
  supabaseUrl: string,
): Promise<string | null | undefined> {
  if (!value) return undefined;
  if (value.startsWith("data:")) return await persistDataUrl(adminClient, value, assetId, field);
  const objectPath = extractPrivateObjectPath(value, supabaseUrl);
  if (objectPath) return await signObject(adminClient, objectPath);
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) throw new Error("Backend sem variáveis de Storage configuradas");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: role } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 20), 50));

    const { data: rows, error: selectError } = await adminClient
      .from("creative_assets")
      .select("id,url,thumbnail_url")
      .or("url.like.data:%,thumbnail_url.like.data:%,url.ilike.%/storage/v1/object/public/creative-assets/%,thumbnail_url.ilike.%/storage/v1/object/public/creative-assets/%")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (selectError) throw selectError;

    const results: Array<{ id: string; changed: boolean; error?: string }> = [];
    for (const row of rows ?? []) {
      try {
        const patch: Record<string, string | null> = {};
        const nextUrl = await normalizeStoredValue(adminClient, row.url, row.id, "url", supabaseUrl);
        const nextThumb = await normalizeStoredValue(adminClient, row.thumbnail_url, row.id, "thumbnail_url", supabaseUrl);
        if (nextUrl !== undefined) patch.url = nextUrl;
        if (nextThumb !== undefined) patch.thumbnail_url = nextThumb;
        if (Object.keys(patch).length > 0) {
          const { error: updateError } = await adminClient.from("creative_assets").update(patch).eq("id", row.id);
          if (updateError) throw updateError;
          results.push({ id: row.id, changed: true });
        } else {
          results.push({ id: row.id, changed: false });
        }
      } catch (e) {
        results.push({ id: row.id, changed: false, error: e instanceof Error ? e.message : "Erro" });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("creative-assets-backfill-storage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});