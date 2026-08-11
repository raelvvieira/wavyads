import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// v18 foi desativado pelo Google em ago/2025 — mantendo uma versão suportada.
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// Contas de cliente hoje são acessadas via a gerenciadora WAVY. Usado como
// fallback quando o cliente ainda não tem login_customer_id persistido
// (ex.: sincronizado antes dessa coluna existir).
const WAVY_MANAGER_CUSTOMER_ID = "8125716511";

// Nenhuma fetch() externa desta função tinha timeout — se a API do Google
// (token endpoint ou googleAds:searchStream) aceitasse a conexão e nunca
// respondesse, a tela ficava travada em "carregando" pra sempre, sem erro
// nenhum (mesma classe de bug já corrigida em criativo-generate/index.ts).
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      let host = url;
      try { host = new URL(url).hostname; } catch { /* mantém url bruta */ }
      throw new Error(`Tempo limite (${Math.round(timeoutMs / 1000)}s) ao chamar ${host}`);
    }
    throw e;
  }
}

async function refreshAccessToken(supabase: any, clientRecord: any, clientIdGoogle: string, clientSecretGoogle: string): Promise<string> {
  const now = new Date();
  const expiresAt = clientRecord.google_ads_token_expires_at ? new Date(clientRecord.google_ads_token_expires_at) : null;

  if (expiresAt && now < expiresAt) {
    return clientRecord.google_ads_access_token;
  }

  // Refresh
  const res = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientIdGoogle,
      client_secret: clientSecretGoogle,
      refresh_token: clientRecord.google_ads_refresh_token,
      grant_type: "refresh_token",
    }),
  }, 15_000);
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

// Se o cliente já tem um login-customer-id conhecido (salvo ao selecionar a
// conta na tela de sincronização), usa ele direto. Senão — clientes antigos,
// sincronizados antes dessa coluna existir — tenta sem o header (conta
// direta) e depois com o da gerenciadora WAVY (conta sob MCC).
async function gaqlQuery(
  accessToken: string,
  customerId: string,
  loginCustomerId: string | null,
  developerToken: string,
  query: string,
) {
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  const attempts: Array<Record<string, string>> = loginCustomerId
    ? [{ ...baseHeaders, "login-customer-id": loginCustomerId }]
    : [baseHeaders, { ...baseHeaders, "login-customer-id": WAVY_MANAGER_CUSTOMER_ID }];

  let lastError = "Falha ao consultar o Google Ads";

  for (const headers of attempts) {
    const res = await fetchWithTimeout(
      `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query }) },
      20_000,
    );

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      lastError = `Resposta inesperada do Google Ads (HTTP ${res.status}): ${text.slice(0, 200)}`;
      continue;
    }

    const err = Array.isArray(data) ? data[0]?.error : data?.error;
    if (err) {
      lastError = err.message || JSON.stringify(err);
      continue;
    }

    const results: any[] = [];
    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) results.push(...batch.results);
      }
    } else if (data?.results) {
      results.push(...data.results);
    }
    return results;
  }

  throw new Error(lastError);
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
    const loginCustomerId: string | null = clientRecord.google_ads_login_customer_id || null;
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
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

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
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

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
      const dailyRows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, dailyQuery);

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
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

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

    // ==================== KEYWORDS ====================
    if (action === "keywords") {
      const query = `
        SELECT
          campaign.name, ad_group.name,
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.quality_info.quality_score,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc
        FROM keyword_view
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND ad_group_criterion.status != 'REMOVED'
      `;
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

      const matchTypeMap: Record<string, string> = { EXACT: "Exata", PHRASE: "Frase", BROAD: "Ampla" };

      const keywordMap = new Map<string, any>();
      for (const row of rows) {
        const id = row.adGroupCriterion?.criterionId;
        if (!id) continue;
        if (!keywordMap.has(id)) {
          keywordMap.set(id, {
            id,
            text: row.adGroupCriterion?.keyword?.text || "",
            match_type: matchTypeMap[row.adGroupCriterion?.keyword?.matchType] || row.adGroupCriterion?.keyword?.matchType || "",
            campaign_name: row.campaign?.name || "",
            ad_group_name: row.adGroup?.name || "",
            quality_score: null as number | null,
            impressions: 0, clicks: 0, spend: 0, conversions: 0, conversions_value: 0,
          });
        }
        const k = keywordMap.get(id)!;
        k.impressions += Number(row.metrics?.impressions || 0);
        k.clicks += Number(row.metrics?.clicks || 0);
        k.spend += microsToAmount(row.metrics?.costMicros);
        k.conversions += Number(row.metrics?.conversions || 0);
        k.conversions_value += Number(row.metrics?.conversionsValue || 0);
        // Quality Score é um retrato do momento, não uma métrica somável —
        // guarda o valor mais recente não-nulo em vez de somar.
        const qs = row.adGroupCriterion?.qualityInfo?.qualityScore;
        if (qs !== undefined && qs !== null) k.quality_score = qs;
      }

      const MAX_ROWS = 200;
      const allKeywords = Array.from(keywordMap.values())
        .map((k) => ({
          ...k,
          ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : 0,
          cpc: k.clicks > 0 ? k.spend / k.clicks : 0,
          cost_per_conversion: k.conversions > 0 ? k.spend / k.conversions : 0,
        }))
        .sort((a, b) => b.spend - a.spend);

      return new Response(JSON.stringify({
        keywords: allKeywords.slice(0, MAX_ROWS),
        truncated: allKeywords.length > MAX_ROWS,
        total: allKeywords.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== SEARCH TERMS ====================
    if (action === "search_terms") {
      const query = `
        SELECT
          campaign.name, ad_group.name,
          search_term_view.search_term, search_term_view.status,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversions_value
        FROM search_term_view
        WHERE segments.date BETWEEN '${since}' AND '${until}'
      `;
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

      // NONE = termo não gerenciado (candidato a negativa); ADDED = já é
      // palavra-chave; EXCLUDED/ADDED_EXCLUDED = já é negativa em algum lugar.
      const statusMap: Record<string, string> = {
        NONE: "none", ADDED: "added", EXCLUDED: "excluded", ADDED_EXCLUDED: "excluded",
      };

      const termMap = new Map<string, any>();
      for (const row of rows) {
        const term = row.searchTermView?.searchTerm;
        const adGroupName = row.adGroup?.name || "";
        if (!term) continue;
        const key = `${term}::${adGroupName}`;
        if (!termMap.has(key)) {
          termMap.set(key, {
            term,
            status: statusMap[row.searchTermView?.status] || "none",
            campaign_name: row.campaign?.name || "",
            ad_group_name: adGroupName,
            impressions: 0, clicks: 0, spend: 0, conversions: 0, conversions_value: 0,
          });
        }
        const t = termMap.get(key)!;
        t.impressions += Number(row.metrics?.impressions || 0);
        t.clicks += Number(row.metrics?.clicks || 0);
        t.spend += microsToAmount(row.metrics?.costMicros);
        t.conversions += Number(row.metrics?.conversions || 0);
        t.conversions_value += Number(row.metrics?.conversionsValue || 0);
      }

      const MAX_ROWS = 200;
      const allTerms = Array.from(termMap.values()).sort((a, b) => b.spend - a.spend);

      return new Response(JSON.stringify({
        search_terms: allTerms.slice(0, MAX_ROWS),
        truncated: allTerms.length > MAX_ROWS,
        total: allTerms.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== IMPRESSION SHARE ====================
    if (action === "impression_share") {
      const query = `
        SELECT
          campaign.id, campaign.name, campaign.advertising_channel_type,
          metrics.search_impression_share,
          metrics.search_budget_lost_impression_share,
          metrics.search_rank_lost_impression_share
        FROM campaign
        WHERE segments.date BETWEEN '${since}' AND '${until}'
          AND campaign.status != 'REMOVED'
      `;
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

      // Impression share só é significativa pra campanhas de Pesquisa —
      // Display/PMax/Vídeo não reportam essas métricas de forma útil.
      const campaigns = rows
        .filter((row) => row.campaign?.advertisingChannelType === "SEARCH")
        .map((row) => ({
          id: row.campaign.id,
          name: row.campaign.name,
          impression_share: Number(row.metrics?.searchImpressionShare || 0) * 100,
          lost_to_budget: Number(row.metrics?.searchBudgetLostImpressionShare || 0) * 100,
          lost_to_rank: Number(row.metrics?.searchRankLostImpressionShare || 0) * 100,
        }))
        .sort((a, b) => a.impression_share - b.impression_share);

      return new Response(JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== DEVICE BREAKDOWN ====================
    if (action === "device_breakdown") {
      const query = `
        SELECT
          segments.device,
          metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
        FROM customer
        WHERE segments.date BETWEEN '${since}' AND '${until}'
      `;
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

      const deviceLabels: Record<string, string> = {
        MOBILE: "Celular", DESKTOP: "Computador", TABLET: "Tablet",
        CONNECTED_TV: "Smart TV", OTHER: "Outro",
      };

      const deviceMap = new Map<string, any>();
      for (const row of rows) {
        const device = row.segments?.device;
        if (!device) continue;
        if (!deviceMap.has(device)) {
          deviceMap.set(device, {
            device: deviceLabels[device] || device,
            impressions: 0, clicks: 0, spend: 0, conversions: 0,
          });
        }
        const d = deviceMap.get(device)!;
        d.impressions += Number(row.metrics?.impressions || 0);
        d.clicks += Number(row.metrics?.clicks || 0);
        d.spend += microsToAmount(row.metrics?.costMicros);
        d.conversions += Number(row.metrics?.conversions || 0);
      }

      const devices = Array.from(deviceMap.values()).sort((a, b) => b.spend - a.spend);

      return new Response(JSON.stringify({ devices }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== CONVERSION BREAKDOWN ====================
    if (action === "conversion_breakdown") {
      const query = `
        SELECT
          segments.conversion_action_name,
          metrics.conversions, metrics.conversions_value
        FROM customer
        WHERE segments.date BETWEEN '${since}' AND '${until}'
      `;
      const rows = await gaqlQuery(accessToken, customerId, loginCustomerId, developerToken, query);

      const actionMap = new Map<string, any>();
      for (const row of rows) {
        const name = row.segments?.conversionActionName;
        if (!name) continue;
        if (!actionMap.has(name)) {
          actionMap.set(name, { action_name: name, conversions: 0, conversions_value: 0 });
        }
        const a = actionMap.get(name)!;
        a.conversions += Number(row.metrics?.conversions || 0);
        a.conversions_value += Number(row.metrics?.conversionsValue || 0);
      }

      const actions = Array.from(actionMap.values()).sort((a, b) => b.conversions - a.conversions);

      return new Response(JSON.stringify({ actions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
