import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Reestruturação de Frota",
  description: "Plataforma multi-acesso do fluxo de devolução e reestruturação de frota",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <html lang="pt-BR">
      <body className="min-h-screen text-neutral-900">
        <header className="border-b bg-white px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="font-semibold tracking-tight">
              <span className="text-ekotruck-orange">●</span> Reestruturação de
              Frota
            </a>
            <nav className="flex items-center gap-4 text-sm text-neutral-600">
              {user && (
                <>
                  <a href="/" className="hover:text-neutral-900">
                    Workflow
                  </a>
                  <a href="/novo" className="hover:text-neutral-900">
                    Novo caso
                  </a>
                  <a href="/impacto" className="hover:text-neutral-900">
                    Impacto financeiro
                  </a>
                  {isAdmin && (
                    <a href="/admin/usuarios" className="hover:text-neutral-900">
                      Usuários
                    </a>
                  )}
                  <span className="mx-1 h-4 w-px bg-neutral-200" />
                  <span className="text-neutral-400">{user.email}</span>
                  <SignOutButton />
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
