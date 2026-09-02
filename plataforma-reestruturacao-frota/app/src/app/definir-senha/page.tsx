"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Tela usada tanto no primeiro login (após convite) quanto na recuperação
// de senha — em ambos os casos o usuário chega aqui já com uma sessão
// válida (trocada em /auth/callback) e só precisa escolher a senha.
export default function DefinirSenha() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("As senhas não coincidem.");
      return;
    }
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("done");
    setMessage("Senha definida! Redirecionando...");
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ekotruck-light px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold">Defina sua senha</h1>
        <p className="mb-6 text-sm text-ekotruck-gray">
          Escolha a senha que vai usar para acessar a plataforma.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nova senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirmar senha</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "Salvando..." : "Salvar senha"}
          </button>

          {message && (
            <p
              className={`text-sm ${
                status === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
