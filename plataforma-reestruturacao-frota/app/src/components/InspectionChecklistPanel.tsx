"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParsedInspectionPoint } from "@/lib/parseInspectionPdf";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara de dinheiro: cada dígito digitado entra na casa dos centavos,
// como em caixas eletrônicos (ex.: digitar "1234" vira R$ 12,34).
function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10) / 100;
}

const DAMAGE_TYPES = ["Amassado", "Falta", "Pique", "Quebrado", "Riscado", "Trincado"];
const OUTRO = "Outro";

interface PartItem {
  description: string;
  productLine: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ChecklistPoint {
  pointNumber: number;
  name: string;
  status: "ok" | "avariado";
  damageType: string;
  damageTypeOther: string;
  justification: string;
  parts: PartItem[];
}

function blankPart(): PartItem {
  return { description: "", productLine: "", partNumber: "", quantity: 1, unitPrice: 0, totalPrice: 0 };
}

export function InspectionChecklistPanel({
  caseId,
  stage,
  onCompleted,
  disabled,
}: {
  caseId: string;
  stage: string;
  onCompleted: () => Promise<void> | void;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [points, setPoints] = useState<ChecklistPoint[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/inspection/parse", { method: "POST", body: form });
      let data: { points?: ParsedInspectionPoint[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // resposta não era JSON (ex.: erro 500 genérico do servidor)
      }
      if (!res.ok) {
        setError(data.error || `Erro ao ler o PDF (HTTP ${res.status}).`);
        return;
      }
      setPoints(
        (data.points ?? []).map((p) => ({
          pointNumber: p.pointNumber,
          name: p.name,
          status: "ok",
          damageType: "",
          damageTypeOther: "",
          justification: "",
          parts: [],
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar o PDF.");
    } finally {
      setParsing(false);
    }
  }

  function updatePoint(index: number, patch: Partial<ChecklistPoint>) {
    setPoints((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function updatePart(pointIdx: number, partIdx: number, patch: Partial<PartItem>) {
    setPoints((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const parts = [...next[pointIdx].parts];
      const merged = { ...parts[partIdx], ...patch };
      if ("quantity" in patch || "unitPrice" in patch) {
        merged.totalPrice = Math.round(merged.quantity * merged.unitPrice * 100) / 100;
      }
      parts[partIdx] = merged;
      next[pointIdx] = { ...next[pointIdx], parts };
      return next;
    });
  }

  function addPart(pointIdx: number) {
    setPoints((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[pointIdx] = { ...next[pointIdx], parts: [...next[pointIdx].parts, blankPart()] };
      return next;
    });
  }

  function removePart(pointIdx: number, partIdx: number) {
    setPoints((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[pointIdx] = { ...next[pointIdx], parts: next[pointIdx].parts.filter((_, i) => i !== partIdx) };
      return next;
    });
  }

  const damagedCount = points?.filter((p) => p.status === "avariado").length ?? 0;

  async function confirmAndComplete() {
    if (!file || !points || points.length === 0) return;
    setError(null);

    for (const p of points) {
      if (p.status === "avariado" && !p.justification.trim()) {
        setError(`Informe a justificativa do ponto "${p.name}" antes de concluir.`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `${caseId}/${stage}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("case-attachments").upload(path, file);
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }
    await supabase.from("attachments").insert({
      related_table: "return_cases",
      related_id: caseId,
      stage,
      url: path,
      uploaded_by: user?.id,
    });

    let { data: checklist } = await supabase
      .from("inspection_checklists")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!checklist) {
      const { data: created, error: insErr } = await supabase
        .from("inspection_checklists")
        .insert({ case_id: caseId, inspector_id: user?.id, performed_at: new Date().toISOString() })
        .select("id")
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      checklist = created;
    }

    for (const p of points) {
      const damageType = p.status === "avariado" ? (p.damageType === OUTRO ? p.damageTypeOther : p.damageType) : null;
      const partsTotal = p.parts.reduce((s, it) => s + it.totalPrice, 0);

      const { data: item, error: itemErr } = await supabase
        .from("checklist_items")
        .insert({
          checklist_id: checklist!.id,
          description: p.name,
          point_number: p.pointNumber,
          status: p.status,
          damage_type: damageType || null,
          justification: p.status === "avariado" ? p.justification : null,
          estimated_cost: partsTotal,
        })
        .select("id")
        .single();
      if (itemErr) {
        setError(itemErr.message);
        setSaving(false);
        return;
      }

      if (p.parts.length > 0) {
        const { error: partsErr } = await supabase.from("checklist_item_parts").insert(
          p.parts.map((it) => ({
            checklist_item_id: item!.id,
            description: it.description,
            product_line: it.productLine,
            part_number: it.partNumber,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total_price: it.totalPrice,
          }))
        );
        if (partsErr) {
          setError(partsErr.message);
          setSaving(false);
          return;
        }
      }
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      action: "vistoria_concluida",
      description: `Concluiu a vistoria com ${damagedCount} ponto(s) avariado(s) de ${points.length}.`,
    });

    setSaving(false);
    await onCompleted();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">PDF da vistoria (relatório fotográfico)</label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPoints(null);
            }}
            className="block text-sm"
          />
          <button
            type="button"
            disabled={!file || parsing || disabled}
            onClick={analyze}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
          >
            {parsing ? "Analisando..." : "Analisar PDF"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {points && points.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-ekotruck-darkGreen">
            {points.length} pontos vistoriados — {damagedCount} avariado(s)
          </div>
          <div className="max-h-[32rem] overflow-y-auto rounded-md border border-ekotruck-darkGreen/10">
            {points.map((p, idx) => (
              <div key={p.pointNumber} className="border-t border-ekotruck-darkGreen/10 p-2 first:border-t-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    <span className="text-ekotruck-gray">{p.pointNumber}.</span> {p.name}
                  </span>
                  <div className="flex overflow-hidden rounded-md border text-xs">
                    <button
                      type="button"
                      disabled={saving || disabled}
                      onClick={() => updatePoint(idx, { status: "ok" })}
                      className={`px-3 py-1 ${
                        p.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-white text-ekotruck-gray"
                      }`}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      disabled={saving || disabled}
                      onClick={() => updatePoint(idx, { status: "avariado" })}
                      className={`px-3 py-1 ${
                        p.status === "avariado" ? "bg-red-100 text-red-700" : "bg-white text-ekotruck-gray"
                      }`}
                    >
                      Avariado
                    </button>
                  </div>
                </div>

                {p.status === "avariado" && (
                  <div className="mt-2 space-y-2 rounded-md bg-red-50/60 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={p.damageType}
                        onChange={(e) => updatePoint(idx, { damageType: e.target.value })}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="">Tipo de avaria...</option>
                        {DAMAGE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value={OUTRO}>Outro...</option>
                      </select>
                      {p.damageType === OUTRO && (
                        <input
                          type="text"
                          placeholder="descreva o tipo de avaria"
                          value={p.damageTypeOther}
                          onChange={(e) => updatePoint(idx, { damageTypeOther: e.target.value })}
                          className="rounded border px-2 py-1 text-sm"
                        />
                      )}
                    </div>
                    <textarea
                      placeholder="Justificativa breve da avaria"
                      value={p.justification}
                      onChange={(e) => updatePoint(idx, { justification: e.target.value })}
                      rows={2}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />

                    {p.parts.length > 0 && (
                      <div className="overflow-x-auto rounded border bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
                            <tr>
                              <th className="px-2 py-1">Linha</th>
                              <th className="px-2 py-1">Partnumber</th>
                              <th className="px-2 py-1">Descrição</th>
                              <th className="px-2 py-1">Qtde.</th>
                              <th className="px-2 py-1">Preço Unit.</th>
                              <th className="px-2 py-1">Preço Total</th>
                              <th className="px-2 py-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.parts.map((it, partIdx) => (
                              <tr key={partIdx} className="border-t">
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={it.productLine}
                                    onChange={(e) => updatePart(idx, partIdx, { productLine: e.target.value })}
                                    className="w-14 rounded border px-1 py-0.5"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={it.partNumber}
                                    onChange={(e) => updatePart(idx, partIdx, { partNumber: e.target.value })}
                                    className="w-24 rounded border px-1 py-0.5"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={it.description}
                                    onChange={(e) => updatePart(idx, partIdx, { description: e.target.value })}
                                    className="w-40 rounded border px-1 py-0.5"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={it.quantity}
                                    onChange={(e) =>
                                      updatePart(idx, partIdx, { quantity: parseFloat(e.target.value) || 0 })
                                    }
                                    className="w-16 rounded border px-1 py-0.5"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={currency(it.unitPrice)}
                                    onChange={(e) =>
                                      updatePart(idx, partIdx, { unitPrice: parseCurrencyInput(e.target.value) })
                                    }
                                    className="w-24 rounded border px-1 py-0.5"
                                  />
                                </td>
                                <td className="px-2 py-1">{currency(it.totalPrice)}</td>
                                <td className="px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => removePart(idx, partIdx)}
                                    className="text-red-600 hover:underline"
                                  >
                                    remover
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={saving || disabled}
                      onClick={() => addPart(idx)}
                      className="rounded-md border border-dashed px-2 py-1 text-xs hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
                    >
                      + Adicionar peça/serviço
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!points || points.length === 0 || saving || disabled}
        onClick={confirmAndComplete}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Confirmar vistoria e concluir etapa"}
      </button>
    </div>
  );
}
