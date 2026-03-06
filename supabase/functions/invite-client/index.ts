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
    const {
      data: { user: caller },
    } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas admins podem convidar clientes" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { name, email } = await req.json();
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Create auth user with a random password (email pre-confirmed)
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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = newUser.user.id;

    // 2. Insert client role
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "client",
    });

    // 3. Create client record linked to auth user
    const { data: clientData, error: clientError } = await adminClient
      .from("clients")
      .insert({
        name,
        email,
        user_id: userId,
      })
      .select()
      .single();

    if (clientError) {
      return new Response(
        JSON.stringify({ error: clientError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Generate recovery link (acts as "Create your password")
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      // Client was created, just couldn't generate link
      return new Response(
        JSON.stringify({
          client: clientData,
          warning: "Cliente criado mas não foi possível gerar o link de convite. Use 'Esqueci minha senha' no login.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send recovery email via resetPasswordForEmail (this sends the actual email)
    const { error: resetError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://wavyads.lovable.app"}/reset-password`,
      },
    });

    // Also use resetPasswordForEmail to trigger the email
    // generateLink alone doesn't send an email, so we use the client method
    const resetClient = createClient(supabaseUrl, serviceRoleKey);
    await resetClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get("origin") || "https://wavyads.lovable.app"}/reset-password`,
    });

    return new Response(
      JSON.stringify({ client: clientData, message: "Convite enviado por email" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-client error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
