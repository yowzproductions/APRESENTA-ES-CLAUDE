"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "comercial", label: "Comercial" },
  { value: "vistoriador", label: "Vistoriador" },
  { value: "mecanica", label: "Mecânica" },
  { value: "moderador", label: "Moderador" },
  { value: "execucao", label: "Execução" },
  { value: "gestor", label: "Gestor" },
  { value: "admin", label: "Admin" },
];

export function InviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        fullName: form.get("fullName"),
        role: form.get("role"),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Erro ao convidar.");
      return;
    }

    setStatus("done");
    setMessage("Convite enviado.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium">Nome</label>
        <input
          name="fullName"
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Nome completo"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">E-mail</label>
        <input
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="pessoa@ekotruck.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Papel</label>
        <select name="role" className="rounded-md border px-3 py-2 text-sm">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Enviando..." : "Convidar"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
