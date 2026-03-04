import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v20.0";

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action || "insights";
    const clientId = body.client_id;
    const datePreset = body.date_preset || "last_30d";

    if (!clientId) {
      return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check access: admin can access any client, client users can only access their own
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
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=name,status,daily_budget,insights.date_preset(${datePreset}){spend,impressions,clicks,actions,ctr,cpc}&limit=100&access_token=${accessToken}`
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
        const conv = (ins.actions || []).find(
          (a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "lead"
        );
        return {
          id: c.id,
          name: c.name,
          status: statusMap[c.status] || "ended",
          spend: parseFloat(ins.spend || "0"),
          budget: parseFloat(c.daily_budget || "0") / 100,
          impressions: parseInt(ins.impressions || "0"),
          clicks: parseInt(ins.clicks || "0"),
          conversions: parseInt(conv?.value || "0"),
          ctr: parseFloat(ins.ctr || "0"),
          cpc: parseFloat(ins.cpc || "0"),
        };
      });

      return new Response(JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insights") {
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,clicks,actions,ctr,cpc,cpm&date_preset=${datePreset}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ins = data.data?.[0] || {};
      const conv = (ins.actions || []).find(
        (a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "lead"
      );

      // Daily breakdown
      const dailyRes = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend&date_preset=${datePreset}&time_increment=1&access_token=${accessToken}`
      );
      const dailyData = await dailyRes.json();
      const dailySpend = (dailyData.data || []).map((d: any) => ({
        date: new Date(d.date_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: parseFloat(d.spend || "0"),
      }));

      return new Response(JSON.stringify({
        spend: parseFloat(ins.spend || "0"),
        impressions: parseInt(ins.impressions || "0"),
        clicks: parseInt(ins.clicks || "0"),
        conversions: parseInt(conv?.value || "0"),
        ctr: parseFloat(ins.ctr || "0"),
        cpc: parseFloat(ins.cpc || "0"),
        cpm: parseFloat(ins.cpm || "0"),
        daily_spend: dailySpend,
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
