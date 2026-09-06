import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o código do link de recuperação de senha por uma sessão
// autenticada, depois manda para /definir-senha. Se o Supabase já sinalizar
// erro no próprio link (ex.: expirado) ou a troca falhar — o mais comum é
// abrir o link num navegador/dispositivo diferente do que pediu a
// recuperação —, manda para o login com um aviso em vez de deixar a pessoa
// numa tela quebrada.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/definir-senha";
  const linkError = searchParams.get("error") || searchParams.get("error_code");

  if (linkError) {
    return NextResponse.redirect(`${origin}/login?error=recovery_link_invalid`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=recovery_link_invalid`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
