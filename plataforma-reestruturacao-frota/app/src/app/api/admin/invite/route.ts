import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return `${pass}!1`;
}

// Criação de acesso: só um admin pode chamar esta rota. Usa a service role
// key (nunca exposta ao browser) só aqui, no servidor. Em vez de convite por
// link, a pessoa recebe um e-mail e uma senha padrão gerada aqui — ela troca
// a senha no primeiro login (must_change_password) e, se esquecer depois,
// recupera pelo próprio e-mail (fluxo padrão do Supabase, sem restrição de
// domínio).
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
    return NextResponse.json({ error: "Só administradores podem criar acesso." }, { status: 403 });
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

  const { email, role, fullName, permissions } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey);
  const password = generatePassword();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });

  if (error || !created.user) {
    return NextResponse.json({ error: error?.message || "Não foi possível criar o acesso." }, { status: 400 });
  }

  await admin
    .from("profiles")
    .update({
      role: role || null,
      full_name: fullName || email,
      invited_by: user.id,
      status: "ativo",
      must_change_password: true,
    })
    .eq("id", created.user.id);

  if (permissions && typeof permissions === "object") {
    const rows = Object.entries(permissions as Record<string, string>).map(([stage, access]) => ({
      profile_id: created.user!.id,
      stage,
      access,
    }));
    if (rows.length > 0) {
      await admin.from("stage_permissions").insert(rows);
    }
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "criou_acesso",
    description: `Criou acesso para ${email}${role ? ` como ${role}` : ""}.`,
  });

  return NextResponse.json({ ok: true, password });
}
