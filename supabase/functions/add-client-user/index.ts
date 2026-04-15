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
        JSON.stringify({ error: "Apenas admins podem adicionar acessos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientId, name, email } = await req.json();
    if (!clientId || !name || !email) {
      return new Response(
        JSON.stringify({ error: "clientId, nome e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if client exists
    const { data: clientData, error: clientErr } = await adminClient
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (clientErr || !clientData) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;
    let recoveryLink: string | undefined;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already linked to this client
      const { data: existingLink } = await adminClient
        .from("client_users")
        .select("id")
        .eq("client_id", clientId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: "Este usuário já tem acesso a este dashboard" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user
      isNewUser = true;
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

      userId = newUser.user.id;

      // Generate recovery link for new user - build direct link to bypass redirect allowlist
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "https://dashboard.wavydigital.com.br/reset-password" },
      });
      const tokenHash = linkData?.properties?.hashed_token;
      recoveryLink = tokenHash
        ? `https://dashboard.wavydigital.com.br/reset-password?token_hash=${tokenHash}&type=recovery`
        : linkData?.properties?.action_link;
    }

    // Ensure client role exists
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "client")
      .maybeSingle();

    if (!existingRole) {
      await adminClient.from("user_roles").insert({ user_id: userId, role: "client" });
    }

    // Insert into client_users
    const { error: linkError } = await adminClient
      .from("client_users")
      .insert({ client_id: clientId, user_id: userId });

    if (linkError) {
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailHtml = isNewUser
      ? `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;padding:40px 32px;">
        <tr><td>
          <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:700;color:#18181b;text-align:center;">ACESSO AO WAVY DASHBOARD</h1>
          <p style="margin:0 0 16px 0;font-size:15px;color:#3f3f46;line-height:1.6;">Olá, <strong>${name}</strong>!</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#3f3f46;line-height:1.6;">Você recebeu acesso ao dashboard de <strong>${clientData.name}</strong> no Wavy Dashboard.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
            <tr><td style="padding:8px 0;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>1.</strong> Clique no botão abaixo para criar sua senha</td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>2.</strong> Defina uma senha segura (mínimo 6 caracteres)</td></tr>
            <tr><td style="padding:8px 0;font-size:14px;color:#3f3f46;line-height:1.6;"><strong>3.</strong> Faça login com seu email e a senha criada</td></tr>
            <tr><td style="padding:16px 0 8px 0;font-size:14px;color:#3f3f46;line-height:1.6;">📌 Acesse: <a href="https://dashboard.wavydigital.com.br/" style="color:#18181b;font-weight:600;">dashboard.wavydigital.com.br</a></td></tr>
          </table>
          ${recoveryLink ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 28px 0;"><a href="${recoveryLink}" target="_blank" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">CRIAR MINHA SENHA</a></td></tr></table>` : ''}
          <p style="margin:0 0 8px 0;font-size:13px;color:#a1a1aa;line-height:1.5;">Seu email de acesso: <strong>${email}</strong></p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">Se você não esperava este email, pode ignorá-lo com segurança.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
      : `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;padding:40px 32px;">
        <tr><td>
          <h1 style="margin:0 0 24px 0;font-size:22px;font-weight:700;color:#18181b;text-align:center;">NOVO ACESSO NO WAVY DASHBOARD</h1>
          <p style="margin:0 0 16px 0;font-size:15px;color:#3f3f46;line-height:1.6;">Olá, <strong>${name}</strong>!</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#3f3f46;line-height:1.6;">Você agora também tem acesso ao dashboard de <strong>${clientData.name}</strong> no Wavy Dashboard. Faça login com suas credenciais atuais.</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 28px 0;"><a href="https://dashboard.wavydigital.com.br/" target="_blank" style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">ACESSAR DASHBOARD</a></td></tr></table>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">Se você não esperava este email, pode ignorá-lo com segurança.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Wavy Dashboard <contato@wavydigital.com.br>",
        to: [email],
        subject: isNewUser ? "ACESSO AO WAVY DASHBOARD" : "NOVO ACESSO NO WAVY DASHBOARD",
        html: emailHtml,
      }),
    });

    return new Response(
      JSON.stringify({ success: true, message: isNewUser ? "Convite enviado por email" : "Acesso concedido" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("add-client-user error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
