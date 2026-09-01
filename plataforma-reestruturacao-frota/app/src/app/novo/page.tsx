"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NovoCaso() {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    const form = new FormData(e.currentTarget);
    const plate = String(form.get("plate") ?? "").toUpperCase().trim();
    const model = String(form.get("model") ?? "");
    const clientName = String(form.get("clientName") ?? "");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setStatus("error");
      setMessage(
        "Supabase ainda não está configurado (NEXT_PUBLIC_SUPABASE_URL). Este formulário fica pronto para uso assim que o projeto for provisionado."
      );
      return;
    }

    const supabase = createClient();

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .upsert({ plate, model }, { onConflict: "plate" })
      .select()
      .single();
    if (vErr) return fail(vErr.message);

    const { data: client, error: cErr } = await supabase
      .from("clients")
      .insert({ name: clientName })
      .select()
      .single();
    if (cErr) return fail(cErr.message);

    const { error: rcErr } = await supabase.from("return_cases").insert({
      vehicle_id: vehicle.id,
      client_id: client.id,
      status: "cadastrado",
    });
    if (rcErr) return fail(rcErr.message);

    setStatus("done");
    setMessage("Caso cadastrado. O time comercial já pode agendar a devolução.");

    function fail(msg: string) {
      setStatus("error");
      setMessage(msg);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-xl font-semibold">Novo cadastro de devolução</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Time comercial: registre o veículo e o cliente que irá devolvê-lo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Placa</label>
          <input
            name="plate"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="ABC1D23"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Veículo (modelo)</label>
          <input
            name="model"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Ex.: VUC 3/4 - Volkswagen Delivery"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cliente</label>
          <input
            name="clientName"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Razão social / nome do cliente"
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Salvando..." : "Cadastrar caso"}
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
  );
}
