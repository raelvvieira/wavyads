import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem reenviar convites" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate input
    const { email, name } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Confirm target user exists and is admin
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetProfile.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!targetRole) {
      return new Response(
        JSON.stringify({ error: "O destinatário não é um administrador" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = name || targetProfile.name || "Administrador";

    // 4. Generate fresh recovery link (invalidates previous ones)
    const redirectTo = "https://dashboard.wavydigital.com.br/reset-password";
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      return new Response(
        JSON.stringify({ error: "Não foi possível gerar o link de acesso." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash = linkData.properties?.hashed_token;
    const recoveryLink = tokenHash
      ? `https://dashboard.wavydigital.com.br/reset-password?token_hash=${tokenHash}&type=invite&email=${encodeURIComponent(email)}`
      : linkData.properties?.action_link;

    // 5. Send email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:12px; padding:40px 32px;">
          <tr>
            <td>
              <h1 style="margin:0 0 24px 0; font-size:22px; font-weight:700; color:#18181b; text-align:center;">
                NOVO LINK DE ACESSO AO WAVY DASHBOARD
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#3f3f46; line-height:1.6;">
                Olá, <strong>${displayName}</strong>!
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; color:#3f3f46; line-height:1.6;">
                Geramos um novo link de acesso para a sua conta de <strong>administrador</strong> no Wavy Dashboard. Use o botão abaixo para criar (ou redefinir) a sua senha. O link anterior, caso existisse, foi invalidado.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>1.</strong> Clique no botão abaixo para criar sua nova senha
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>2.</strong> Defina uma senha segura (mínimo 6 caracteres)
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>3.</strong> Faça login com seu email e a nova senha
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0 8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    📌 Sempre que quiser acessar, entre em: <a href="https://dashboard.wavydigital.com.br/" style="color:#18181b; font-weight:600;">dashboard.wavydigital.com.br</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 28px 0;">
                    <a href="${recoveryLink}" target="_blank" style="display:inline-block; background-color:#18181b; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
                      CRIAR MINHA SENHA
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0; font-size:13px; color:#a1a1aa; line-height:1.5;">
                Seu email de acesso: <strong>${email}</strong>
              </p>
              <hr style="border:none; border-top:1px solid #e4e4e7; margin:20px 0;">
              <p style="margin:0; font-size:12px; color:#a1a1aa; line-height:1.5;">
                Se você não solicitou este email, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Wavy Dashboard <contato@wavydigital.com.br>",
        to: [email],
        subject: "Novo link de acesso — Wavy Dashboard",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Resend error:", resendError);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar o email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Email reenviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("resend-admin-invite error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
