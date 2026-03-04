import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v20.0";

// All common Meta result action types ordered by specificity
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

// Extract total results: return the FIRST matching result type value
function extractResults(actions: any[]): number {
  if (!actions) return 0;
  for (const t of RESULT_TYPES) {
    const found = actions.find((a: any) => a.action_type === t);
    if (found) return parseInt(found.value || "0");
  }
  return 0;
}

// Extract the action_type string of the primary result
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

const LEAD_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];
const PURCHASE_TYPES = ["purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action || "insights";
    const clientId = body.client_id;
    const datePreset = body.date_preset || "last_30d";

    if (!clientId) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    let clientQuery = supabase.from("clients").select("*").eq("id", clientId);
    if (!isAdmin) {
      clientQuery = clientQuery.eq("user_id", userId);
    }

    const { data: client, error: clientError } = await clientQuery.maybeSingle();
    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado ou sem acesso" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!client.meta_access_token || !client.meta_ad_account_id) {
      return new Response(JSON.stringify({ error: "Cliente não sincronizado com Meta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = client.meta_access_token;
    const adAccountId = client.meta_ad_account_id.startsWith("act_")
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;

    if (action === "campaigns") {
      const fields = "name,status,daily_budget,insights.date_preset(" + datePreset + "){spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency}";
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const statusMap: Record<string, string> = {
        ACTIVE: "active", PAUSED: "paused", DELETED: "ended", ARCHIVED: "ended",
      };

      const campaigns = (data.data || []).map((c: any) => {
        const ins = c.insights?.data?.[0] || {};
        const leads = extractAction(ins.actions, LEAD_TYPES);
        const purchases = extractAction(ins.actions, PURCHASE_TYPES);
        const cpl = extractCostPerAction(ins.cost_per_action_type, LEAD_TYPES);
        const costPerPurchase = extractCostPerAction(ins.cost_per_action_type, PURCHASE_TYPES);
        const spend = parseFloat(ins.spend || "0");
        const results = extractResults(ins.actions);
        const cost_per_result = extractCostPerResult(ins.cost_per_action_type);

        return {
          id: c.id,
          name: c.name,
          status: statusMap[c.status] || "ended",
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
          conversions: leads + purchases,
          ctr: parseFloat(ins.ctr || "0"),
          cpc: parseFloat(ins.cpc || "0"),
          cpm: parseFloat(ins.cpm || "0"),
          frequency: parseFloat(ins.frequency || "0"),
        };
      });

      return new Response(JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insights") {
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency&date_preset=${datePreset}&access_token=${accessToken}`
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

      // Daily breakdown with more fields
      const dailyRes = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions&date_preset=${datePreset}&time_increment=1&access_token=${accessToken}`
      );
      const dailyData = await dailyRes.json();
      const daily = (dailyData.data || []).map((d: any) => ({
        date: new Date(d.date_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
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
        daily,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insights_previous") {
      const periodDays: Record<string, number> = {
        last_7d: 7, last_14d: 14, last_30d: 30, last_60d: 60, last_90d: 90,
      };
      const days = periodDays[datePreset] || 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - days - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days + 1);
      
      const since = startDate.toISOString().split("T")[0];
      const until = endDate.toISOString().split("T")[0];

      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,reach,clicks,actions,cost_per_action_type,ctr,cpc,cpm,frequency&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`
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
