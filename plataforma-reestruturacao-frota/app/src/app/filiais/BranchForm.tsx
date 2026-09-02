"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BranchForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.from("branches").insert({
      name: form.get("name"),
      city: form.get("city") || null,
      state: form.get("state") || null,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Filial cadastrada.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-ekotruck-darkGreen/10 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium">Nome da filial</label>
        <input name="name" required className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Cidade</label>
        <input name="city" className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">UF</label>
        <input name="state" maxLength={2} className="w-16 rounded-md border px-3 py-2 text-sm uppercase" />
      </div>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "saving" ? "Salvando..." : "Cadastrar"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
