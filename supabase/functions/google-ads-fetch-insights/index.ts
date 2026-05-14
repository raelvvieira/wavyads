import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(supabase: any, clientRecord: any, clientIdGoogle: string, clientSecretGoogle: string): Promise<string> {
  const now = new Date();
  const expiresAt = clientRecord.google_ads_token_expires_at ? new Date(clientRecord.google_ads_token_expires_at) : null;

  if (expiresAt && now < expiresAt) {
    return clientRecord.google_ads_access_token;
  }

  // Refresh
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientIdGoogle,
      client_secret: clientSecretGoogle,
      refresh_token: clientRecord.google_ads_refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();

  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }

  const newToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await supabase
    .from("clients")
    .update({
      google_ads_access_token: newToken,
      google_ads_token_expires_at: newExpiresAt,
    })
    .eq("id", clientRecord.id);

  return newToken;
}

async function gaqlQuery(accessToken: string, customerId: string, developerToken: string, query: string) {
  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "login-customer-id": customerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  // searchStream returns array of batches
  const results: any[] = [];
  if (Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) results.push(...batch.results);
    }
  }
  return results;
}

function microsToAmount(micros: string | number | undefined): number {
  if (!micros) return 0;
  return Number(micros) / 1_000_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const googleClientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!;
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;

    // Auth - decode JWT and verify via admin API
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    let userId: string;
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
      userId = payload.sub;
      if (!userId) throw new Error("No sub");
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("Auth error:", e instanceof Error ? e.message : String(e));
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action || "insights";
    const dbClientId = body.client_id;
    const timeRange = body.time_range as { since: string; until: string } | undefined;

    if (!dbClientId) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get client
    const { data: isAdmin } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();

  const { data: clientRecord, error: clientError } = await supabase
      .from("clients").select("*").eq("id", dbClientId).maybeSingle();
    if (clientError || !clientRecord) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!isAdmin) {
      const { data: access } = await supabase
        .from("client_users").select("id").eq("client_id", dbClientId).eq("user_id", userId).maybeSingle();
      if (!access) {
        return new Response(JSON.stringify({ error: "Sem acesso a este cliente" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!clientRecord.google_ads_access_token || !clientRecord.google_ads_customer_id) {
      return new Response(JSON.stringify({ error: "Cliente não sincronizado com Google Ads" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const customerId = clientRecord.google_ads_customer_id;
    const accessToken = await refreshAccessToken(supabase, clientRecord, googleClientId, googleClientSecret);

    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const since = timeRange?.since || "2024-01-01";
    const until = timeRange?.until || new Date().toISOString().split("T")[0];
    if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
      return new Response(JSON.stringify({ error: "Formato de data inválido (esperado YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== CAMPAIGNS ====================
    if (action === "campaigns") {
      const query = `
        SELECT
          campaign.id, campaign.name, campaign.status,
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions, metrics.ctr, metrics.average_cpc,
          metrics.average_cpm, metrics.all_conversions
        FROM campaign
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND campaign.status != 'REMOVED'
      `;
      const rows = await gaqlQuery(accessToken, customerId, developerToken, query);

      // Aggregate by campaign
      const campaignMap = new Map<string, any>();
      for (const row of rows) {
        const id = row.campaign?.id;
        if (!id) continue;
        if (!campaignMap.has(id)) {
          const statusMap: Record<string, string> = { ENABLED: "active", PAUSED: "paused", REMOVED: "ended" };
          campaignMap.set(id, {
            id,
            name: row.campaign.name,
            status: statusMap[row.campaign.status] || "ended",
            spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0,
            leads: 0, cpl: 0, purchases: 0, cost_per_purchase: 0,
            results: 0, cost_per_result: 0, result_type: "",
            ctr: 0, cpc: 0, cpm: 0, frequency: 0, budget: 0,
          });
        }
        const c = campaignMap.get(id)!;
        c.spend += microsToAmount(row.metrics?.costMicros);
        c.impressions += Number(row.metrics?.impressions || 0);
        c.clicks += Number(row.metrics?.clicks || 0);
        c.conversions += Number(row.metrics?.conversions || 0);
      }

      const campaigns = Array.from(campaignMap.values()).map(c => {
        c.results = c.conversions;
        c.ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
        c.cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
        c.cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
        c.cost_per_result = c.results > 0 ? c.spend / c.results : 0;
        return c;
      });

      return new Response(JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== INSIGHTS ====================
    if (action === "insights") {
      const query = `
        SELECT
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions, metrics.ctr, metrics.average_cpc,
          metrics.average_cpm, metrics.all_conversions
        FROM customer
        WHERE segments.date BETWEEN '${since}' AND '${until}'
      `;
      const rows = await gaqlQuery(accessToken, customerId, developerToken, query);

      let spend = 0, impressions = 0, clicks = 0, conversions = 0;
      for (const row of rows) {
        spend += microsToAmount(row.metrics?.costMicros);
        impressions += Number(row.metrics?.impressions || 0);
        clicks += Number(row.metrics?.clicks || 0);
        conversions += Number(row.metrics?.conversions || 0);
      }

      // Daily breakdown
      const dailyQuery = `
        SELECT
          segments.date,
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions
        FROM customer
        WHERE segments.date BETWEEN '${since}' AND '${until}'
      `;
      const dailyRows = await gaqlQuery(accessToken, customerId, developerToken, dailyQuery);

      const dailyMap = new Map<string, any>();
      for (const row of dailyRows) {
        const date = row.segments?.date;
        if (!date) continue;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date_raw: date, spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, results: 0, reach: 0, conversions: 0 });
        }
        const d = dailyMap.get(date)!;
        d.spend += microsToAmount(row.metrics?.costMicros);
        d.impressions += Number(row.metrics?.impressions || 0);
        d.clicks += Number(row.metrics?.clicks || 0);
        d.conversions += Number(row.metrics?.conversions || 0);
        d.results += Number(row.metrics?.conversions || 0);
      }

      const daily = Array.from(dailyMap.values())
        .sort((a, b) => a.date_raw.localeCompare(b.date_raw))
        .map(d => ({
          ...d,
          date: new Date(d.date_raw + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          cost_per_purchase: 0,
          cost_per_result: d.results > 0 ? d.spend / d.results : 0,
        }));

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

      return new Response(JSON.stringify({
        spend, impressions, reach: 0, clicks,
        leads: 0, cpl: 0,
        purchases: 0, cost_per_purchase: 0,
        results: conversions, cost_per_result: conversions > 0 ? spend / conversions : 0,
        conversions, ctr, cpc, cpm,
        frequency: 0, roas: 0,
        landing_page_views: 0, add_to_cart: 0, initiate_checkout: 0,
        daily,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== INSIGHTS_PREVIOUS ====================
    if (action === "insights_previous") {
      let prevSince: string;
      let prevUntil: string;

      if (timeRange) {
        const sinceDate = new Date(timeRange.since + "T00:00:00");
        const untilDate = new Date(timeRange.until + "T00:00:00");
        const days = Math.round((untilDate.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const prevEnd = new Date(sinceDate);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - days + 1);
        prevSince = prevStart.toISOString().split("T")[0];
        prevUntil = prevEnd.toISOString().split("T")[0];
      } else {
        const days = 30;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - days - 1);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days + 1);
        prevSince = startDate.toISOString().split("T")[0];
        prevUntil = endDate.toISOString().split("T")[0];
      }

      const query = `
        SELECT
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions, metrics.ctr, metrics.average_cpc,
          metrics.average_cpm
        FROM customer
        WHERE segments.date BETWEEN '${prevSince}' AND '${prevUntil}'
      `;
      const rows = await gaqlQuery(accessToken, customerId, developerToken, query);

      let spend = 0, impressions = 0, clicks = 0, conversions = 0;
      for (const row of rows) {
        spend += microsToAmount(row.metrics?.costMicros);
        impressions += Number(row.metrics?.impressions || 0);
        clicks += Number(row.metrics?.clicks || 0);
        conversions += Number(row.metrics?.conversions || 0);
      }

      return new Response(JSON.stringify({
        spend, impressions, reach: 0, clicks,
        leads: 0, cpl: 0,
        purchases: 0, cost_per_purchase: 0,
        results: conversions, cost_per_result: conversions > 0 ? spend / conversions : 0,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        frequency: 0, roas: 0, daily: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-ads-fetch-insights error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
