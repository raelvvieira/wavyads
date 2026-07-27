import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// v18 foi desativado pelo Google em ago/2025 — mantendo uma versão suportada.
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";
// Contas de cliente hoje são acessadas via a gerenciadora WAVY. Usado como
// fallback quando ainda não sabemos qual login-customer-id uma conta precisa.
const WAVY_MANAGER_CUSTOMER_ID = "8125716511";

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

// Busca nome e tipo de uma conta. Tenta sem login-customer-id e, se falhar,
// repete com o ID da gerenciadora WAVY (necessário em contas sob MCC — usar
// o ID da própria conta como login-customer-id não resolve permissão).
// Retorna também qual login-customer-id funcionou, pra ser salvo junto do
// cliente e reaproveitado nas consultas de métricas.
async function fetchAccountInfo(
  customerId: string,
  accessToken: string,
  developerToken: string,
): Promise<{ name: string; manager: boolean; loginCustomerId: string | null }> {
  const query = "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1";
  const attempts: Array<{ loginCustomerId: string | null; headers: Record<string, string> }> = [
    { loginCustomerId: null, headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken, "Content-Type": "application/json" } },
    {
      loginCustomerId: WAVY_MANAGER_CUSTOMER_ID,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "login-customer-id": WAVY_MANAGER_CUSTOMER_ID,
        "Content-Type": "application/json",
      },
    },
  ];
  for (const attempt of attempts) {
    try {
      const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`, {
        method: "POST",
        headers: attempt.headers,
        body: JSON.stringify({ query }),
      });
      const detail = await readJson(res, `customer ${customerId}`);
      const customer = Array.isArray(detail)
        ? detail?.[0]?.results?.[0]?.customer
        : detail?.results?.[0]?.customer;
      if (customer?.descriptiveName) {
        return { name: customer.descriptiveName, manager: !!customer.manager, loginCustomerId: attempt.loginCustomerId };
      }
    } catch (e) {
      console.error(`Falha ao obter nome da conta ${customerId}:`, e);
    }
  }
  return { name: `Conta ${customerId}`, manager: false, loginCustomerId: null };
}

// Explora a hierarquia enxergada a partir de uma conta de topo (retornada por
// listAccessibleCustomers). Se ela for uma gerenciadora (caso da WAVY), o
// listAccessibleCustomers só devolve o ID da própria gerenciadora — não das
// contas de anúncio de cada cliente abaixo dela. É preciso consultar
// customer_client (padrão da Google Ads API pra andar a hierarquia de um
// MCC) pra achar as contas filhas de verdade.
async function fetchAccountHierarchy(
  topId: string,
  accessToken: string,
  developerToken: string,
): Promise<Array<{ id: string; name: string; manager: boolean; loginCustomerId?: string }>> {
  const query = `
    SELECT customer_client.id, customer_client.descriptive_name,
           customer_client.manager, customer_client.level
    FROM customer_client
    WHERE customer_client.level <= 1
  `;
  try {
    const res = await fetch(`${GOOGLE_ADS_API}/customers/${topId}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "login-customer-id": topId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    const data = await readJson(res, `customer_client ${topId}`);
    if (data.error) {
      console.error(`customer_client ${topId} error:`, JSON.stringify(data.error));
      return [];
    }

    const rows: any[] = [];
    if (Array.isArray(data)) {
      for (const batch of data) if (batch.results) rows.push(...batch.results);
    }

    const self = rows.find((r) => String(r.customerClient?.level) === "0");
    if (self && self.customerClient?.manager === false) {
      // Não é gerenciadora — a própria conta de topo já é a conta de anúncios.
      return [{ id: topId, name: self.customerClient.descriptiveName || `Conta ${topId}`, manager: false }];
    }

    // É gerenciadora: retorna as contas de anúncio diretamente abaixo dela.
    return rows
      .filter((r) => String(r.customerClient?.level) === "1" && r.customerClient?.manager === false)
      .map((r) => ({
        id: String(r.customerClient.id),
        name: r.customerClient.descriptiveName || `Conta ${r.customerClient.id}`,
        manager: false,
        loginCustomerId: topId,
      }));
  } catch (e) {
    console.error(`Falha ao explorar hierarquia de ${topId}:`, e);
    return [];
  }
}

// Lista as contas acessíveis com o access token informado.
async function listAccounts(
  accessToken: string,
  developerToken: string,
): Promise<{ accounts: Array<{ id: string; name: string; manager: boolean; loginCustomerId?: string }>; error: string | null }> {
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

  const topIds = resourceNames.map((rn) => rn.replace("customers/", ""));
  const nested = await Promise.all(topIds.map((id) => fetchAccountHierarchy(id, accessToken, developerToken)));
  let accounts = nested.flat();

  // Se a exploração da hierarquia não achou nada (ex.: erro de acesso ao
  // customer_client), cai pro comportamento antigo de listar as contas de
  // topo diretamente — inclusive gerenciadoras, marcadas como tal.
  if (accounts.length === 0) {
    accounts = await Promise.all(
      topIds.map(async (customerId) => {
        const info = await fetchAccountInfo(customerId, accessToken, developerToken);
        return { id: customerId, name: info.name, manager: info.manager, loginCustomerId: info.loginCustomerId || undefined };
      }),
    );
    // Contas gerenciadoras (MCC) não têm campanhas — vão para o fim da lista.
    accounts.sort((a, b) => Number(a.manager) - Number(b.manager) || a.name.localeCompare(b.name));
  }

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

    // ========== LIST ACCOUNTS (usa refresh token já salvo) ==========
    if (action === "list-accounts") {
      const dbClientId = body.client_id;
      if (!dbClientId) {
        return new Response(JSON.stringify({ error: "client_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const accessToken = await refreshAccessToken(supabase, dbClientId, clientId, clientSecret);
      const { accounts, error: listError } = await listAccounts(accessToken, developerToken);
      return new Response(
        JSON.stringify({ success: accounts.length > 0, accounts, error: listError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== SET ACCOUNT MANUAL ==========
    if (action === "set-account-manual") {
      const dbClientId = body.client_id;
      const rawId = String(body.customer_id || "").replace(/\D/g, "");
      if (!dbClientId || rawId.length !== 10) {
        return new Response(JSON.stringify({ error: "Informe um Customer ID válido (10 dígitos)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const accessToken = await refreshAccessToken(supabase, dbClientId, clientId, clientSecret);
      const info = await fetchAccountInfo(rawId, accessToken, developerToken);
      if (info.manager) {
        return new Response(JSON.stringify({ error: `"${info.name}" é uma conta gerenciadora (MCC) e não possui campanhas. Escolha uma conta de anúncios.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const name = info.name;

      const { error } = await supabase
        .from("clients")
        .update({
          google_ads_customer_id: rawId,
          google_ads_customer_name: name,
          google_ads_login_customer_id: info.loginCustomerId,
          google_ads_synced: true,
          google_ads_last_sync_at: new Date().toISOString(),
        })
        .eq("id", dbClientId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, account: { id: rawId, name } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // ========== SELECT ACCOUNT ==========
    if (action === "select-account") {
      const dbClientId = body.client_id;
      const customerId = body.customer_id;
      const customerName = body.customer_name;
      const loginCustomerId = body.login_customer_id;

      if (!dbClientId || !customerId) {
        return new Response(JSON.stringify({ error: "client_id e customer_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("clients")
        .update({
          google_ads_customer_id: customerId,
          google_ads_customer_name: customerName || null,
          google_ads_login_customer_id: loginCustomerId || null,
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
          google_ads_login_customer_id: null,
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
