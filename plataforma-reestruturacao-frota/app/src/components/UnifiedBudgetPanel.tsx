"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface BudgetItem {
  id: string;
  description: string;
  cost: number;
  source: "checklist" | "mechanical" | "both";
  part_number: string | null;
  product_line: string | null;
  quantity: number | null;
  unit_price: number | null;
  source_label: string | null;
  included: boolean;
}

export function UnifiedBudgetPanel({
  caseId,
  onCompleted,
  disabled,
}: {
  caseId: string;
  onCompleted: () => Promise<void> | void;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [items, setItems] = useState<BudgetItem[] | null>(null);

  async function loadBudget() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: budget } = await supabase
      .from("unified_budgets")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!budget) {
      setBudgetId(null);
      setItems(null);
      setLoading(false);
      return;
    }

    setBudgetId(budget.id);
    const { data: budgetItems } = await supabase
      .from("unified_budget_items")
      .select("*")
      .eq("unified_budget_id", budget.id)
      .order("created_at", { ascending: true });
    setItems((budgetItems as BudgetItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadBudget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function generateBudget() {
    setGenerating(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inspections } = await supabase
      .from("mechanical_inspections")
      .select("id")
      .eq("case_id", caseId);
    const inspectionIds = (inspections ?? []).map((i) => i.id);
    const { data: mechItems } = inspectionIds.length
      ? await supabase.from("mechanical_items").select("*").in("inspection_id", inspectionIds)
      : { data: [] as Record<string, unknown>[] };

    const { data: checklists } = await supabase
      .from("inspection_checklists")
      .select("id")
      .eq("case_id", caseId);
    const checklistIds = (checklists ?? []).map((c) => c.id);

    let avariados: { id: string; description: string; point_number: number | null }[] = [];
    if (checklistIds.length) {
      const { data } = await supabase
        .from("checklist_items")
        .select("id, description, point_number")
        .in("checklist_id", checklistIds)
        .eq("status", "avariado");
      avariados = data ?? [];
    }
    const avariadoIds = avariados.map((a) => a.id);
    let checklistParts: Record<string, any>[] = [];
    if (avariadoIds.length) {
      const { data } = await supabase.from("checklist_item_parts").select("*").in("checklist_item_id", avariadoIds);
      checklistParts = data ?? [];
    }

    const { data: budget, error: budgetErr } = await supabase
      .from("unified_budgets")
      .insert({ case_id: caseId, unified_by: user?.id })
      .select("id")
      .single();
    if (budgetErr) {
      setError(budgetErr.message);
      setGenerating(false);
      return;
    }

    const rows: Record<string, unknown>[] = [];
    for (const it of mechItems ?? []) {
      const taskLabel = it.task_number != null ? `Tarefa ${it.task_number}` : it.task_name || null;
      rows.push({
        unified_budget_id: budget.id,
        description: it.description,
        cost: it.estimated_cost,
        source: "mechanical",
        source_mechanical_item_id: it.id,
        part_number: it.part_number,
        product_line: it.product_line,
        quantity: it.quantity,
        unit_price: it.unit_price,
        source_label: `Inspeção Mecânica${taskLabel ? ` — ${taskLabel}` : ""}`,
        included: true,
      });
    }

    const avariadoById = new Map(avariados.map((a) => [a.id, a]));
    for (const p of checklistParts) {
      const parent = avariadoById.get(p.checklist_item_id);
      const pointLabel = parent
        ? `${parent.point_number != null ? `${parent.point_number}. ` : ""}${parent.description}`
        : null;
      rows.push({
        unified_budget_id: budget.id,
        description: p.description,
        cost: p.total_price,
        source: "checklist",
        source_checklist_item_id: p.checklist_item_id,
        source_checklist_item_part_id: p.id,
        part_number: p.part_number,
        product_line: p.product_line,
        quantity: p.quantity,
        unit_price: p.unit_price,
        source_label: `Vistoria${pointLabel ? ` — ${pointLabel}` : ""}`,
        included: true,
      });
    }

    if (rows.length > 0) {
      const { error: itemsErr } = await supabase.from("unified_budget_items").insert(rows);
      if (itemsErr) {
        setError(itemsErr.message);
        setGenerating(false);
        return;
      }
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      action: "orcamento_unificado_gerado",
      description: `Gerou o orçamento unificado com ${rows.length} item(ns) (vistoria + inspeção mecânica).`,
    });

    await loadBudget();
    setGenerating(false);
  }

  function toggleIncluded(id: string) {
    setItems((prev) => (prev ? prev.map((it) => (it.id === id ? { ...it, included: !it.included } : it)) : prev));
  }

  const duplicatePartNumbers = new Set<string>();
  if (items) {
    const sourcesByPart = new Map<string, Set<string>>();
    for (const it of items) {
      if (!it.included) continue;
      const pn = (it.part_number || "").trim().toLowerCase();
      if (!pn) continue;
      if (!sourcesByPart.has(pn)) sourcesByPart.set(pn, new Set());
      sourcesByPart.get(pn)!.add(it.source);
    }
    for (const [pn, sources] of sourcesByPart) {
      if (sources.size > 1) duplicatePartNumbers.add(pn);
    }
  }

  function isDuplicate(it: BudgetItem) {
    const pn = (it.part_number || "").trim().toLowerCase();
    return pn !== "" && duplicatePartNumbers.has(pn);
  }

  const total = items?.filter((it) => it.included).reduce((s, it) => s + it.cost, 0) ?? 0;
  const duplicateCount = items ? new Set(items.filter(isDuplicate).map((it) => it.part_number)).size : 0;

  async function confirmAndComplete() {
    if (!items || !budgetId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const it of items) {
      const { error: updErr } = await supabase
        .from("unified_budget_items")
        .update({ included: it.included })
        .eq("id", it.id);
      if (updErr) {
        setError(updErr.message);
        setSaving(false);
        return;
      }
    }

    await supabase.from("unified_budgets").update({ base_total: total }).eq("id", budgetId);

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      action: "orcamento_unificado_concluido",
      description: `Concluiu a unificação com ${items.filter((it) => it.included).length} de ${
        items.length
      } item(ns) incluído(s), total ${currency(total)}.`,
    });

    setSaving(false);
    await onCompleted();
  }

  if (loading) {
    return <p className="text-sm text-ekotruck-gray">Carregando orçamento unificado...</p>;
  }

  if (!budgetId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ekotruck-gray">
          Reúna, num só lugar, os achados da vistoria e do orçamento da inspeção mecânica para decidir o que vai para
          o orçamento final.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={generating || disabled}
          onClick={generateBudget}
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {generating ? "Gerando..." : "Gerar orçamento unificado"}
        </button>
      </div>
    );
  }

  const sections: { key: BudgetItem["source"]; label: string }[] = [
    { key: "checklist", label: "Vistoria" },
    { key: "mechanical", label: "Inspeção Mecânica" },
  ];

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {duplicateCount > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ {duplicateCount} partnumber(s) aparecem tanto na vistoria quanto na inspeção mecânica — possível
          duplicidade. Confira e desmarque o que não deve entrar no orçamento final.
        </p>
      )}

      {sections.map((section) => {
        const sectionItems = (items ?? []).filter((it) => it.source === section.key);
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.key} className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
            <div className="bg-ekotruck-darkGreen/5 px-3 py-1.5 text-sm font-semibold text-ekotruck-darkGreen">
              {section.label}
            </div>
            <table className="w-full text-xs">
              <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
                <tr>
                  <th className="px-2 py-1.5">Origem</th>
                  <th className="px-2 py-1.5">Linha</th>
                  <th className="px-2 py-1.5">Partnumber</th>
                  <th className="px-2 py-1.5">Descrição</th>
                  <th className="px-2 py-1.5">Qtde.</th>
                  <th className="px-2 py-1.5">Preço Unit.</th>
                  <th className="px-2 py-1.5">Preço Total</th>
                  <th className="px-2 py-1.5">Incluir</th>
                </tr>
              </thead>
              <tbody>
                {sectionItems.map((it) => {
                  const dup = isDuplicate(it);
                  return (
                    <tr
                      key={it.id}
                      className={`border-t border-ekotruck-darkGreen/10 ${dup ? "bg-amber-50" : ""} ${
                        !it.included ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 align-top">
                        {it.source_label}
                        {dup && <div className="mt-0.5 text-amber-700">⚠ possível duplicidade</div>}
                      </td>
                      <td className="px-2 py-1.5 align-top">{it.product_line}</td>
                      <td className="px-2 py-1.5 align-top">{it.part_number}</td>
                      <td className="px-2 py-1.5 align-top">{it.description}</td>
                      <td className="px-2 py-1.5 align-top">{it.quantity}</td>
                      <td className="px-2 py-1.5 align-top">{it.unit_price != null ? currency(it.unit_price) : ""}</td>
                      <td className="px-2 py-1.5 align-top">{currency(it.cost)}</td>
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="checkbox"
                          checked={it.included}
                          disabled={saving || disabled}
                          onChange={() => toggleIncluded(it.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="flex justify-end rounded-md border border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
        Total do orçamento final: {currency(total)}
      </div>

      <button
        type="button"
        disabled={!items || items.length === 0 || saving || disabled}
        onClick={confirmAndComplete}
        className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Confirmar orçamento unificado e concluir etapa"}
      </button>
    </div>
  );
}
