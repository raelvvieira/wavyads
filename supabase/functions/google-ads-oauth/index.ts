import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// v18 foi desativado pelo Google em ago/2025 — mantendo uma versão suportada.
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";

// O Google às vezes responde com uma página HTML (404/500) em vez de JSON.
// Sem essa proteção, res.json() estoura com "Unexpected token '<'".
async function readJson(res: Response, label: string): Promise<any> {
  const raw = await res.text();
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) {
    console.error(`[${label}] resposta não-JSON (status ${res.status}): ${raw.slice(0, 300)}`);
    throw new Error(`Google respondeu ${res.status} (não-JSON) em ${label}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`[${label}] JSON inválido (status ${res.status}): ${raw.slice(0, 300)}`);
    throw new Error(`Resposta inválida do Google em ${label}`);
  }
}

// Busca o nome de uma conta. Tenta sem login-customer-id e, se falhar,
// repete com o header (necessário em contas sob MCC).
async function fetchAccountName(
  customerId: string,
  accessToken: string,
  developerToken: string,
): Promise<string> {
  const query = "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1";
  const attempts: Array<Record<string, string>> = [
    { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken, "Content-Type": "application/json" },
    {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "login-customer-id": customerId,
      "Content-Type": "application/json",
    },
  ];
  for (const headers of attempts) {
    try {
      const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });
      const detail = await readJson(res, `customer ${customerId}`);
      const name = Array.isArray(detail)
        ? detail?.[0]?.results?.[0]?.customer?.descriptiveName
        : detail?.results?.[0]?.customer?.descriptiveName;
      if (name) return name;
    } catch (e) {
      console.error(`Falha ao obter nome da conta ${customerId}:`, e);
    }
  }
  return `Conta ${customerId}`;
}

// Lista as contas acessíveis com o access token informado.
async function listAccounts(
  accessToken: string,
  developerToken: string,
): Promise<{ accounts: Array<{ id: string; name: string }>; error: string | null }> {
  let resourceNames: string[] = [];
  try {
    const res = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
      headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken },
    });
    const data = await readJson(res, "listAccessibleCustomers");
    if (data.error) {
      console.error("Google Ads listAccessibleCustomers error:", JSON.stringify(data.error));
      return { accounts: [], error: data.error.message || "Não foi possível listar as contas do Google Ads." };
    }
    resourceNames = data.resourceNames || [];
  } catch (e) {
    console.error("listAccessibleCustomers falhou:", e);
    return { accounts: [], error: e instanceof Error ? e.message : "Falha ao listar contas do Google Ads." };
  }

  const accounts = await Promise.all(
    resourceNames.map(async (rn) => {
      const customerId = rn.replace("customers/", "");
      return { id: customerId, name: await fetchAccountName(customerId, accessToken, developerToken) };
    }),
  );

  if (accounts.length === 0) {
    return { accounts, error: "Nenhuma conta do Google Ads foi encontrada para este login." };
  }
  return { accounts, error: null };
}

// Renova o access token a partir do refresh token salvo.
async function refreshAccessToken(
  supabase: any,
  dbClientId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const { data: client } = await supabase
    .from("clients")
    .select("google_ads_access_token, google_ads_refresh_token, google_ads_token_expires_at")
    .eq("id", dbClientId)
    .maybeSingle();

  if (!client) throw new Error("Cliente não encontrado");

  const expires = client.google_ads_token_expires_at ? new Date(client.google_ads_token_expires_at).getTime() : 0;
  if (client.google_ads_access_token && expires - 60_000 > Date.now()) {
    return client.google_ads_access_token;
  }
  if (!client.google_ads_refresh_token) {
    throw new Error("Conexão com Google Ads não encontrada. Sincronize novamente.");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: client.google_ads_refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await readJson(res, "refresh token");
  if (data.error) throw new Error(data.error_description || data.error);

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await supabase
    .from("clients")
    .update({ google_ads_access_token: data.access_token, google_ads_token_expires_at: expiresAt })
    .eq("id", dbClientId);

  return data.access_token;
}



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
      const tokenData = await readJson(tokenRes, "token exchange");

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

      const { accounts, error: listError } = await listAccounts(accessToken, developerToken);

      return new Response(
        JSON.stringify({ success: accounts.length > 0, accounts, warning: listError, error: listError }),
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
