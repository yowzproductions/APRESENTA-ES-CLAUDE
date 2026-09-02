"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClientForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("clients").insert({
      name: form.get("name"),
      document: form.get("document") || null,
      contact_name: form.get("contactName") || null,
      contact_phone: form.get("contactPhone") || null,
      contact_email: form.get("contactEmail") || null,
      created_by: user?.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Cliente cadastrado.");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-ekotruck-darkGreen/10 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium">Nome / Razão social</label>
        <input name="name" required className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">CNPJ/CPF</label>
        <input name="document" className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Contato</label>
        <input name="contactName" className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Telefone</label>
        <input name="contactPhone" className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">E-mail</label>
        <input
          name="contactEmail"
          type="email"
          className="rounded-md border px-3 py-2 text-sm"
        />
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
