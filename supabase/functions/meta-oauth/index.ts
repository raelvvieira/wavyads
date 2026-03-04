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

    const appId = Deno.env.get("FACEBOOK_APP_ID")!;
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET")!;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action;

    // auth-url: no auth needed, generates Meta OAuth URL with client_id in state
    if (action === "auth-url") {
      const redirectUri = body.redirect_uri;
      const clientId = body.client_id;
      if (!redirectUri || !clientId) {
        return new Response(
          JSON.stringify({ error: "redirect_uri e client_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scopes = "ads_read,business_management";
      const state = clientId;
      const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require admin authentication
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

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas admin." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const code = body.code;
      const redirectUri = body.redirect_uri;
      const clientId = body.client_id;

      if (!code || !redirectUri || !clientId) {
        return new Response(
          JSON.stringify({ error: "code, redirect_uri e client_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Exchange code for short-lived token
      const tokenRes = await fetch(
        `${GRAPH_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2. Exchange for long-lived token (60 days)
      const longRes = await fetch(
        `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      if (longData.error) {
        return new Response(JSON.stringify({ error: longData.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const longToken = longData.access_token;
      const expiresIn = longData.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // 3. Save token to clients table for this client_id
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          meta_access_token: longToken,
          token_expires_at: expiresAt,
          is_synced: false,
        })
        .eq("id", clientId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 4. Fetch ad accounts available with this token
      const accountsRes = await fetch(
        `${GRAPH_API}/me/adaccounts?fields=name,account_id,account_status,business{name}&limit=100&access_token=${longToken}`
      );
      const accountsData = await accountsRes.json();

      const accounts = (accountsData.data || []).map((acc: any) => ({
        id: acc.id,
        account_id: acc.account_id,
        name: acc.name,
        status: acc.account_status,
        business_name: acc.business?.name || null,
      }));

      return new Response(
        JSON.stringify({ success: true, accounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "select-account") {
      const clientId = body.client_id;
      const adAccountId = body.ad_account_id;
      const adAccountName = body.ad_account_name;

      if (!clientId || !adAccountId) {
        return new Response(JSON.stringify({ error: "client_id e ad_account_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("clients")
        .update({
          meta_ad_account_id: adAccountId,
          meta_ad_account_name: adAccountName || null,
          is_synced: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const clientId = body.client_id;
      if (!clientId) {
        return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("clients")
        .update({
          meta_access_token: null,
          meta_ad_account_id: null,
          meta_ad_account_name: null,
          token_expires_at: null,
          is_synced: false,
          last_sync_at: null,
        })
        .eq("id", clientId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
