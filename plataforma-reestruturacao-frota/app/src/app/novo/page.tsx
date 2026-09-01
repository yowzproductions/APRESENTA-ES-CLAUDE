"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FilterOption } from "@/types/domain";

export default function NovoCaso() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const [branches, setBranches] = useState<FilterOption[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("branches")
      .select("id, name")
      .order("name")
      .then(({ data }) => setBranches(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    const form = new FormData(e.currentTarget);
    const plate = String(form.get("plate") ?? "").toUpperCase().trim();
    const chassis = String(form.get("chassis") ?? "").trim() || null;
    const model = String(form.get("model") ?? "");
    const clientName = String(form.get("clientName") ?? "");
    const branchId = String(form.get("branchId") ?? "") || null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .upsert({ plate, chassis, model }, { onConflict: "plate" })
      .select()
      .single();
    if (vErr) return fail(vErr.message);

    const { data: client, error: cErr } = await supabase
      .from("clients")
      .insert({ name: clientName, created_by: user?.id })
      .select()
      .single();
    if (cErr) return fail(cErr.message);

    const { data: newCase, error: rcErr } = await supabase
      .from("return_cases")
      .insert({
        vehicle_id: vehicle.id,
        client_id: client.id,
        branch_id: branchId,
        status: "cadastrado",
        created_by: user?.id,
      })
      .select()
      .single();
    if (rcErr) return fail(rcErr.message);

    await supabase.from("activity_log").insert({
      case_id: newCase.id,
      actor_id: user?.id,
      actor_email: user?.email,
      action: "cadastro_caso",
      description: `Cadastrou o veículo ${plate} (cliente ${clientName}).`,
    });

    router.push(`/casos/${newCase.id}`);
    router.refresh();

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
        <div className="grid grid-cols-2 gap-4">
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
            <label className="mb-1 block text-sm font-medium">Chassi</label>
            <input
              name="chassis"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="opcional"
            />
          </div>
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
        <div>
          <label className="mb-1 block text-sm font-medium">Filial</label>
          <select name="branchId" className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Selecione (opcional)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {status === "saving" ? "Salvando..." : "Cadastrar caso"}
        </button>

        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}
