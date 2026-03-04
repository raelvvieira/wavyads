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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const appId = Deno.env.get("FACEBOOK_APP_ID")!;
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET")!;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const action = body.action;

    // Actions that don't require auth: auth-url
    if (action === "auth-url") {
      const redirectUri = body.redirect_uri;
      if (!redirectUri) {
        return new Response(
          JSON.stringify({ error: "redirect_uri é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scopes = "ads_read,business_management";
      const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    if (action === "callback") {
      const code = body.code;
      const redirectUri = body.redirect_uri;

      if (!code || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "code e redirect_uri são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Exchange code for short-lived token
      const tokenRes = await fetch(
        `${GRAPH_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(
          JSON.stringify({ error: tokenData.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shortToken = tokenData.access_token;

      // 2. Exchange for long-lived token (60 days)
      const longRes = await fetch(
        `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
      );
      const longData = await longRes.json();

      if (longData.error) {
        return new Response(
          JSON.stringify({ error: longData.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const longToken = longData.access_token;
      const expiresIn = longData.expires_in || 5184000; // 60 days default
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // 3. Save or update credentials (without ad_account yet)
      const { data: existing } = await supabase
        .from("facebook_credentials")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("facebook_credentials")
          .update({
            access_token: longToken,
            token_expires_at: expiresAt,
            is_valid: false,
            ad_account_id: "",
            ad_account_name: null,
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("facebook_credentials")
          .insert({
            user_id: userId,
            access_token: longToken,
            token_expires_at: expiresAt,
            ad_account_id: "",
            is_valid: false,
          });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accounts") {
      // Get stored token
      const { data: creds } = await supabase
        .from("facebook_credentials")
        .select("access_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (!creds?.access_token) {
        return new Response(
          JSON.stringify({ error: "Faça login no Facebook primeiro" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(
        `${GRAPH_API}/me/adaccounts?fields=name,account_id,account_status,business{name}&limit=100&access_token=${creds.access_token}`
      );
      const data = await res.json();

      if (data.error) {
        return new Response(
          JSON.stringify({ error: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accounts = (data.data || []).map((acc: any) => ({
        id: acc.id,
        account_id: acc.account_id,
        name: acc.name,
        status: acc.account_status,
        business_name: acc.business?.name || null,
      }));

      return new Response(
        JSON.stringify({ accounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "select-account") {
      const adAccountId = body.ad_account_id;
      const adAccountName = body.ad_account_name;

      if (!adAccountId) {
        return new Response(
          JSON.stringify({ error: "ad_account_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("facebook_credentials")
        .update({
          ad_account_id: adAccountId,
          ad_account_name: adAccountName || null,
          is_valid: true,
        })
        .eq("user_id", userId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      await supabase
        .from("facebook_credentials")
        .delete()
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true }),
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
