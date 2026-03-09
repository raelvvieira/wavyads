import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v18";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!;
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const action = body.action;

    // ========== AUTH URL ==========
    if (action === "auth-url") {
      const redirectUri = body.redirect_uri;
      const stateClientId = body.client_id;
      if (!redirectUri || !stateClientId) {
        return new Response(
          JSON.stringify({ error: "redirect_uri e client_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scope = "https://www.googleapis.com/auth/adwords";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${stateClientId}`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // All other actions require admin auth
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas admin." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== CALLBACK ==========
    if (action === "callback") {
      const code = body.code;
      const redirectUri = body.redirect_uri;
      const dbClientId = body.client_id;

      if (!code || !redirectUri || !dbClientId) {
        return new Response(
          JSON.stringify({ error: "code, redirect_uri e client_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("Google token exchange error:", JSON.stringify(tokenData));
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Save tokens
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          google_ads_access_token: accessToken,
          google_ads_refresh_token: refreshToken,
          google_ads_token_expires_at: expiresAt,
          google_ads_synced: false,
        })
        .eq("id", dbClientId);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // List accessible customer IDs
      const customersRes = await fetch(
        `${GOOGLE_ADS_API}/customers:listAccessibleCustomers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": developerToken,
          },
        }
      );
      const customersData = await customersRes.json();

      if (customersData.error) {
        console.error("Google Ads listAccessibleCustomers error:", JSON.stringify(customersData.error));
        return new Response(JSON.stringify({ error: customersData.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // For each resource name, fetch the customer name
      const resourceNames: string[] = customersData.resourceNames || [];
      const accounts: { id: string; name: string }[] = [];

      for (const rn of resourceNames) {
        const customerId = rn.replace("customers/", "");
        try {
          const detailRes = await fetch(
            `${GOOGLE_ADS_API}/customers/${customerId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "developer-token": developerToken,
                "login-customer-id": customerId,
              },
            }
          );
          const detail = await detailRes.json();
          accounts.push({
            id: customerId,
            name: detail.descriptiveName || `Conta ${customerId}`,
          });
        } catch {
          accounts.push({ id: customerId, name: `Conta ${customerId}` });
        }
      }

      return new Response(
        JSON.stringify({ success: true, accounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SELECT ACCOUNT ==========
    if (action === "select-account") {
      const dbClientId = body.client_id;
      const customerId = body.customer_id;
      const customerName = body.customer_name;

      if (!dbClientId || !customerId) {
        return new Response(JSON.stringify({ error: "client_id e customer_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("clients")
        .update({
          google_ads_customer_id: customerId,
          google_ads_customer_name: customerName || null,
          google_ads_synced: true,
          google_ads_last_sync_at: new Date().toISOString(),
        })
        .eq("id", dbClientId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== DISCONNECT ==========
    if (action === "disconnect") {
      const dbClientId = body.client_id;
      if (!dbClientId) {
        return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("clients")
        .update({
          google_ads_access_token: null,
          google_ads_refresh_token: null,
          google_ads_customer_id: null,
          google_ads_customer_name: null,
          google_ads_synced: false,
          google_ads_token_expires_at: null,
          google_ads_last_sync_at: null,
        })
        .eq("id", dbClientId);

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
    console.error("google-ads-oauth unhandled error:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
