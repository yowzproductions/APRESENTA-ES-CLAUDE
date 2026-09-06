"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteCaseButton({
  caseId,
  vehiclePlate,
  vehicleModel,
  clientName,
  branchName,
  status,
  baseTotal,
  finalTotal,
}: {
  caseId: string;
  vehiclePlate: string;
  vehicleModel: string;
  clientName: string;
  branchName: string | null;
  status: string;
  baseTotal: number | null;
  finalTotal: number | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: logErr } = await supabase.from("case_deletions").insert({
      case_id: caseId,
      vehicle_plate: vehiclePlate,
      vehicle_model: vehicleModel,
      client_name: clientName,
      branch_name: branchName,
      status_at_deletion: status,
      base_total: baseTotal,
      final_total: finalTotal,
      reason: reason.trim() || null,
      deleted_by: user?.id,
      deleted_by_email: user?.email,
    });
    if (logErr) {
      setError(logErr.message);
      setDeleting(false);
      return;
    }

    const { error: delErr } = await supabase.from("return_cases").delete().eq("id", caseId);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        🗑 Excluir processo
      </button>
    );
  }

  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
      <p className="mb-2 font-medium text-red-800">
        Tem certeza que deseja excluir este processo? Essa ação é permanente e apaga todos os dados do caso
        (vistoria, orçamentos, otimização, histórico). Um resumo fica registrado no histórico geral.
      </p>
      {error && <p className="mb-2 text-red-700">{error}</p>}
      <input
        type="text"
        placeholder="Motivo da exclusão (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={deleting}
        className="mb-2 w-full rounded border px-2 py-1.5"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "Excluindo..." : "Confirmar exclusão"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => setConfirming(false)}
          className="rounded-md border px-3 py-1.5 text-ekotruck-gray hover:bg-white disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
