"use client";

import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ParsedBudgetItem } from "@/lib/parseBudgetPdf";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function blankItem(): ParsedBudgetItem {
  return {
    taskNumber: null,
    taskName: "",
    productLine: "",
    partNumber: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
  };
}

function taskKey(taskNumber: number | null, taskName: string) {
  return `${taskNumber ?? "none"}|${taskName || ""}`;
}

const NEW_TASK = "__new__";

export function MechanicalInspectionPanel({
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
  const [items, setItems] = useState<ParsedBudgetItem[] | null>(null);
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
      const res = await fetch("/api/mechanical-inspection/parse", {
        method: "POST",
        body: form,
      });
      let data: { items?: ParsedBudgetItem[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // resposta não era JSON (ex.: erro 500 genérico do servidor)
      }
      if (!res.ok) {
        setError(data.error || `Erro ao ler o PDF (HTTP ${res.status}).`);
        return;
      }
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar o PDF.");
    } finally {
      setParsing(false);
    }
  }

  function updateItem(index: number, patch: Partial<ParsedBudgetItem>) {
    setItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function addManualItem() {
    setItems((prev) => [...(prev ?? []), blankItem()]);
  }

  const total = items?.reduce((s, it) => s + it.totalPrice, 0) ?? 0;

  const groups: {
    key: string;
    reactKey: string;
    taskNumber: number | null;
    taskName: string;
    entries: { item: ParsedBudgetItem; index: number }[];
  }[] = [];
  if (items) {
    const map = new Map<string, (typeof groups)[number]>();
    items.forEach((item, index) => {
      const key = taskKey(item.taskNumber, item.taskName);
      let g = map.get(key);
      if (!g) {
        // reactKey usa o índice do primeiro item do grupo (estável) em vez do
        // conteúdo da tarefa (key) — senão, cada letra digitada no nome da
        // tarefa muda a key, remonta o Fragment inteiro e o campo perde foco.
        g = { key, reactKey: `g-${index}`, taskNumber: item.taskNumber, taskName: item.taskName, entries: [] };
        map.set(key, g);
        groups.push(g);
      }
      g.entries.push({ item, index });
    });
    groups.sort((a, b) => {
      if (a.taskNumber == null && b.taskNumber == null) return 0;
      if (a.taskNumber == null) return 1;
      if (b.taskNumber == null) return -1;
      return a.taskNumber - b.taskNumber;
    });
  }

  const taskOptions = groups
    .filter((g) => g.taskNumber != null || g.taskName)
    .map((g) => ({ key: g.key, taskNumber: g.taskNumber, taskName: g.taskName }));

  async function confirmAndComplete() {
    if (!file || !items || items.length === 0) return;
    setSaving(true);
    setError(null);
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

    let { data: inspection } = await supabase
      .from("mechanical_inspections")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!inspection) {
      const { data: created, error: insErr } = await supabase
        .from("mechanical_inspections")
        .insert({ case_id: caseId, mechanic_id: user?.id, performed_at: new Date().toISOString() })
        .select("id")
        .single();
      if (insErr) {
        setError(insErr.message);
        setSaving(false);
        return;
      }
      inspection = created;
    }

    const { error: itemsErr } = await supabase.from("mechanical_items").insert(
      items.map((it) => ({
        inspection_id: inspection!.id,
        description: it.description,
        estimated_cost: it.totalPrice,
        task_number: it.taskNumber,
        task_name: it.taskName,
        product_line: it.productLine,
        part_number: it.partNumber,
        quantity: it.quantity,
        unit_price: it.unitPrice,
      }))
    );
    if (itemsErr) {
      setError(itemsErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      action: "orcamento_mecanico_anexado",
      description: `Anexou orçamento da inspeção mecânica com ${items.length} item(ns), total ${currency(total)}.`,
    });

    setSaving(false);
    await onCompleted();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium">
          PDF do orçamento (espelho de negociação)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setItems(null);
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

      {(!items || items.length === 0) && (
        <div>
          <button
            type="button"
            disabled={saving || disabled}
            onClick={addManualItem}
            className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
          >
            + Adicionar item manualmente
          </button>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
          <table className="w-full text-xs">
            <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
              <tr>
                <th className="px-2 py-1.5">Tarefa</th>
                <th className="px-2 py-1.5">Linha</th>
                <th className="px-2 py-1.5">Partnumber</th>
                <th className="px-2 py-1.5">Descrição</th>
                <th className="px-2 py-1.5">Qtde.</th>
                <th className="px-2 py-1.5">Preço Unit.</th>
                <th className="px-2 py-1.5">Preço Total</th>
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const subtotal = g.entries.reduce((s, e) => s + e.item.totalPrice, 0);
                return (
                  <Fragment key={g.reactKey}>
                    <tr className="border-t border-ekotruck-darkGreen/10 bg-ekotruck-mint/20">
                      <td colSpan={8} className="px-2 py-1.5 font-semibold text-ekotruck-darkGreen">
                        {g.taskNumber != null ? `Tarefa ${g.taskNumber}` : "Sem tarefa"}
                        {g.taskName ? ` — ${g.taskName}` : ""}
                      </td>
                    </tr>
                    {g.entries.map(({ item: it, index: idx }) => (
                      <tr key={idx} className="border-t border-ekotruck-darkGreen/10">
                        <td className="px-2 py-1.5 align-top">
                          <div className="flex flex-col gap-1">
                            <select
                              value={
                                taskOptions.some((o) => o.key === taskKey(it.taskNumber, it.taskName))
                                  ? taskKey(it.taskNumber, it.taskName)
                                  : NEW_TASK
                              }
                              onChange={(e) => {
                                if (e.target.value === NEW_TASK) {
                                  updateItem(idx, { taskNumber: null, taskName: "" });
                                  return;
                                }
                                const opt = taskOptions.find((o) => o.key === e.target.value);
                                if (opt) updateItem(idx, { taskNumber: opt.taskNumber, taskName: opt.taskName });
                              }}
                              className="w-32 rounded border px-1 py-0.5"
                            >
                              {taskOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.taskNumber != null ? `Tarefa ${opt.taskNumber}` : "Sem tarefa"}
                                  {opt.taskName ? ` — ${opt.taskName}` : ""}
                                </option>
                              ))}
                              <option value={NEW_TASK}>+ Nova tarefa...</option>
                            </select>
                            <input
                              type="number"
                              placeholder="nº"
                              value={it.taskNumber ?? ""}
                              onChange={(e) =>
                                updateItem(idx, {
                                  taskNumber: e.target.value === "" ? null : parseInt(e.target.value, 10),
                                })
                              }
                              className="w-14 rounded border px-1 py-0.5"
                            />
                            <input
                              type="text"
                              placeholder="nome da tarefa"
                              value={it.taskName}
                              onChange={(e) => updateItem(idx, { taskName: e.target.value })}
                              className="w-28 rounded border px-1 py-0.5"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="text"
                            value={it.productLine}
                            onChange={(e) => updateItem(idx, { productLine: e.target.value })}
                            className="w-14 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="text"
                            value={it.partNumber}
                            onChange={(e) => updateItem(idx, { partNumber: e.target.value })}
                            className="w-24 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="text"
                            value={it.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            className="w-40 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-16 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-24 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={it.totalPrice}
                            onChange={(e) => updateItem(idx, { totalPrice: parseFloat(e.target.value) || 0 })}
                            className="w-24 rounded border px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:underline"
                          >
                            remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5">
                      <td colSpan={6}></td>
                      <td colSpan={2} className="px-2 py-1.5 text-right font-medium">
                        Subtotal: {currency(subtotal)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="border-t border-ekotruck-darkGreen/10">
                <td colSpan={8} className="px-2 py-1.5">
                  <button
                    type="button"
                    disabled={saving || disabled}
                    onClick={addManualItem}
                    className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
                  >
                    + Adicionar item manualmente
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
            Total: {currency(total)}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!items || items.length === 0 || saving || disabled}
        onClick={confirmAndComplete}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Confirmar orçamento e concluir etapa"}
      </button>
    </div>
  );
}
