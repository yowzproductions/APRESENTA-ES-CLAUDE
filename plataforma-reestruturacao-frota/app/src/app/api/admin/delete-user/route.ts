import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

// Exclusão de acesso: só um admin pode chamar esta rota, e não pode excluir
// a própria conta (evita ficar sem admin nenhum por engano).
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
    return NextResponse.json({ error: "Só administradores podem excluir acesso." }, { status: 403 });
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

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "userId é obrigatório." }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "Você não pode excluir o próprio acesso." }, { status: 400 });
  }

  const admin = createAdminClient(SUPABASE_URL, serviceRoleKey);

  const { data: targetProfile } = await admin.from("profiles").select("full_name").eq("id", userId).single();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    actor_email: user.email,
    action: "excluiu_acesso",
    description: `Excluiu o acesso de ${targetProfile?.full_name || userId}.`,
  });

  return NextResponse.json({ ok: true });
}
