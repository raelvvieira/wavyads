import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v20.0";

const RESULT_TYPES = [
  "onsite_conversion.messaging_conversation_started_7d",
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "landing_page_view",
  "link_click",
  "post_engagement",
  "page_engagement",
  "video_view",
  "omni_app_install",
  "app_install",
];

const LEAD_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
const PURCHASE_TYPES = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];
const LANDING_PAGE_TYPES = ["landing_page_view"];
const ADD_TO_CART_TYPES = ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart"];
const INITIATE_CHECKOUT_TYPES = ["initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout", "omni_initiate_checkout"];

function extractAction(actions: any[], types: string[]): number {
  if (!actions) return 0;
  for (const t of types) {
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return parseInt(found.value || "0");
  }
  return 0;
}

function extractCostPerAction(costPerAction: any[], types: string[]): number {
  if (!costPerAction) return 0;
  for (const t of types) {
    const found = costPerAction.find((a: any) => a.action_type === t);
    if (found) return parseFloat(found.value || "0");
  }
  return 0;
}

function extractResults(actions: any[]): number {
  if (!actions) return 0;
  for (const t of RESULT_TYPES) {
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return parseInt(found.value || "0");
  }
  return 0;
}

function extractResultType(actions: any[]): string {
  if (!actions) return "";
  for (const t of RESULT_TYPES) {
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return t;
  }
  return "";
}

function extractCostPerResult(costPerAction: any[]): number {
  if (!costPerAction) return 0;
  for (const t of RESULT_TYPES) {
    const found = costPerAction.find((a: any) => a.action_type === t);
    if (found) return parseFloat(found.value || "0");
  }
  return 0;
}

function extractVideoMetric(videoActions: any[], metricType: string): number {
  if (!videoActions) return 0;
  const found = videoActions.find((a: any) => a.action_type === metricType);
  return found ? parseInt(found.value || "0") : 0;
}

function timeRangeParam(tr: { since: string; until: string }): string {
  return `time_range={"since":"${tr.since}","until":"${tr.until}"}`;
}

async function authenticateRequest(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Não autenticado", status: 401 };
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { error: "Token inválido", status: 401 };
  }
  return { user };
}

async function getClient(supabase: any, userId: string, clientId: string) {
  const { data: isAdmin } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  const { data: client, error: clientError } = await supabase
    .from("clients").select("*").eq("id", clientId).maybeSingle();
  if (clientError || !client) {
    return { error: "Cliente não encontrado", status: 404 };
  }

  if (!isAdmin) {
    const { data: access } = await supabase
      .from("client_users").select("id").eq("client_id", clientId).eq("user_id", userId).maybeSingle();
    if (!access) {
      return { error: "Sem acesso a este cliente", status: 403 };
    }
  }

  if (!client.meta_access_token || !client.meta_ad_account_id) {
    return { error: "Cliente não sincronizado com Meta", status: 400 };
  }

  return { client };
}

function parseCampaign(c: any, ins: any) {
  const leads = extractAction(ins.actions, LEAD_TYPES);
  const purchases = extractAction(ins.actions, PURCHASE_TYPES);
  const cpl = extractCostPerAction(ins.cost_per_action_type, LEAD_TYPES);
  const costPerPurchase = extractCostPerAction(ins.cost_per_action_type, PURCHASE_TYPES);
  const spend = parseFloat(ins.spend || "0");
  const results = extractResults(ins.actions);
  const cost_per_result = extractCostPerResult(ins.cost_per_action_type);
  const result_type = extractResultType(ins.actions);
  const landingPageViews = extractAction(ins.actions, LANDING_PAGE_TYPES);
  const addToCart = extractAction(ins.actions, ADD_TO_CART_TYPES);
  const initiateCheckout = extractAction(ins.actions, INITIATE_CHECKOUT_TYPES);

  return {
    id: c.id,
    name: c.name,
    status: ({ ACTIVE: "active", PAUSED: "paused", DELETED: "ended", ARCHIVED: "ended" } as Record<string, string>)[c.status] || "ended",
    spend,
    budget: parseFloat(c.daily_budget || "0") / 100,
    impressions: parseInt(ins.impressions || "0"),
    reach: parseInt(ins.reach || "0"),
    clicks: parseInt(ins.clicks || "0"),
    leads,
    cpl,
    purchases,
    cost_per_purchase: costPerPurchase,
    results,
    cost_per_result,
    result_type,
    conversions: leads + purchases,
    ctr: parseFloat(ins.ctr || "0"),
    cpc: parseFloat(ins.cpc || "0"),
    cpm: parseFloat(ins.cpm || "0"),
    frequency: parseFloat(ins.frequency || "0"),
    landing_page_views: landingPageViews,
    add_to_cart: addToCart,
    initiate_checkout: initiateCheckout,
    created_time: c.created_time || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await authenticateRequest(req, supabase);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = auth.user.id;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action || "insights";
    const clientId = body.client_id;
    const timeRange = body.time_range as { since: string; until: string } | undefined;
    const datePreset = body.date_preset || "last_30d";

    if (!clientId) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientResult = await getClient(supabase, userId, clientId);
    if ("error" in clientResult) {
      return new Response(JSON.stringify({ error: clientResult.error }),
        { status: clientResult.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const client = clientResult.client;

    const accessToken = client.meta_access_token;
    const adAccountId = client.meta_ad_account_id.startsWith("act_")
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;

    const dateFilter = timeRange
      ? timeRangeParam(timeRange)
      : `date_preset=${datePreset}`;

    // ==================== CAMPAIGNS ====================
    if (action === "campaigns") {
      const insightsDateParam = timeRange
        ? `time_range({"since":"${timeRange.since}","until":"${timeRange.until}"})`
        : `date_preset(${datePreset})`;

      const fields = `name,status,daily_budget,created_time,insights.${insightsDateParam}{spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency}`;
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const campaigns = (data.data || []).map((c: any) => {
        const ins = c.insights?.data?.[0] || {};
        return parseCampaign(c, ins);
      });

      return new Response(JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== ADS ====================
    if (action === "ads") {
      const insightsDateParam = timeRange
        ? `time_range({"since":"${timeRange.since}","until":"${timeRange.until}"})`
        : `date_preset(${datePreset})`;

      const fields = `name,status,campaign_id,campaign{name},creative{thumbnail_url,image_url},insights.${insightsDateParam}{spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency}`;
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/ads?fields=${fields}&limit=200&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ads = (data.data || []).map((ad: any) => {
        const ins = ad.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || "0");
        const impressions = parseInt(ins.impressions || "0");
        const clicks = parseInt(ins.clicks || "0");
        const results = extractResults(ins.actions);
        const cost_per_result = extractCostPerResult(ins.cost_per_action_type);
        const result_type = extractResultType(ins.actions);
        // Extract video metrics from actions array (video_view = 3s views)
        const video3s = extractAction(ins.actions, ["video_view"]);
        const thruplay = extractAction(ins.actions, ["video_thruplay"]);

        return {
          id: ad.id,
          name: ad.name,
          status: ad.status === "ACTIVE" ? "active" : "paused",
          campaign_id: ad.campaign_id,
          campaign_name: ad.campaign?.name || "",
          thumbnail_url: ad.creative?.thumbnail_url || null,
          image_url: ad.creative?.image_url || null,
          spend,
          impressions,
          reach: parseInt(ins.reach || "0"),
          clicks,
          results,
          cost_per_result,
          result_type,
          ctr: parseFloat(ins.ctr || "0"),
          cpc: parseFloat(ins.cpc || "0"),
          cpm: parseFloat(ins.cpm || "0"),
          frequency: parseFloat(ins.frequency || "0"),
          video_3s_views: video3s,
          video_thruplay: thruplay,
          hook_rate: impressions > 0 ? (video3s / impressions) * 100 : 0,
          hold_rate: video3s > 0 ? (thruplay / video3s) * 100 : 0,
        };
      });

      return new Response(JSON.stringify({ ads }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== INSIGHTS ====================
    if (action === "insights") {
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency&${dateFilter}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ins = data.data?.[0] || {};
      const leads = extractAction(ins.actions, LEAD_TYPES);
      const purchases = extractAction(ins.actions, PURCHASE_TYPES);
      const cpl = extractCostPerAction(ins.cost_per_action_type, LEAD_TYPES);
      const costPerPurchase = extractCostPerAction(ins.cost_per_action_type, PURCHASE_TYPES);
      const spend = parseFloat(ins.spend || "0");
      const results = extractResults(ins.actions);
      const cost_per_result = extractCostPerResult(ins.cost_per_action_type);
      const landingPageViews = extractAction(ins.actions, LANDING_PAGE_TYPES);
      const addToCart = extractAction(ins.actions, ADD_TO_CART_TYPES);
      const initiateCheckout = extractAction(ins.actions, INITIATE_CHECKOUT_TYPES);

      // Daily breakdown
      const dailyRes = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions&${dateFilter}&time_increment=1&access_token=${accessToken}`
      );
      const dailyData = await dailyRes.json();
      const daily = (dailyData.data || []).map((d: any) => ({
        date: new Date(d.date_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        date_raw: d.date_start,
        spend: parseFloat(d.spend || "0"),
        impressions: parseInt(d.impressions || "0"),
        reach: parseInt(d.reach || "0"),
        clicks: parseInt(d.clicks || "0"),
        leads: extractAction(d.actions, LEAD_TYPES),
        purchases: extractAction(d.actions, PURCHASE_TYPES),
        results: extractResults(d.actions),
      }));

      return new Response(JSON.stringify({
        spend,
        impressions: parseInt(ins.impressions || "0"),
        reach: parseInt(ins.reach || "0"),
        clicks: parseInt(ins.clicks || "0"),
        leads,
        cpl,
        purchases,
        cost_per_purchase: costPerPurchase,
        results,
        cost_per_result,
        conversions: leads + purchases,
        ctr: parseFloat(ins.ctr || "0"),
        cpc: parseFloat(ins.cpc || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        frequency: parseFloat(ins.frequency || "0"),
        roas: spend > 0 ? (purchases * costPerPurchase) / spend : 0,
        landing_page_views: landingPageViews,
        add_to_cart: addToCart,
        initiate_checkout: initiateCheckout,
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
        const periodDays: Record<string, number> = {
          last_7d: 7, last_14d: 14, last_30d: 30, last_60d: 60, last_90d: 90,
        };
        const days = periodDays[datePreset] || 30;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - days - 1);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days + 1);
        prevSince = startDate.toISOString().split("T")[0];
        prevUntil = endDate.toISOString().split("T")[0];
      }

      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency&${timeRangeParam({ since: prevSince, until: prevUntil })}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ins = data.data?.[0] || {};
      const leads = extractAction(ins.actions, LEAD_TYPES);
      const purchases = extractAction(ins.actions, PURCHASE_TYPES);
      const cpl = extractCostPerAction(ins.cost_per_action_type, LEAD_TYPES);
      const costPerPurchase = extractCostPerAction(ins.cost_per_action_type, PURCHASE_TYPES);
      const spend = parseFloat(ins.spend || "0");
      const results = extractResults(ins.actions);
      const cost_per_result = extractCostPerResult(ins.cost_per_action_type);

      return new Response(JSON.stringify({
        spend,
        impressions: parseInt(ins.impressions || "0"),
        reach: parseInt(ins.reach || "0"),
        clicks: parseInt(ins.clicks || "0"),
        leads,
        cpl,
        purchases,
        cost_per_purchase: costPerPurchase,
        results,
        cost_per_result,
        conversions: leads + purchases,
        ctr: parseFloat(ins.ctr || "0"),
        cpc: parseFloat(ins.cpc || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        frequency: parseFloat(ins.frequency || "0"),
        roas: spend > 0 ? (purchases * costPerPurchase) / spend : 0,
        daily: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
