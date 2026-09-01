import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Convite de novo usuário: só um admin pode chamar esta rota. Usa a service
// role key (nunca exposta ao browser) só aqui, no servidor.
export async function POST(request: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Só administradores podem convidar." }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Peça para configurar essa variável de ambiente.",
      },
      { status: 500 }
    );
  }

  const { email, role, fullName } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey);

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${new URL(request.url).origin}/auth/callback?next=/definir-senha`,
    data: { full_name: fullName || email },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (role && invited.user) {
    await admin
      .from("profiles")
      .update({ role, full_name: fullName || email, invited_by: user.id })
      .eq("id", invited.user.id);
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "convite_usuario",
    description: `Convidou ${email}${role ? ` como ${role}` : ""}.`,
  });

  return NextResponse.json({ ok: true });
}
