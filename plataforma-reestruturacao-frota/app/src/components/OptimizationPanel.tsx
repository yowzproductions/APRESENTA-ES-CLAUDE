"use client";

import { Fragment, useEffect, useState } from "react";
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

type PartBrand = "scania" | "ekotruck" | "ekotruck_spot";

function brandLabel(b: PartBrand) {
  if (b === "ekotruck") return "Ekotruck";
  if (b === "ekotruck_spot") return "Ekotruck Spot";
  return "Scania Original";
}

// Itens de mão de obra (linhas 90/92) podem ser terceirizados para outra
// oficina; os demais (peças) podem trocar de marca.
function isLaborLine(productLine: string) {
  return productLine === "90" || productLine === "92";
}

interface OptItem {
  id: string;
  isNew?: boolean;
  description: string;
  cost: number;
  part_number: string;
  product_line: string;
  quantity: number;
  unit_price: number;
  source_label: string;
  approved: boolean;
  justification: string;
  task_number: number | null;
  task_name: string;
  source_unified_budget_item_id: string | null;
  brand: PartBrand;
  supplier: string;
  outsourced: boolean;
  outsourced_to: string;
}

function blankOptItem(): OptItem {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    isNew: true,
    description: "",
    cost: 0,
    part_number: "",
    product_line: "",
    quantity: 1,
    unit_price: 0,
    source_label: "Adicionado na moderação",
    approved: true,
    justification: "",
    task_number: null,
    task_name: "",
    source_unified_budget_item_id: null,
    brand: "scania",
    supplier: "",
    outsourced: false,
    outsourced_to: "",
  };
}

export function OptimizationPanel({
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
  const [optimizationId, setOptimizationId] = useState<string | null>(null);
  const [moderationCompletedAt, setModerationCompletedAt] = useState<string | null>(null);
  const [items, setItems] = useState<OptItem[] | null>(null);
  const [removedItems, setRemovedItems] = useState<{ id: string; description: string }[]>([]);
  // Retrato dos itens tal como vieram do banco, para detectar o que o
  // especialista/operador realmente editou até a confirmação (e registrar no histórico).
  const [originalItems, setOriginalItems] = useState<Record<string, OptItem>>({});
  // Preço original (do orçamento unificado) de cada item, para calcular a economia na precificação.
  const [originalCosts, setOriginalCosts] = useState<Record<string, number>>({});

  const [taskDefs, setTaskDefs] = useState<{ taskNumber: number | null; taskName: string }[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskNumber, setNewTaskNumber] = useState("");
  const [newTaskName, setNewTaskName] = useState("");

  const [addTaskChoice, setAddTaskChoice] = useState<string>(NONE_TASK);
  const [addTaskNewNumber, setAddTaskNewNumber] = useState("");
  const [addTaskNewName, setAddTaskNewName] = useState("");

  const phase: 1 | 2 = moderationCompletedAt ? 2 : 1;

  async function loadOptimization() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: optimization } = await supabase
      .from("budget_optimizations")
      .select("id, moderation_completed_at")
      .eq("case_id", caseId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!optimization) {
      setOptimizationId(null);
      setModerationCompletedAt(null);
      setItems(null);
      setLoading(false);
      return;
    }

    setOptimizationId(optimization.id);
    setModerationCompletedAt(optimization.moderation_completed_at);
    const { data: optItems } = await supabase
      .from("optimization_items")
      .select("*")
      .eq("optimization_id", optimization.id)
      .order("created_at", { ascending: true });
    const loaded: OptItem[] = ((optItems as Record<string, any>[]) ?? []).map((it) => ({
      id: it.id,
      description: it.description,
      cost: it.cost,
      part_number: it.part_number || "",
      product_line: it.product_line || "",
      quantity: it.quantity ?? 1,
      unit_price: it.unit_price ?? 0,
      source_label: it.source_label || "",
      approved: it.approved,
      justification: it.justification || "",
      task_number: it.task_number,
      task_name: it.task_name || "",
      source_unified_budget_item_id: it.source_unified_budget_item_id || null,
      brand: (it.brand as PartBrand) || "scania",
      supplier: it.supplier || "",
      outsourced: it.outsourced ?? false,
      outsourced_to: it.outsourced_to || "",
    }));
    setItems(loaded);
    setOriginalItems(Object.fromEntries(loaded.map((it) => [it.id, it])));
    setRemovedItems([]);

    const sourceIds = Array.from(
      new Set(loaded.map((it) => it.source_unified_budget_item_id).filter((id): id is string => !!id))
    );
    if (sourceIds.length > 0) {
      const { data: sourceItems } = await supabase
        .from("unified_budget_items")
        .select("id, cost")
        .in("id", sourceIds);
      setOriginalCosts(Object.fromEntries((sourceItems ?? []).map((s: any) => [s.id, s.cost])));
    } else {
      setOriginalCosts({});
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOptimization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function generateOptimization() {
    setGenerating(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: budget } = await supabase
      .from("unified_budgets")
      .select("id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!budget) {
      setError("Não encontrei um orçamento unificado gerado para este caso.");
      setGenerating(false);
      return;
    }

    const { data: budgetItems } = await supabase
      .from("unified_budget_items")
      .select("*")
      .eq("unified_budget_id", budget.id)
      .eq("included", true);

    const { data: optimization, error: optErr } = await supabase
      .from("budget_optimizations")
      .insert({ case_id: caseId, unified_budget_id: budget.id, started_by: user?.id })
      .select("id")
      .single();
    if (optErr) {
      setError(optErr.message);
      setGenerating(false);
      return;
    }

    const rows = (budgetItems ?? []).map((it) => ({
      optimization_id: optimization.id,
      description: it.description,
      cost: it.cost,
      part_number: it.part_number,
      product_line: it.product_line,
      quantity: it.quantity,
      unit_price: it.unit_price,
      source_label: it.source_label,
      source_unified_budget_item_id: it.id,
      task_number: it.task_number,
      task_name: it.task_name || "",
      approved: true,
    }));

    let insertedRows: { id: string; description: string }[] = [];
    if (rows.length > 0) {
      const { data, error: itemsErr } = await supabase
        .from("optimization_items")
        .insert(rows)
        .select("id, description");
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
        stage: "em_otimizacao",
        action: "moderacao_gerada",
        description: `Trouxe ${rows.length} item(ns) do orçamento unificado para a moderação.`,
      },
      ...insertedRows.map((row) => ({
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "em_otimizacao",
        action: "item_criado",
        description: `Trouxe o item "${row.description}" para a moderação, já aprovado.`,
      })),
    ]);

    await loadOptimization();
    setGenerating(false);
  }

  function updateItem(index: number, patch: Partial<OptItem>) {
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
    const blank = blankOptItem();
    setItems((prev) => [...(prev ?? []), { ...blank, task_number: task.taskNumber, task_name: task.taskName }]);
  }

  // Na fase 1 (moderação) trabalhamos a lista inteira; na fase 2 (precificação)
  // só os itens aprovados na moderação entram em pauta.
  const sourceEntries: { item: OptItem; index: number }[] = items
    ? items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => (phase === 2 ? item.approved : true))
    : [];

  const groups: {
    key: string;
    reactKey: string;
    taskNumber: number | null;
    taskName: string;
    entries: { item: OptItem; index: number }[];
  }[] = [];
  {
    const map = new Map<string, (typeof groups)[number]>();
    sourceEntries.forEach(({ item, index }) => {
      const key = taskKey(item.task_number, item.task_name);
      let g = map.get(key);
      if (!g) {
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

  const total = items?.filter((it) => it.approved).reduce((s, it) => s + it.cost, 0) ?? 0;

  function originalCostOf(it: OptItem) {
    if (!it.source_unified_budget_item_id) return it.cost;
    return originalCosts[it.source_unified_budget_item_id] ?? it.cost;
  }

  const totalOriginal =
    phase === 2 ? sourceEntries.reduce((s, { item }) => s + originalCostOf(item), 0) : 0;
  const totalSavings = phase === 2 ? totalOriginal - total : 0;

  function describeFieldChanges(before: OptItem, after: OptItem): string[] {
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
    if (before.brand !== after.brand) {
      changes.push(`marca de "${brandLabel(before.brand)}" para "${brandLabel(after.brand)}"`);
    }
    if (before.supplier !== after.supplier) {
      changes.push(`fornecedor de "${before.supplier || "-"}" para "${after.supplier || "-"}"`);
    }
    if (before.outsourced !== after.outsourced) {
      changes.push(
        after.outsourced
          ? `terceirizado para a oficina "${after.outsourced_to || "-"}"`
          : "deixou de ser terceirizado"
      );
    }
    if (before.outsourced && after.outsourced && before.outsourced_to !== after.outsourced_to) {
      changes.push(`oficina terceirizada de "${before.outsourced_to || "-"}" para "${after.outsourced_to || "-"}"`);
    }
    return changes;
  }

  async function confirmModeration() {
    if (!items || !optimizationId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const itemLogs: Record<string, unknown>[] = [];

    if (removedItems.length > 0) {
      const { error: delErr } = await supabase
        .from("optimization_items")
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
          stage: "em_otimizacao",
          action: "item_excluido",
          description: `Excluiu o item "${r.description}" da moderação.`,
        });
      }
    }

    for (const it of items) {
      if (it.isNew) {
        const { error: insErr } = await supabase.from("optimization_items").insert({
          optimization_id: optimizationId,
          description: it.description,
          cost: it.cost,
          part_number: it.part_number,
          product_line: it.product_line,
          quantity: it.quantity,
          unit_price: it.unit_price,
          source_label: it.source_label,
          task_number: it.task_number,
          task_name: it.task_name,
          approved: it.approved,
          justification: it.justification || null,
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
          stage: "em_otimizacao",
          action: "item_criado",
          description: `Adicionou o item "${it.description}" na moderação${
            it.task_name ? ` (${it.task_number != null ? `Tarefa ${it.task_number} — ` : ""}${it.task_name})` : ""
          }.`,
        });
      } else {
        const { error: updErr } = await supabase
          .from("optimization_items")
          .update({
            description: it.description,
            cost: it.cost,
            part_number: it.part_number,
            product_line: it.product_line,
            quantity: it.quantity,
            unit_price: it.unit_price,
            task_number: it.task_number,
            task_name: it.task_name,
            approved: it.approved,
            justification: it.justification || null,
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
              stage: "em_otimizacao",
              action: "item_editado",
              description: `Editou o item "${it.description}" na moderação: ${changes.join("; ")}.`,
            });
          }
          if (before.approved !== it.approved) {
            itemLogs.push({
              case_id: caseId,
              actor_id: user?.id,
              actor_email: user?.email,
              stage: "em_otimizacao",
              action: it.approved ? "item_aprovado" : "item_desconsiderado",
              description: `${it.approved ? "Aprovou" : "Desconsiderou"} o item "${it.description}" na moderação${
                !it.approved && it.justification ? ` (motivo: ${it.justification})` : ""
              }.`,
            });
          }
        }
      }
    }

    await supabase
      .from("budget_optimizations")
      .update({ moderation_completed_at: new Date().toISOString() })
      .eq("id", optimizationId);

    await supabase.from("activity_log").insert([
      {
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "em_otimizacao",
        action: "moderacao_concluida",
        description: `Concluiu a moderação com ${items.filter((it) => it.approved).length} de ${
          items.length
        } item(ns) aprovado(s) para a precificação.`,
      },
      ...itemLogs,
    ]);

    setSaving(false);
    await loadOptimization();
  }

  async function confirmPricing() {
    if (!items || !optimizationId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const itemLogs: Record<string, unknown>[] = [];

    for (const it of items) {
      if (!it.approved || it.isNew) continue;
      const { error: updErr } = await supabase
        .from("optimization_items")
        .update({
          quantity: it.quantity,
          unit_price: it.unit_price,
          cost: it.cost,
          brand: it.brand,
          supplier: it.supplier || null,
          outsourced: it.outsourced,
          outsourced_to: it.outsourced_to || null,
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
            stage: "em_otimizacao",
            action: "item_editado",
            description: `Editou o item "${it.description}" na precificação: ${changes.join("; ")}.`,
          });
        }
      }
    }

    await supabase
      .from("budget_optimizations")
      .update({ final_total: total, completed_at: new Date().toISOString() })
      .eq("id", optimizationId);

    await supabase.from("activity_log").insert([
      {
        case_id: caseId,
        actor_id: user?.id,
        actor_email: user?.email,
        stage: "em_otimizacao",
        action: "precificacao_concluida",
        description: `Concluiu a precificação: total de ${currency(total)} (economia de ${currency(
          totalSavings
        )} em relação ao orçamento original).`,
      },
      ...itemLogs,
    ]);

    setSaving(false);
    await onCompleted();
  }

  if (loading) {
    return <p className="text-sm text-ekotruck-gray">Carregando otimização...</p>;
  }

  if (!optimizationId) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-ekotruck-gray">
          Traga a lista final do orçamento unificado para o especialista decidir, item a item, o que de fato precisa
          ser feito.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={generating || disabled}
          onClick={generateOptimization}
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {generating ? "Gerando..." : "Gerar lista de moderação"}
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
      {phase === 1 && (
        <>
          <p className="text-sm text-ekotruck-gray">
            Fase 1 — Moderação: avalie cada item e marque o que deve ser desconsiderado do processo.
          </p>
          <div className="flex flex-wrap items-center gap-3">
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
        </>
      )}

      {phase === 2 && (
        <p className="text-sm text-ekotruck-gray">
          Fase 2 — Precificação: busque marcas alternativas de peças (Ekotruck / Ekotruck Spot) ou terceirize
          serviços de mão de obra (linhas 90/92) para otimizar o preço dos itens aprovados na moderação.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {phase === 1 && (!items || items.length === 0) && addItemControls}

      {items && sourceEntries.length > 0 && phase === 1 && (
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
                <th className="px-2 py-1.5">Status</th>
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
                    {g.entries.map(({ item: it, index: idx }) => (
                      <tr
                        key={it.id}
                        className={`border-t border-ekotruck-darkGreen/10 ${!it.approved ? "bg-red-50/50" : ""}`}
                      >
                        <td className="px-2 py-1.5 align-top">{it.source_label}</td>
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
                          <div className="flex overflow-hidden rounded-md border text-xs">
                            <button
                              type="button"
                              disabled={saving || disabled}
                              onClick={() => updateItem(idx, { approved: true })}
                              className={`px-2 py-1 ${
                                it.approved ? "bg-emerald-100 text-emerald-700" : "bg-white text-ekotruck-gray"
                              }`}
                            >
                              Aprovado
                            </button>
                            <button
                              type="button"
                              disabled={saving || disabled}
                              onClick={() => updateItem(idx, { approved: false })}
                              className={`px-2 py-1 ${
                                !it.approved ? "bg-red-100 text-red-700" : "bg-white text-ekotruck-gray"
                              }`}
                            >
                              Desconsiderar
                            </button>
                          </div>
                          {!it.approved && (
                            <input
                              type="text"
                              placeholder="motivo (opcional)"
                              value={it.justification}
                              onChange={(e) => updateItem(idx, { justification: e.target.value })}
                              className="mt-1 w-40 rounded border px-1 py-0.5"
                            />
                          )}
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
            Total aprovado: {currency(total)}
          </div>
        </div>
      )}

      {items && phase === 2 && sourceEntries.length === 0 && (
        <p className="text-sm text-ekotruck-gray">Nenhum item foi aprovado na moderação.</p>
      )}

      {items && sourceEntries.length > 0 && phase === 2 && (
        <div className="overflow-x-auto rounded-md border border-ekotruck-darkGreen/10">
          <table className="w-full text-xs">
            <thead className="bg-ekotruck-darkGreen/5 text-left uppercase text-ekotruck-gray">
              <tr>
                <th className="px-2 py-1.5">Linha</th>
                <th className="px-2 py-1.5">Partnumber</th>
                <th className="px-2 py-1.5">Descrição</th>
                <th className="px-2 py-1.5">Qtde.</th>
                <th className="px-2 py-1.5">Preço Unit.</th>
                <th className="px-2 py-1.5">Preço Total</th>
                <th className="px-2 py-1.5">Preço Original</th>
                <th className="px-2 py-1.5">Economia</th>
                <th className="px-2 py-1.5">Otimização</th>
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
                      const orig = originalCostOf(it);
                      const savings = orig - it.cost;
                      const labor = isLaborLine(it.product_line);
                      return (
                        <tr key={it.id} className="border-t border-ekotruck-darkGreen/10">
                          <td className="px-2 py-1.5 align-top">{it.product_line || "-"}</td>
                          <td className="px-2 py-1.5 align-top">{it.part_number || "-"}</td>
                          <td className="px-2 py-1.5 align-top">{it.description}</td>
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
                          <td className="px-2 py-1.5 align-top text-ekotruck-gray">{currency(orig)}</td>
                          <td
                            className={`px-2 py-1.5 align-top font-medium ${
                              savings > 0 ? "text-emerald-700" : savings < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {currency(savings)}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            {labor ? (
                              <div className="space-y-1">
                                <label className="flex items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={it.outsourced}
                                    disabled={saving || disabled}
                                    onChange={(e) => updateItem(idx, { outsourced: e.target.checked })}
                                  />
                                  Terceirizar
                                </label>
                                {it.outsourced && (
                                  <input
                                    type="text"
                                    placeholder="nome da oficina"
                                    value={it.outsourced_to}
                                    onChange={(e) => updateItem(idx, { outsourced_to: e.target.value })}
                                    className="w-36 rounded border px-1 py-0.5"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <select
                                  value={it.brand}
                                  disabled={saving || disabled}
                                  onChange={(e) => {
                                    const brand = e.target.value as PartBrand;
                                    updateItem(idx, brand === "scania" ? { brand, supplier: "" } : { brand });
                                  }}
                                  className="w-36 rounded border px-1 py-0.5"
                                >
                                  <option value="scania">Scania Original</option>
                                  <option value="ekotruck">Ekotruck</option>
                                  <option value="ekotruck_spot">Ekotruck Spot</option>
                                </select>
                                {it.brand !== "scania" && (
                                  <input
                                    type="text"
                                    placeholder="origem / fornecedor"
                                    value={it.supplier}
                                    onChange={(e) => updateItem(idx, { supplier: e.target.value })}
                                    className="w-36 rounded border px-1 py-0.5"
                                  />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5">
                      <td colSpan={5}></td>
                      <td colSpan={4} className="px-2 py-1.5 text-right font-medium">
                        Subtotal: {currency(subtotal)}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap justify-end gap-4 border-t border-ekotruck-darkGreen/10 bg-ekotruck-darkGreen/5 px-3 py-2 text-sm font-semibold">
            <span>Total original: {currency(totalOriginal)}</span>
            <span>Total otimizado: {currency(total)}</span>
            <span className={totalSavings >= 0 ? "text-emerald-700" : "text-red-600"}>
              Economia: {currency(totalSavings)}
            </span>
          </div>
        </div>
      )}

      {phase === 1 && (
        <button
          type="button"
          disabled={!items || items.length === 0 || saving || disabled}
          onClick={confirmModeration}
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Confirmar moderação e avançar para precificação"}
        </button>
      )}

      {phase === 2 && (
        <button
          type="button"
          disabled={!items || sourceEntries.length === 0 || saving || disabled}
          onClick={confirmPricing}
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Confirmar precificação e concluir etapa"}
        </button>
      )}
    </div>
  );
}
