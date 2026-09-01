import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o código do link de convite/recuperação de senha por uma sessão
// autenticada, depois manda para /definir-senha.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/definir-senha";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
