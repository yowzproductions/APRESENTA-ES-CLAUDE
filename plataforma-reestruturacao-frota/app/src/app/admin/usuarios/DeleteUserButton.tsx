"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ userId, fullName }: { userId: string; fullName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao excluir acesso.");
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-red-600 hover:underline"
      >
        Excluir acesso
      </button>
    );
  }

  return (
    <div className="text-xs">
      <p className="mb-1 text-red-700">Excluir acesso de {fullName}?</p>
      {error && <p className="mb-1 text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "Excluindo..." : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => setConfirming(false)}
          className="text-ekotruck-gray hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
