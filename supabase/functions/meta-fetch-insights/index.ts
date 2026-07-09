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
const VIEW_CONTENT_TYPES = ["view_content", "offsite_conversion.fb_pixel_view_content", "omni_view_content"];

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

function extractActionValue(actionValues: any[], types: string[]): number {
  if (!actionValues) return 0;
  for (const t of types) {
    const found = actionValues.find((a: any) => a.action_type === t);
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

const TOKEN_INVALID_SUBCODES = new Set([458, 459, 460, 463, 464, 467, 492]);

function isTokenInvalidError(err: any): boolean {
  if (!err) return false;
  if (err.code === 190) return true;
  if (err.error_subcode && TOKEN_INVALID_SUBCODES.has(err.error_subcode)) return true;
  const msg = (err.message || "").toLowerCase();
  return msg.includes("access token") || msg.includes("session has been invalidated") || msg.includes("session has expired");
}

function graphErrorResponse(err: any) {
  const tokenInvalid = isTokenInvalidError(err);
  return new Response(
    JSON.stringify({
      error: err?.message || "Erro Meta Graph API",
      code: tokenInvalid ? "META_TOKEN_INVALID" : "META_API_ERROR",
    }),
    {
      status: tokenInvalid ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function authenticateRequest(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Não autenticado", status: 401 };
  }
  const token = authHeader.replace("Bearer ", "");
  
  // Decode JWT payload to get user ID (the auth server validates the signature)
  try {
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    const userId = payload.sub;
    if (!userId) {
      return { error: "Token inválido", status: 401 };
    }
    // Verify user exists via admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      console.error("Auth admin error:", userError?.message);
      return { error: "Token inválido", status: 401 };
    }
    return { user };
  } catch (e) {
    console.error("Token decode error:", e instanceof Error ? e.message : String(e));
    return { error: "Token inválido", status: 401 };
  }
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
  const purchaseValue = extractActionValue(ins.action_values, PURCHASE_TYPES);
  const purchaseRoas = spend > 0 ? purchaseValue / spend : 0;

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
    purchase_value: purchaseValue,
    purchase_roas: purchaseRoas,
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

    if (timeRange) {
      const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
      if (!DATE_RE.test(timeRange.since) || !DATE_RE.test(timeRange.until)) {
        return new Response(JSON.stringify({ error: "Formato de data inválido (esperado YYYY-MM-DD)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

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

      const fields = `name,status,daily_budget,created_time,insights.${insightsDateParam}{spend,impressions,reach,clicks,actions,action_values,cost_per_action_type,ctr,cpc,cpm,frequency}`;
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return graphErrorResponse(data.error);
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

      const fields = `name,status,campaign_id,campaign{name},creative{thumbnail_url,image_url,object_type,video_id,image_hash,object_story_spec},insights.${insightsDateParam}{spend,impressions,reach,clicks,actions,action_values,cost_per_action_type,ctr,cpc,cpm,frequency}`;
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/ads?fields=${fields}&limit=200&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return graphErrorResponse(data.error);
      }

      const rawAds = data.data || [];

      // Fetch video sources in parallel for ads that have a video_id
      const videoIds = Array.from(new Set(
        rawAds.map((ad: any) => ad.creative?.video_id).filter(Boolean)
      )) as string[];
      const videoMeta = new Map<string, { source?: string; picture?: string }>();
      await Promise.all(videoIds.map(async (vid) => {
        try {
          const r = await fetch(`${GRAPH_API}/${vid}?fields=source,picture&access_token=${accessToken}`);
          const j = await r.json();
          if (!j.error) videoMeta.set(vid, { source: j.source, picture: j.picture });
        } catch (_) { /* ignore */ }
      }));

      const ads = rawAds.map((ad: any) => {
        const ins = ad.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || "0");
        const impressions = parseInt(ins.impressions || "0");
        const clicks = parseInt(ins.clicks || "0");
        const results = extractResults(ins.actions);
        const cost_per_result = extractCostPerResult(ins.cost_per_action_type);
        const result_type = extractResultType(ins.actions);
        const video3s = extractAction(ins.actions, ["video_view"]);
        const thruplay = extractAction(ins.actions, ["video_thruplay"]);
        const purchases = extractAction(ins.actions, PURCHASE_TYPES);
        const purchase_value = extractActionValue(ins.action_values, PURCHASE_TYPES);
        const purchase_roas = spend > 0 ? purchase_value / spend : 0;

        const creative = ad.creative || {};
        const oss = creative.object_story_spec || {};
        const videoId = creative.video_id || oss.video_data?.video_id || null;
        const vMeta = videoId ? videoMeta.get(videoId) : undefined;

        const image_url_hd =
          oss.link_data?.child_attachments?.[0]?.picture ||
          oss.link_data?.picture ||
          oss.video_data?.image_url ||
          vMeta?.picture ||
          creative.image_url ||
          creative.thumbnail_url ||
          null;

        return {
          id: ad.id,
          name: ad.name,
          status: ad.status === "ACTIVE" ? "active" : "paused",
          campaign_id: ad.campaign_id,
          campaign_name: ad.campaign?.name || "",
          thumbnail_url: creative.thumbnail_url || null,
          image_url: creative.image_url || null,
          image_url_hd,
          video_id: videoId,
          video_source_url: vMeta?.source || null,
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
          purchases,
          purchase_value,
          purchase_roas,
        };
      });

      // Sort by ROAS (descending) and limit to top 50
      const topAds = ads.sort((a: any, b: any) => b.purchase_roas - a.purchase_roas).slice(0, 50);
      const totalCount = ads.length;
      const metadata = totalCount > 50 ? { showing: 50, total: totalCount } : undefined;

      return new Response(JSON.stringify({ ads: topAds, metadata }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ==================== INSIGHTS ====================
    if (action === "insights") {
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,action_values,cost_per_action_type,ctr,cpc,cpm,frequency&${dateFilter}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return graphErrorResponse(data.error);
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
      const viewContent = extractAction(ins.actions, VIEW_CONTENT_TYPES);
      const costPerAddToCart = extractCostPerAction(ins.cost_per_action_type, ADD_TO_CART_TYPES);
      const costPerInitiateCheckout = extractCostPerAction(ins.cost_per_action_type, INITIATE_CHECKOUT_TYPES);
      const costPerViewContent = extractCostPerAction(ins.cost_per_action_type, VIEW_CONTENT_TYPES);
      const purchaseValue = extractActionValue(ins.action_values, PURCHASE_TYPES);
      const purchaseRoas = spend > 0 ? purchaseValue / spend : 0;

      // Daily breakdown — paginate to cover full custom ranges (Meta default page size = 25)
      const dailyAll: any[] = [];
      let nextUrl: string | null =
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions&${dateFilter}&time_increment=1&limit=500&access_token=${accessToken}`;
      let pageGuard = 0;
      while (nextUrl && pageGuard < 20) {
        const r = await fetch(nextUrl);
        const j = await r.json();
        if (j.error) break;
        dailyAll.push(...(j.data || []));
        nextUrl = j.paging?.next || null;
        pageGuard++;
      }
      const dailyByDate = new Map<string, any>();
      for (const d of dailyAll) {
        dailyByDate.set(d.date_start, {
          date: new Date(d.date_start + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
          date_raw: d.date_start,
          spend: parseFloat(d.spend || "0"),
          impressions: parseInt(d.impressions || "0"),
          reach: parseInt(d.reach || "0"),
          clicks: parseInt(d.clicks || "0"),
          leads: extractAction(d.actions, LEAD_TYPES),
          purchases: extractAction(d.actions, PURCHASE_TYPES),
          results: extractResults(d.actions),
        });
      }

      // Resolve range (since/until) — fill missing days with zeros so chart shows full selected range
      const resolveRange = (): { since: Date; until: Date } | null => {
        if (timeRange?.since && timeRange?.until) {
          const [sy, sm, sd] = timeRange.since.split("-").map(Number);
          const [uy, um, ud] = timeRange.until.split("-").map(Number);
          return {
            since: new Date(Date.UTC(sy, sm - 1, sd)),
            until: new Date(Date.UTC(uy, um - 1, ud)),
          };
        }
        const today = new Date();
        const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const daysAgo = (n: number) => {
          const d = new Date(utcToday);
          d.setUTCDate(d.getUTCDate() - n);
          return d;
        };
        switch (datePreset) {
          case "today": return { since: utcToday, until: utcToday };
          case "yesterday": return { since: daysAgo(1), until: daysAgo(1) };
          case "last_7d": return { since: daysAgo(6), until: utcToday };
          case "last_14d": return { since: daysAgo(13), until: utcToday };
          case "last_30d": return { since: daysAgo(29), until: utcToday };
          case "this_month": {
            const s = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1));
            return { since: s, until: utcToday };
          }
          case "last_month": {
            const s = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() - 1, 1));
            const e = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 0));
            return { since: s, until: e };
          }
          default: return { since: daysAgo(29), until: utcToday };
        }
      };

      const range = resolveRange();
      const daily: any[] = [];
      if (range) {
        const cursor = new Date(range.since);
        while (cursor.getTime() <= range.until.getTime()) {
          const iso = cursor.toISOString().slice(0, 10);
          const existing = dailyByDate.get(iso);
          daily.push(existing ?? {
            date: cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
            date_raw: iso,
            spend: 0,
            impressions: 0,
            reach: 0,
            clicks: 0,
            leads: 0,
            purchases: 0,
            results: 0,
          });
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      } else {
        daily.push(...Array.from(dailyByDate.values()));
      }

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
        roas: purchaseRoas,
        purchase_value: purchaseValue,
        purchase_roas: purchaseRoas,
        landing_page_views: landingPageViews,
        add_to_cart: addToCart,
        initiate_checkout: initiateCheckout,
        view_content: viewContent,
        cost_per_add_to_cart: costPerAddToCart,
        cost_per_initiate_checkout: costPerInitiateCheckout,
        cost_per_view_content: costPerViewContent,
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
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,action_values,cost_per_action_type,ctr,cpc,cpm,frequency&${timeRangeParam({ since: prevSince, until: prevUntil })}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return graphErrorResponse(data.error);
      }

      const ins = data.data?.[0] || {};
      const leads = extractAction(ins.actions, LEAD_TYPES);
      const purchases = extractAction(ins.actions, PURCHASE_TYPES);
      const cpl = extractCostPerAction(ins.cost_per_action_type, LEAD_TYPES);
      const costPerPurchase = extractCostPerAction(ins.cost_per_action_type, PURCHASE_TYPES);
      const spend = parseFloat(ins.spend || "0");
      const results = extractResults(ins.actions);
      const cost_per_result = extractCostPerResult(ins.cost_per_action_type);
      const purchaseValue = extractActionValue(ins.action_values, PURCHASE_TYPES);
      const purchaseRoas = spend > 0 ? purchaseValue / spend : 0;

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
        roas: purchaseRoas,
        purchase_value: purchaseValue,
        purchase_roas: purchaseRoas,
        daily: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
