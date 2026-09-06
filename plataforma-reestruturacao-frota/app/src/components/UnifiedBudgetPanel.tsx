"use client";

import { Fragment, useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

function taskKey(taskNumber: number | null, taskName: string) {
  return `${taskNumber ?? "none"}|${taskName || ""}`;
}

const NONE_TASK = "__none__";
const NEW_TASK = "__new__";

interface BudgetItem {
  id: string;
  isNew?: boolean;
  description: string;
  cost: number;
  source: "checklist" | "mechanical" | "both" | "manual";
  part_number: string;
  product_line: string;
  quantity: number;
  unit_price: number;
  source_label: string;
  included: boolean;
  task_number: number | null;
  task_name: string;
}

function blankBudgetItem(): BudgetItem {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    isNew: true,
    description: "",
    cost: 0,
    source: "manual",
    part_number: "",
    product_line: "",
    quantity: 1,
    unit_price: 0,
    source_label: "Adicionado manualmente",
    included: true,
    task_number: null,
    task_name: "",
  };
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
  const [removedItems, setRemovedItems] = useState<{ id: string; description: string }[]>([]);
  // Retrato dos itens tal como vieram do banco, para detectar o que o
  // operador realmente editou até a confirmação (e registrar no histórico).
  const [originalItems, setOriginalItems] = useState<Record<string, BudgetItem>>({});

  // Tarefas criadas explicitamente (botão "Criar tarefa"), que ainda não têm
  // nenhum item — por isso não aparecem nos grupos derivados de `items`.
  const [taskDefs, setTaskDefs] = useState<{ taskNumber: number | null; taskName: string }[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskNumber, setNewTaskNumber] = useState("");
  const [newTaskName, setNewTaskName] = useState("");

  // Seleção de tarefa para o próximo item a ser adicionado manualmente.
  const [addTaskChoice, setAddTaskChoice] = useState<string>(NONE_TASK);
  const [addTaskNewNumber, setAddTaskNewNumber] = useState("");
  const [addTaskNewName, setAddTaskNewName] = useState("");

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
    const loaded: BudgetItem[] = ((budgetItems as Record<string, any>[]) ?? []).map((it) => ({
      id: it.id,
      description: it.description,
      cost: it.cost,
      source: it.source,
      part_number: it.part_number || "",
      product_line: it.product_line || "",
      quantity: it.quantity ?? 1,
      unit_price: it.unit_price ?? 0,
      source_label: it.source_label || "",
      included: it.included,
      task_number: it.task_number,
      task_name: it.task_name || "",
    }));
    setItems(loaded);
    setOriginalItems(Object.fromEntries(loaded.map((it) => [it.id, it])));
    setRemovedItems([]);
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
        source_label: "Inspeção Mecânica",
        task_number: it.task_number,
        task_name: it.task_name || "",
        included: true,
      });
    }

    const avariadoById = new Map(avariados.map((a) => [a.id, a]));
    for (const p of checklistParts) {
      const parent = avariadoById.get(p.checklist_item_id);
      const pointLabel = parent
        ? `${parent.point_number != null ? `${parent.point_number}. ` : ""}${parent.description}`
        : "";
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
        source_label: "Vistoria",
        task_number: null,
        task_name: pointLabel,
        included: true,
      });
    }

    let insertedRows: { id: string; description: string; source_label: string | null }[] = [];
    if (rows.length > 0) {
      const { data, error: itemsErr } = await supabase
        .from("unified_budget_items")
        .insert(rows)
        .select("id, description, source_label");
      if (itemsErr) {
        setError(itemsErr.message);
        setGenerating(false);
        return;
      }
      insertedRows = data ?? [];
    }

    await supabase.from("activity_log").insert([
      {
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "orcamento_unificado",
        action: "orcamento_unificado_gerado",
        description: `Gerou o orçamento unificado com ${rows.length} item(ns) (vistoria + inspeção mecânica).`,
      },
      ...insertedRows.map((row) => ({
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "orcamento_unificado",
        action: "item_criado",
        description: `Trouxe o item "${row.description}" (${row.source_label}) para o orçamento unificado.`,
      })),
    ]);

    await loadBudget();
    setGenerating(false);
  }

  function updateItem(index: number, patch: Partial<BudgetItem>) {
    setItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      if ("quantity" in patch || "unit_price" in patch) {
        merged.cost = Math.round(merged.quantity * merged.unit_price * 100) / 100;
      }
      next[index] = merged;
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => {
      if (!prev) return prev;
      const it = prev[index];
      if (!it.isNew) setRemovedItems((r) => [...r, { id: it.id, description: it.description }]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function addTaskDef(t: { taskNumber: number | null; taskName: string }) {
    setTaskDefs((prev) => {
      const key = taskKey(t.taskNumber, t.taskName);
      if (prev.some((d) => taskKey(d.taskNumber, d.taskName) === key)) return prev;
      return [...prev, t];
    });
  }

  function saveNewTask() {
    const parsed = newTaskNumber.trim() === "" ? null : parseInt(newTaskNumber, 10);
    const taskNumber = parsed !== null && !isNaN(parsed) ? parsed : null;
    if (taskNumber == null && !newTaskName.trim()) return;
    addTaskDef({ taskNumber, taskName: newTaskName.trim() });
    setNewTaskNumber("");
    setNewTaskName("");
    setCreatingTask(false);
  }

  function cancelNewTask() {
    setNewTaskNumber("");
    setNewTaskName("");
    setCreatingTask(false);
  }

  function addManualItem() {
    let task: { taskNumber: number | null; taskName: string } = { taskNumber: null, taskName: "" };
    if (addTaskChoice === NEW_TASK) {
      const parsed = addTaskNewNumber.trim() === "" ? null : parseInt(addTaskNewNumber, 10);
      task = {
        taskNumber: parsed !== null && !isNaN(parsed) ? parsed : null,
        taskName: addTaskNewName.trim(),
      };
      addTaskDef(task);
      setAddTaskChoice(taskKey(task.taskNumber, task.taskName));
      setAddTaskNewNumber("");
      setAddTaskNewName("");
    } else if (addTaskChoice !== NONE_TASK) {
      const opt = allTaskOptions.find((o) => o.key === addTaskChoice);
      if (opt) task = { taskNumber: opt.taskNumber, taskName: opt.taskName };
    }
    const blank = blankBudgetItem();
    setItems((prev) => [...(prev ?? []), { ...blank, task_number: task.taskNumber, task_name: task.taskName }]);
  }

  const groups: {
    key: string;
    reactKey: string;
    taskNumber: number | null;
    taskName: string;
    entries: { item: BudgetItem; index: number }[];
  }[] = [];
  if (items) {
    const map = new Map<string, (typeof groups)[number]>();
    items.forEach((item, index) => {
      const key = taskKey(item.task_number, item.task_name);
      let g = map.get(key);
      if (!g) {
        // reactKey usa o índice do primeiro item do grupo (estável) em vez do
        // conteúdo da tarefa (key) — senão, cada letra digitada no nome da
        // tarefa muda a key, remonta o Fragment inteiro e o campo perde foco.
        g = { key, reactKey: `g-${index}`, taskNumber: item.task_number, taskName: item.task_name, entries: [] };
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

  const allTaskOptions = (() => {
    const map = new Map<string, { key: string; taskNumber: number | null; taskName: string }>();
    taskOptions.forEach((o) => map.set(o.key, o));
    taskDefs.forEach((d) => {
      const key = taskKey(d.taskNumber, d.taskName);
      if (!map.has(key)) map.set(key, { key, taskNumber: d.taskNumber, taskName: d.taskName });
    });
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.taskNumber == null && b.taskNumber == null) return 0;
      if (a.taskNumber == null) return 1;
      if (b.taskNumber == null) return -1;
      return a.taskNumber - b.taskNumber;
    });
    return list;
  })();

  const duplicatePartNumbers = new Set<string>();
  if (items) {
    const sourcesByPart = new Map<string, Set<string>>();
    for (const it of items) {
      if (!it.included) continue;
      const pn = it.part_number.trim().toLowerCase();
      if (!pn) continue;
      if (!sourcesByPart.has(pn)) sourcesByPart.set(pn, new Set());
      sourcesByPart.get(pn)!.add(it.source);
    }
    for (const [pn, sources] of sourcesByPart) {
      if (sources.size > 1) duplicatePartNumbers.add(pn);
    }
  }

  function isDuplicate(it: BudgetItem) {
    const pn = it.part_number.trim().toLowerCase();
    return pn !== "" && duplicatePartNumbers.has(pn);
  }

  const total = items?.filter((it) => it.included).reduce((s, it) => s + it.cost, 0) ?? 0;
  const duplicateCount = items ? new Set(items.filter(isDuplicate).map((it) => it.part_number)).size : 0;

  function downloadPdf() {
    if (!items) return;
    const included = items.filter((it) => it.included);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Orçamento Unificado", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    let y = 28;
    const groupsForPdf = new Map<string, { label: string; items: BudgetItem[] }>();
    for (const it of included) {
      const key = taskKey(it.task_number, it.task_name);
      if (!groupsForPdf.has(key)) {
        groupsForPdf.set(key, {
          label:
            it.task_number != null
              ? `Tarefa ${it.task_number}${it.task_name ? ` — ${it.task_name}` : ""}`
              : it.task_name || "Sem tarefa",
          items: [],
        });
      }
      groupsForPdf.get(key)!.items.push(it);
    }

    for (const group of groupsForPdf.values()) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text(group.label, 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Unit.", "Preço Total"]],
        body: group.items.map((it) => [
          it.product_line,
          it.part_number,
          it.description,
          String(it.quantity),
          currency(it.unit_price),
          currency(it.cost),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 45, 43] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    doc.setFontSize(12);
    doc.text(`Total: ${currency(total)}`, 14, y);

    doc.save(`orcamento-unificado-${caseId}.pdf`);
  }

  function describeFieldChanges(before: BudgetItem, after: BudgetItem): string[] {
    const changes: string[] = [];
    if (before.description !== after.description) {
      changes.push(`descrição de "${before.description}" para "${after.description}"`);
    }
    if (before.part_number !== after.part_number) {
      changes.push(`partnumber de "${before.part_number || "-"}" para "${after.part_number || "-"}"`);
    }
    if (before.product_line !== after.product_line) {
      changes.push(`linha de "${before.product_line || "-"}" para "${after.product_line || "-"}"`);
    }
    if (before.quantity !== after.quantity) {
      changes.push(`quantidade de ${before.quantity} para ${after.quantity}`);
    }
    if (before.unit_price !== after.unit_price) {
      changes.push(`preço unitário de ${currency(before.unit_price)} para ${currency(after.unit_price)}`);
    }
    if (taskKey(before.task_number, before.task_name) !== taskKey(after.task_number, after.task_name)) {
      changes.push("tarefa alterada");
    }
    return changes;
  }

  async function confirmAndComplete() {
    if (!items || !budgetId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const itemLogs: Record<string, unknown>[] = [];

    if (removedItems.length > 0) {
      const { error: delErr } = await supabase
        .from("unified_budget_items")
        .delete()
        .in(
          "id",
          removedItems.map((r) => r.id)
        );
      if (delErr) {
        setError(delErr.message);
        setSaving(false);
        return;
      }
      for (const r of removedItems) {
        itemLogs.push({
          case_id: caseId,
          actor_id: user?.id,
          actor_email: user?.email,
          stage: "orcamento_unificado",
          action: "item_excluido",
          description: `Excluiu o item "${r.description}" do orçamento unificado.`,
        });
      }
    }

    for (const it of items) {
      if (it.isNew) {
        const { error: insErr } = await supabase.from("unified_budget_items").insert({
          unified_budget_id: budgetId,
          description: it.description,
          cost: it.cost,
          source: it.source,
          part_number: it.part_number,
          product_line: it.product_line,
          quantity: it.quantity,
          unit_price: it.unit_price,
          source_label: it.source_label,
          task_number: it.task_number,
          task_name: it.task_name,
          included: it.included,
        });
        if (insErr) {
          setError(insErr.message);
          setSaving(false);
          return;
        }
        itemLogs.push({
          case_id: caseId,
          actor_id: user?.id,
          actor_email: user?.email,
          stage: "orcamento_unificado",
          action: "item_criado",
          description: `Adicionou o item "${it.description}" ao orçamento unificado${
            it.task_name ? ` (${it.task_number != null ? `Tarefa ${it.task_number} — ` : ""}${it.task_name})` : ""
          }.`,
        });
      } else {
        const { error: updErr } = await supabase
          .from("unified_budget_items")
          .update({
            description: it.description,
            cost: it.cost,
            part_number: it.part_number,
            product_line: it.product_line,
            quantity: it.quantity,
            unit_price: it.unit_price,
            task_number: it.task_number,
            task_name: it.task_name,
            included: it.included,
          })
          .eq("id", it.id);
        if (updErr) {
          setError(updErr.message);
          setSaving(false);
          return;
        }

        const before = originalItems[it.id];
        if (before) {
          const changes = describeFieldChanges(before, it);
          if (changes.length > 0) {
            itemLogs.push({
              case_id: caseId,
              actor_id: user?.id,
              actor_email: user?.email,
              stage: "orcamento_unificado",
              action: "item_editado",
              description: `Editou o item "${it.description}" no orçamento unificado: ${changes.join("; ")}.`,
            });
          }
          if (before.included !== it.included) {
            itemLogs.push({
              case_id: caseId,
              actor_id: user?.id,
              actor_email: user?.email,
              stage: "orcamento_unificado",
              action: it.included ? "item_incluido" : "item_excluido_selecao",
              description: `${it.included ? "Reincluiu" : "Excluiu"} o item "${it.description}" do orçamento final.`,
            });
          }
        }
      }
    }

    await supabase.from("unified_budgets").update({ base_total: total }).eq("id", budgetId);

    await supabase.from("activity_log").insert([
      {
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "orcamento_unificado",
        action: "orcamento_unificado_concluido",
        description: `Concluiu a unificação com ${items.filter((it) => it.included).length} de ${
          items.length
        } item(ns) incluído(s), total ${currency(total)}.`,
      },
      ...itemLogs,
    ]);

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

  const addItemControls = (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={addTaskChoice}
        onChange={(e) => setAddTaskChoice(e.target.value)}
        disabled={saving || disabled}
        className="rounded border px-2 py-1.5 text-sm"
      >
        <option value={NONE_TASK}>Sem tarefa</option>
        {allTaskOptions.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.taskNumber != null ? `Tarefa ${opt.taskNumber}` : "Sem tarefa"}
            {opt.taskName ? ` — ${opt.taskName}` : ""}
          </option>
        ))}
        <option value={NEW_TASK}>+ Nova tarefa...</option>
      </select>
      {addTaskChoice === NEW_TASK && (
        <>
          <input
            type="number"
            placeholder="nº"
            value={addTaskNewNumber}
            onChange={(e) => setAddTaskNewNumber(e.target.value)}
            className="w-16 rounded border px-1 py-1.5 text-sm"
          />
          <input
            type="text"
            placeholder="nome da tarefa"
            value={addTaskNewName}
            onChange={(e) => setAddTaskNewName(e.target.value)}
            className="w-40 rounded border px-1 py-1.5 text-sm"
          />
        </>
      )}
      <button
        type="button"
        disabled={saving || disabled}
        onClick={addManualItem}
        className="rounded-md border border-dashed px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
      >
        + Adicionar item
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!items || items.length === 0}
          onClick={downloadPdf}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
        >
          📄 Baixar PDF do orçamento
        </button>
        {!creatingTask && (
          <button
            type="button"
            disabled={saving || disabled}
            onClick={() => setCreatingTask(true)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
          >
            + Criar tarefa
          </button>
        )}
        {creatingTask && (
          <div className="flex items-center gap-2 rounded-md border border-dashed px-2 py-1">
            <input
              type="number"
              placeholder="nº"
              value={newTaskNumber}
              onChange={(e) => setNewTaskNumber(e.target.value)}
              className="w-16 rounded border px-1 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="nome da tarefa"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-40 rounded border px-1 py-1 text-sm"
            />
            <button
              type="button"
              onClick={saveNewTask}
              className="rounded-md bg-ekotruck-orange px-3 py-1 text-sm font-medium text-white hover:opacity-90"
            >
              Salvar
            </button>
            <button type="button" onClick={cancelNewTask} className="text-sm text-ekotruck-gray hover:underline">
              cancelar
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {duplicateCount > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ {duplicateCount} partnumber(s) aparecem tanto na vistoria quanto na inspeção mecânica — possível
          duplicidade. Confira e desmarque o que não deve entrar no orçamento final.
        </p>
      )}

      {(!items || items.length === 0) && addItemControls}

      {items && items.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
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
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const subtotal = g.entries.reduce((s, e) => s + e.item.cost, 0);
                return (
                  <Fragment key={g.reactKey}>
                    <tr className="border-t border-ekotruck-darkGreen/10 bg-ekotruck-mint/20">
                      <td colSpan={9} className="px-2 py-1.5 font-semibold text-ekotruck-darkGreen">
                        {g.taskNumber != null ? `Tarefa ${g.taskNumber}` : g.taskName || "Sem tarefa"}
                        {g.taskNumber != null && g.taskName ? ` — ${g.taskName}` : ""}
                      </td>
                    </tr>
                    {g.entries.map(({ item: it, index: idx }) => {
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
                          <td className="px-2 py-1.5 align-top">
                            <input
                              type="text"
                              value={it.product_line}
                              onChange={(e) => updateItem(idx, { product_line: e.target.value })}
                              className="w-14 rounded border px-1 py-0.5"
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            <input
                              type="text"
                              value={it.part_number}
                              onChange={(e) => updateItem(idx, { part_number: e.target.value })}
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
                              type="text"
                              inputMode="numeric"
                              value={currency(it.unit_price)}
                              onChange={(e) => updateItem(idx, { unit_price: parseCurrencyInput(e.target.value) })}
                              className="w-24 rounded border px-1 py-0.5"
                            />
                          </td>
                          <td className="px-2 py-1.5 align-top">{currency(it.cost)}</td>
                          <td className="px-2 py-1.5 align-top">
                            <input
                              type="checkbox"
                              checked={it.included}
                              disabled={saving || disabled}
                              onChange={() => updateItem(idx, { included: !it.included })}
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
                      );
                    })}
                    <tr className="border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5">
                      <td colSpan={6}></td>
                      <td colSpan={3} className="px-2 py-1.5 text-right font-medium">
                        Subtotal: {currency(subtotal)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="border-t border-ekotruck-darkGreen/10">
                <td colSpan={9} className="px-2 py-1.5">
                  {addItemControls}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
            Total do orçamento final: {currency(total)}
          </div>
        </div>
      )}

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
