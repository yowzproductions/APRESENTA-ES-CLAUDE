"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_ORDER } from "@/types/domain";

const ROLES = [
  { value: "comercial", label: "Comercial" },
  { value: "vistoriador", label: "Vistoriador" },
  { value: "mecanica", label: "Mecânica" },
  { value: "moderador", label: "Moderador" },
  { value: "execucao", label: "Execução" },
  { value: "gestor", label: "Gestor" },
  { value: "admin", label: "Admin" },
];

type Access = "oculto" | "visualizar" | "editar";

const ACCESS_OPTIONS: { value: Access; label: string }[] = [
  { value: "oculto", label: "Oculto" },
  { value: "visualizar", label: "Visualizar" },
  { value: "editar", label: "Editar" },
];

export function InviteForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Access>>(
    Object.fromEntries(STAGE_ORDER.map((s) => [s.status, "editar" as Access]))
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setGeneratedPassword(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        fullName: form.get("fullName"),
        role: form.get("role"),
        permissions,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Erro ao criar acesso.");
      return;
    }

    setStatus("done");
    setMessage("Acesso criado.");
    setGeneratedPassword(data.password);
    (e.target as HTMLFormElement).reset();
    setPermissions(Object.fromEntries(STAGE_ORDER.map((s) => [s.status, "editar" as Access])));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
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
            placeholder="pessoa@empresa.com"
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
      </div>

      <div>
        <p className="mb-2 text-xs font-medium">Acesso por etapa do workflow</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
              <tr>
                <th className="px-3 py-1.5">Etapa</th>
                {ACCESS_OPTIONS.map((opt) => (
                  <th key={opt.value} className="px-3 py-1.5 text-center">
                    {opt.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAGE_ORDER.map((s) => (
                <tr key={s.status} className="border-t">
                  <td className="px-3 py-1.5">{s.label}</td>
                  {ACCESS_OPTIONS.map((opt) => (
                    <td key={opt.value} className="px-3 py-1.5 text-center">
                      <input
                        type="radio"
                        name={`access-${s.status}`}
                        checked={permissions[s.status] === opt.value}
                        onChange={() => setPermissions((prev) => ({ ...prev, [s.status]: opt.value }))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "Criando..." : "Criar acesso"}
      </button>

      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}

      {generatedPassword && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
          <p className="font-medium text-emerald-800">
            Senha padrão gerada — anote e passe para a pessoa agora, ela só aparece uma vez:
          </p>
          <p className="mt-1 font-mono text-base text-emerald-900">{generatedPassword}</p>
          <p className="mt-1 text-xs text-ekotruck-gray">
            No primeiro login ela será obrigada a trocar a senha. Se esquecer depois, pode recuperar pelo próprio
            e-mail em &quot;Esqueci minha senha&quot;.
          </p>
        </div>
      )}
    </form>
  );
}
