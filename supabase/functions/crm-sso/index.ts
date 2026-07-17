// crm-sso — emite a sessão do cliente na instância EVO CRM dele (SSO).
//
// Fluxo: o cliente já está logado na Wavy (JWT do Supabase). Esta função:
//   1. Identifica o usuário chamador pelo JWT.
//   2. Resolve o client_id dele (admin pode passar clientId; client-user só o próprio).
//   3. Lê a conexão EVO daquele cliente (tabela segura, via service role).
//   4. Obtém uma sessão no EVO conforme sso_mode e devolve a URL autenticada.
//
// IMPORTANTE — pontos marcados com [FINALIZAR c/ piloto]: dependem da API real
// do EVO (Doorkeeper/JWT), que só dá pra confirmar contra a instância no ar.
// Enquanto não estiver publicada/configurada, o frontend faz fallback pro embed
// simples da crm_url — nada quebra.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CrmConnection {
  client_id: string;
  evo_base_url: string;
  evo_auth_url: string | null;
  evo_user_email: string | null;
  sso_mode: "jwt" | "oauth_password" | "service_token";
  evo_jwt_secret: string | null;
  evo_service_token: string | null;
  evo_password: string | null;
  is_active: boolean;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)));
}

// Assina um JWT HS256 com o segredo do EVO. As claims exatas (iss/aud/sub/campos
// que o Doorkeeper do EVO espera) serão ajustadas contra o piloto.
async function signHs256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(sig))}`;
}

// Constrói a URL do EVO já autenticada, conforme o modo de SSO.
async function buildAuthenticatedUrl(conn: CrmConnection): Promise<string> {
  const base = conn.evo_base_url.replace(/\/+$/, "");
  const now = Math.floor(Date.now() / 1000);

  if (conn.sso_mode === "jwt") {
    if (!conn.evo_jwt_secret) throw new Error("evo_jwt_secret ausente para SSO por JWT");
    // [FINALIZAR c/ piloto] claims que o EVO aceita. Chute inicial baseado no
    // .env do EVO: iss=evo-auth-service, sub=email do usuário, exp curto.
    const token = await signHs256(
      {
        iss: "evo-auth-service",
        sub: conn.evo_user_email ?? "",
        email: conn.evo_user_email ?? "",
        iat: now,
        exp: now + 60 * 5,
      },
      conn.evo_jwt_secret,
    );
    // [FINALIZAR c/ piloto] rota de hand-off do token no frontend do EVO.
    return `${base}/sso?token=${encodeURIComponent(token)}`;
  }

  if (conn.sso_mode === "service_token") {
    if (!conn.evo_service_token) throw new Error("evo_service_token ausente");
    return `${base}/sso?token=${encodeURIComponent(conn.evo_service_token)}`;
  }

  if (conn.sso_mode === "oauth_password") {
    // [FINALIZAR c/ piloto] chamar o endpoint de token do Doorkeeper com
    // grant_type=password (evo_user_email + evo_password), pegar o access_token
    // e devolver a URL com ele. Estrutura pronta; endpoint/params a confirmar.
    const authUrl = (conn.evo_auth_url ?? base).replace(/\/+$/, "");
    const resp = await fetch(`${authUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        username: conn.evo_user_email,
        password: conn.evo_password,
      }),
    });
    if (!resp.ok) throw new Error(`EVO auth falhou (${resp.status})`);
    const data = await resp.json();
    const token = data?.access_token;
    if (!token) throw new Error("EVO não retornou access_token");
    return `${base}/sso?token=${encodeURIComponent(token)}`;
  }

  throw new Error(`sso_mode desconhecido: ${conn.sso_mode}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
      return json({ error: "Configuração do Supabase ausente" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    // Cliente "como usuário" (respeita RLS) só pra descobrir quem é o chamador.
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const requestedClientId: string | undefined = body?.clientId;

    // Cliente admin (service role) — ignora RLS pra ler a conexão segura.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // É admin?
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    // Resolve o client_id autorizado.
    let clientId: string | null = null;
    if (isAdmin && requestedClientId) {
      clientId = requestedClientId;
    } else {
      const { data: link } = await admin
        .from("client_users")
        .select("client_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      clientId = link?.client_id ?? null;
      // Um client-user nunca abre o CRM de outro cliente.
      if (requestedClientId && requestedClientId !== clientId && !isAdmin) {
        return json({ error: "Sem acesso a este cliente" }, 403);
      }
    }

    if (!clientId) return json({ configured: false });

    const { data: conn } = await admin
      .from("client_crm_connections")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();

    if (!conn) return json({ configured: false });

    const url = await buildAuthenticatedUrl(conn as CrmConnection);
    return json({ configured: true, url });
  } catch (e) {
    console.error("crm-sso error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
