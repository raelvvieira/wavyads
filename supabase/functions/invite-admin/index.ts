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

    // Verify caller is admin
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
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem convidar administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email } = await req.json();
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create auth user
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // 2. Insert admin role (NOT client)
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    // 3. Generate recovery link
    const redirectTo = `${req.headers.get("origin") || "https://wavyads.lovable.app"}/reset-password`;
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      return new Response(
        JSON.stringify({ warning: "Admin criado mas não foi possível gerar o link de convite." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryLink = linkData.properties?.action_link;

    // 4. Send email via Resend
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
                VOCÊ RECEBEU ACESSO ADMINISTRATIVO NO WAVY DASHBOARD!
              </h1>
              <p style="margin:0 0 16px 0; font-size:15px; color:#3f3f46; line-height:1.6;">
                Olá, <strong>${name}</strong>!
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; color:#3f3f46; line-height:1.6;">
                Você recebeu acesso de <strong>administrador</strong> no Wavy Dashboard. Como admin, você terá acesso completo a toda a plataforma. Siga o passo a passo abaixo para acessar:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>1.</strong> Clique no botão abaixo para criar sua senha
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>2.</strong> Defina uma senha segura (mínimo 6 caracteres)
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>3.</strong> Após criar sua senha, faça login com seu email e a senha criada
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
                    <strong>4.</strong> Acesse a plataforma com permissões completas de administrador
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
                Se você não esperava este email, pode ignorá-lo com segurança.
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
        subject: "VOCÊ RECEBEU ACESSO ADMINISTRATIVO NO WAVY DASHBOARD!",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Resend error:", resendError);
      return new Response(
        JSON.stringify({ warning: "Admin criado mas houve erro ao enviar o email de convite." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Convite de admin enviado por email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-admin error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
