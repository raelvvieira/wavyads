import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v24.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credentials
    const { data: creds, error: credError } = await supabase
      .from("facebook_credentials")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (credError || !creds) {
      return new Response(
        JSON.stringify({ error: "Credenciais do Facebook não configuradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse action from body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }
    const action = body.action || "test";
    const datePreset = body.date_preset || "last_30d";
    const accessToken = creds.access_token;
    const adAccountId = creds.ad_account_id.startsWith("act_")
      ? creds.ad_account_id
      : `act_${creds.ad_account_id}`;

    if (action === "test") {
      // Test connection
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}?fields=name,account_status&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        // Mark as invalid
        await supabase
          .from("facebook_credentials")
          .update({ is_valid: false })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: false, error: data.error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as valid
      await supabase
        .from("facebook_credentials")
        .update({ is_valid: true })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true, account_name: data.name, account_status: data.account_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "campaigns") {
      // Get campaigns with insights
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/campaigns?fields=name,status,daily_budget,insights.date_preset(${datePreset}){spend,impressions,clicks,actions,ctr,cpc}&limit=100&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(
          JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const campaigns = (data.data || []).map((c: any) => {
        const insights = c.insights?.data?.[0] || {};
        const conversions = (insights.actions || []).find(
          (a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "lead"
        );

        const statusMap: Record<string, string> = {
          ACTIVE: "active",
          PAUSED: "paused",
          DELETED: "ended",
          ARCHIVED: "ended",
        };

        return {
          id: c.id,
          name: c.name,
          status: statusMap[c.status] || "ended",
          spend: parseFloat(insights.spend || "0"),
          budget: parseFloat(c.daily_budget || "0") / 100,
          impressions: parseInt(insights.impressions || "0"),
          clicks: parseInt(insights.clicks || "0"),
          conversions: parseInt(conversions?.value || "0"),
          ctr: parseFloat(insights.ctr || "0"),
          cpc: parseFloat(insights.cpc || "0"),
        };
      });

      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "insights") {
      // Account-level insights
      const res = await fetch(
        `${GRAPH_API}/${adAccountId}/insights?fields=spend,impressions,clicks,actions,ctr,cpc&date_preset=${datePreset}&access_token=${accessToken}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(
          JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const insights = data.data?.[0] || {};
      const conversions = (insights.actions || []).find(
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

      return new Response(
        JSON.stringify({
          spend: parseFloat(insights.spend || "0"),
          impressions: parseInt(insights.impressions || "0"),
          clicks: parseInt(insights.clicks || "0"),
          conversions: parseInt(conversions?.value || "0"),
          daily_spend: dailySpend,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
