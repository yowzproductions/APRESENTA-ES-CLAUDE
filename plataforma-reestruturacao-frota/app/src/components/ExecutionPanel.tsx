"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara de dinheiro: cada dígito digitado entra na casa dos centavos,
// como em caixas eletrônicos (ex.: digitar "1234" vira R$ 12,34).
function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10) / 100;
}

type IncidentKind = "adicionado" | "removido";

interface Incident {
  id: string;
  kind: IncidentKind;
  description: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  cost: number;
}

export function ExecutionPanel({
  caseId,
  onCompleted,
  disabled,
}: {
  caseId: string;
  onCompleted: () => Promise<void> | void;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [kind, setKind] = useState<IncidentKind>("adicionado");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("execution_incidents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    setIncidents((data as Incident[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function addIncident() {
    if (!description.trim()) {
      setError("Descreva o imprevisto.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cost = Math.round(quantity * unitPrice * 100) / 100;
    const { data: inserted, error: insErr } = await supabase
      .from("execution_incidents")
      .insert({
        case_id: caseId,
        kind,
        description: description.trim(),
        part_number: partNumber.trim() || null,
        quantity,
        unit_price: unitPrice,
        cost,
        created_by: user?.id,
      })
      .select("id")
      .single();
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      stage: "em_execucao",
      action: kind === "adicionado" ? "imprevisto_adicionado" : "imprevisto_removido",
      description: `${kind === "adicionado" ? "Adicionou" : "Removeu"} o imprevisto "${description.trim()}" (${currency(
        cost
      )}).`,
    });

    setDescription("");
    setPartNumber("");
    setQuantity(1);
    setUnitPrice(0);
    setSaving(false);
    await load();
    void inserted;
  }

  async function removeIncident(incident: Incident) {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: delErr } = await supabase.from("execution_incidents").delete().eq("id", incident.id);
    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      stage: "em_execucao",
      action: "imprevisto_excluido",
      description: `Excluiu o imprevisto "${incident.description}" (${currency(incident.cost)}).`,
    });

    setSaving(false);
    await load();
  }

  const added = incidents.filter((i) => i.kind === "adicionado");
  const removed = incidents.filter((i) => i.kind === "removido");
  const addedTotal = added.reduce((s, i) => s + i.cost, 0);
  const removedTotal = removed.reduce((s, i) => s + i.cost, 0);
  const net = addedTotal - removedTotal;

  if (loading) {
    return <p className="text-sm text-ekotruck-gray">Carregando imprevistos...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ekotruck-gray">
        Manutenção sempre tem imprevistos: registre aqui o que precisou ser colocado ou tirado durante a execução,
        a qualquer momento — o impacto entra na conta final do veículo.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {incidents.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
          <table className="w-full text-xs">
            <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
              <tr>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Partnumber</th>
                <th className="px-2 py-1.5">Descrição</th>
                <th className="px-2 py-1.5">Qtde.</th>
                <th className="px-2 py-1.5">Preço Unit.</th>
                <th className="px-2 py-1.5">Custo</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((it) => (
                <tr key={it.id} className="border-t border-ekotruck-darkGreen/10">
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        it.kind === "adicionado" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {it.kind === "adicionado" ? "Adicionado" : "Removido"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">{it.part_number || "-"}</td>
                  <td className="px-2 py-1.5">{it.description}</td>
                  <td className="px-2 py-1.5">{it.quantity}</td>
                  <td className="px-2 py-1.5">{currency(it.unit_price)}</td>
                  <td className="px-2 py-1.5">{currency(it.cost)}</td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={saving || disabled}
                      onClick={() => removeIncident(it)}
                      className="text-red-600 hover:underline"
                    >
                      remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap justify-end gap-4 border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
            <span>Adicionado: {currency(addedTotal)}</span>
            <span>Removido: {currency(removedTotal)}</span>
            <span className={net > 0 ? "text-red-600" : net < 0 ? "text-emerald-700" : ""}>
              Impacto líquido: {currency(net)}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Tipo</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as IncidentKind)}
            disabled={saving || disabled}
            className="rounded border px-2 py-1.5 text-sm"
          >
            <option value="adicionado">Adicionado (custo extra)</option>
            <option value="removido">Removido (custo a menos)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Partnumber</label>
          <input
            type="text"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            disabled={saving || disabled}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving || disabled}
            className="w-full min-w-[160px] rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Qtde.</label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            disabled={saving || disabled}
            className="w-20 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Preço Unit.</label>
          <input
            type="text"
            inputMode="numeric"
            value={currency(unitPrice)}
            onChange={(e) => setUnitPrice(parseCurrencyInput(e.target.value))}
            disabled={saving || disabled}
            className="w-28 rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={saving || disabled}
          onClick={addIncident}
          className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
        >
          + Registrar imprevisto
        </button>
      </div>

      <button
        type="button"
        disabled={saving || disabled}
        onClick={() => onCompleted()}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Concluir execução e finalizar
      </button>
    </div>
  );
}
