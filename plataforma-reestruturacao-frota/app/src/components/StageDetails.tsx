"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";
import { CaseStatus } from "@/types/domain";

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function taskKey(taskNumber: number | null, taskName: string) {
  return `${taskNumber ?? "none"}|${taskName || ""}`;
}

function groupByTask<T extends { task_number: number | null; task_name: string }>(items: T[]) {
  const map = new Map<string, { taskNumber: number | null; taskName: string; entries: T[] }>();
  const order: string[] = [];
  for (const it of items) {
    const key = taskKey(it.task_number, it.task_name);
    if (!map.has(key)) {
      map.set(key, { taskNumber: it.task_number, taskName: it.task_name, entries: [] });
      order.push(key);
    }
    map.get(key)!.entries.push(it);
  }
  const groups = order.map((k) => map.get(k)!);
  groups.sort((a, b) => {
    if (a.taskNumber == null && b.taskNumber == null) return 0;
    if (a.taskNumber == null) return 1;
    if (b.taskNumber == null) return -1;
    return a.taskNumber - b.taskNumber;
  });
  return groups;
}

interface MechItem {
  description: string;
  product_line: string | null;
  part_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  estimated_cost: number;
  task_number: number | null;
  task_name: string | null;
}

function MechanicalSummary({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MechItem[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: inspections } = await supabase.from("mechanical_inspections").select("id").eq("case_id", caseId);
      const ids = (inspections ?? []).map((i) => i.id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("mechanical_items").select("*").in("inspection_id", ids);
      setItems((data as MechItem[]) ?? []);
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return <p className="text-xs text-ekotruck-gray">Carregando...</p>;
  if (items.length === 0) return <p className="text-xs text-ekotruck-gray">Nenhum item registrado.</p>;

  const groups = groupByTask(items.map((it) => ({ ...it, task_name: it.task_name || "" })));
  const total = items.reduce((s, it) => s + it.estimated_cost, 0);

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Resultado da Inspeção Mecânica", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    let y = 28;
    for (const g of groups) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text(g.taskNumber != null ? `Tarefa ${g.taskNumber}${g.taskName ? ` — ${g.taskName}` : ""}` : "Sem tarefa", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Total"]],
        body: g.entries.map((it) => [
          it.product_line || "",
          it.part_number || "",
          it.description,
          String(it.quantity ?? ""),
          currency(it.estimated_cost),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 45, 43] },
        margin: { left: 14, right: 14 },
      });
      y = finalY(doc) + 8;
    }

    doc.setFontSize(12);
    doc.text(`Total: ${currency(total)}`, 14, y);
    doc.save(`inspecao-mecanica-${caseId}.pdf`);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-ekotruck-darkGreen/5"
      >
        📄 Baixar PDF da inspeção mecânica
      </button>
      {groups.map((g) => (
        <div key={taskKey(g.taskNumber, g.taskName)} className="overflow-x-auto rounded-md border">
          <div className="bg-ekotruck-darkGreen/5 px-2 py-1 text-xs font-semibold text-ekotruck-darkGreen">
            {g.taskNumber != null ? `Tarefa ${g.taskNumber}` : "Sem tarefa"}
            {g.taskName ? ` — ${g.taskName}` : ""}
          </div>
          <table className="w-full text-xs">
            <tbody>
              {g.entries.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">{it.product_line}</td>
                  <td className="px-2 py-1">{it.part_number}</td>
                  <td className="px-2 py-1">{it.description}</td>
                  <td className="px-2 py-1">{it.quantity}</td>
                  <td className="px-2 py-1">{currency(it.estimated_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="text-right text-xs font-semibold">Total: {currency(total)}</div>
    </div>
  );
}

interface ChecklistPoint {
  id: string;
  point_number: number | null;
  description: string;
  status: string;
  damage_type: string | null;
  justification: string | null;
}

interface ChecklistPart {
  checklist_item_id: string;
  description: string;
  part_number: string | null;
  product_line: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number;
}

function InspectionSummary({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<ChecklistPoint[]>([]);
  const [parts, setParts] = useState<ChecklistPart[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: checklists } = await supabase.from("inspection_checklists").select("id").eq("case_id", caseId);
      const ids = (checklists ?? []).map((c) => c.id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data: pts } = await supabase
        .from("checklist_items")
        .select("id, point_number, description, status, damage_type, justification")
        .in("checklist_id", ids)
        .order("point_number", { ascending: true });
      const pointsData = (pts as ChecklistPoint[]) ?? [];
      setPoints(pointsData);

      const avariadoIds = pointsData.filter((p) => p.status === "avariado").map((p) => p.id);
      if (avariadoIds.length > 0) {
        const { data: pp } = await supabase.from("checklist_item_parts").select("*").in("checklist_item_id", avariadoIds);
        setParts((pp as ChecklistPart[]) ?? []);
      }
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return <p className="text-xs text-ekotruck-gray">Carregando...</p>;
  if (points.length === 0) return <p className="text-xs text-ekotruck-gray">Nenhum ponto registrado.</p>;

  const avariados = points.filter((p) => p.status === "avariado");

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Resultado da Vistoria", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
    doc.text(`${points.length} pontos vistoriados — ${avariados.length} avariado(s)`, 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [["Nº", "Ponto", "Status", "Tipo de avaria"]],
      body: points.map((p) => [
        p.point_number ?? "",
        p.description,
        p.status === "avariado" ? "Avariado" : "OK",
        p.damage_type || "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [1, 45, 43] },
      margin: { left: 14, right: 14 },
    });

    let y = finalY(doc) + 10;
    let grandTotal = 0;
    for (const p of avariados) {
      const itsParts = parts.filter((part) => part.checklist_item_id === p.id);
      if (itsParts.length === 0) continue;
      const subtotal = itsParts.reduce((s, it) => s + it.total_price, 0);
      grandTotal += subtotal;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.text(
        `${p.point_number != null ? `${p.point_number}. ` : ""}${p.description}${
          p.damage_type ? ` — ${p.damage_type}` : ""
        }`,
        14,
        y
      );
      y += 4;
      if (p.justification) {
        doc.setFontSize(8);
        doc.text(p.justification, 14, y);
        y += 4;
      }
      autoTable(doc, {
        startY: y,
        head: [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Total"]],
        body: itsParts.map((it) => [
          it.product_line || "",
          it.part_number || "",
          it.description,
          String(it.quantity ?? ""),
          currency(it.total_price),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 45, 43] },
        margin: { left: 14, right: 14 },
      });
      y = finalY(doc) + 8;
    }

    if (grandTotal > 0) {
      doc.setFontSize(12);
      doc.text(`Total: ${currency(grandTotal)}`, 14, y);
    }

    doc.save(`vistoria-${caseId}.pdf`);
  }

  return (
    <div className="space-y-2 text-xs">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-ekotruck-darkGreen/5"
      >
        📄 Baixar PDF da vistoria
      </button>
      <p className="text-ekotruck-gray">
        {points.length} pontos vistoriados — {avariados.length} avariado(s)
      </p>
      {avariados.map((p) => {
        const itsParts = parts.filter((part) => part.checklist_item_id === p.id);
        const subtotal = itsParts.reduce((s, it) => s + it.total_price, 0);
        return (
          <div key={p.id} className="rounded-md border bg-red-50/50 p-2">
            <div className="font-medium text-red-800">
              {p.point_number != null ? `${p.point_number}. ` : ""}
              {p.description}
              {p.damage_type ? ` — ${p.damage_type}` : ""}
            </div>
            {p.justification && <div className="mt-0.5 text-ekotruck-gray">{p.justification}</div>}
            {itsParts.length > 0 && (
              <table className="mt-1 w-full">
                <tbody>
                  {itsParts.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-1 py-0.5">{it.part_number}</td>
                      <td className="px-1 py-0.5">{it.description}</td>
                      <td className="px-1 py-0.5">{it.quantity}</td>
                      <td className="px-1 py-0.5">{currency(it.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {itsParts.length > 0 && (
              <div className="mt-0.5 text-right font-medium">Subtotal: {currency(subtotal)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface UnifiedItem {
  description: string;
  product_line: string | null;
  part_number: string | null;
  quantity: number | null;
  cost: number;
  source_label: string | null;
  included: boolean;
  task_number: number | null;
  task_name: string | null;
}

function UnifiedBudgetSummary({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UnifiedItem[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: budget } = await supabase
        .from("unified_budgets")
        .select("id")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!budget) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("unified_budget_items").select("*").eq("unified_budget_id", budget.id);
      setItems((data as UnifiedItem[]) ?? []);
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return <p className="text-xs text-ekotruck-gray">Carregando...</p>;
  if (items.length === 0) return <p className="text-xs text-ekotruck-gray">Nenhum item registrado.</p>;

  const groups = groupByTask(items.map((it) => ({ ...it, task_name: it.task_name || "" })));
  const total = items.filter((it) => it.included).reduce((s, it) => s + it.cost, 0);

  function downloadPdf() {
    const included = items.filter((it) => it.included);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Orçamento Unificado", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    let y = 28;
    const includedGroups = groupByTask(included.map((it) => ({ ...it, task_name: it.task_name || "" })));
    for (const g of includedGroups) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text(g.taskNumber != null ? `Tarefa ${g.taskNumber}${g.taskName ? ` — ${g.taskName}` : ""}` : g.taskName || "Sem tarefa", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Total"]],
        body: g.entries.map((it) => [
          it.product_line || "",
          it.part_number || "",
          it.description,
          String(it.quantity ?? ""),
          currency(it.cost),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 45, 43] },
        margin: { left: 14, right: 14 },
      });
      y = finalY(doc) + 8;
    }

    doc.setFontSize(12);
    doc.text(`Total: ${currency(total)}`, 14, y);
    doc.save(`orcamento-unificado-${caseId}.pdf`);
  }

  return (
    <div className="space-y-2 text-xs">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-ekotruck-darkGreen/5"
      >
        📄 Baixar PDF do orçamento
      </button>
      {groups.map((g) => (
        <div key={taskKey(g.taskNumber, g.taskName)} className="overflow-x-auto rounded-md border">
          <div className="bg-ekotruck-darkGreen/5 px-2 py-1 font-semibold text-ekotruck-darkGreen">
            {g.taskNumber != null ? `Tarefa ${g.taskNumber}` : g.taskName || "Sem tarefa"}
            {g.taskNumber != null && g.taskName ? ` — ${g.taskName}` : ""}
          </div>
          <table className="w-full">
            <tbody>
              {g.entries.map((it, i) => (
                <tr key={i} className={`border-t ${!it.included ? "opacity-50 line-through" : ""}`}>
                  <td className="px-2 py-1">{it.source_label}</td>
                  <td className="px-2 py-1">{it.part_number}</td>
                  <td className="px-2 py-1">{it.description}</td>
                  <td className="px-2 py-1">{it.quantity}</td>
                  <td className="px-2 py-1">{currency(it.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="text-right font-semibold">Total do orçamento final: {currency(total)}</div>
    </div>
  );
}

type PartBrand = "scania" | "ekotruck" | "ekotruck_spot";

function brandLabel(b: PartBrand | null) {
  if (b === "ekotruck") return "Ekotruck";
  if (b === "ekotruck_spot") return "Ekotruck Spot";
  return "Scania Original";
}

interface OptItem {
  description: string;
  product_line: string | null;
  part_number: string | null;
  quantity: number | null;
  cost: number;
  source_label: string | null;
  approved: boolean;
  justification: string | null;
  task_number: number | null;
  task_name: string | null;
  source_unified_budget_item_id: string | null;
  brand: PartBrand | null;
  supplier: string | null;
  outsourced: boolean;
  outsourced_to: string | null;
}

function OptimizationSummary({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OptItem[]>([]);
  const [pricingDone, setPricingDone] = useState(false);
  const [originalCosts, setOriginalCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: optimization } = await supabase
        .from("budget_optimizations")
        .select("id, completed_at")
        .eq("case_id", caseId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!optimization) {
        setLoading(false);
        return;
      }
      setPricingDone(!!optimization.completed_at);
      const { data } = await supabase.from("optimization_items").select("*").eq("optimization_id", optimization.id);
      const loaded = (data as OptItem[]) ?? [];
      setItems(loaded);

      const sourceIds = Array.from(
        new Set(loaded.map((it) => it.source_unified_budget_item_id).filter((id): id is string => !!id))
      );
      if (sourceIds.length > 0) {
        const { data: sourceItems } = await supabase
          .from("unified_budget_items")
          .select("id, cost")
          .in("id", sourceIds);
        setOriginalCosts(Object.fromEntries((sourceItems ?? []).map((s: any) => [s.id, s.cost])));
      }
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return <p className="text-xs text-ekotruck-gray">Carregando...</p>;
  if (items.length === 0) return <p className="text-xs text-ekotruck-gray">Nenhum item registrado.</p>;

  const groups = groupByTask(items.map((it) => ({ ...it, task_name: it.task_name || "" })));
  const approvedItems = items.filter((it) => it.approved);
  const total = approvedItems.reduce((s, it) => s + it.cost, 0);
  const totalOriginal = approvedItems.reduce(
    (s, it) => s + (it.source_unified_budget_item_id ? originalCosts[it.source_unified_budget_item_id] ?? it.cost : it.cost),
    0
  );
  const savings = totalOriginal - total;

  function downloadPdf() {
    const approved = items.filter((it) => it.approved);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(pricingDone ? "Otimização — Moderação e Precificação" : "Moderação da Otimização", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    let y = 28;
    const approvedGroups = groupByTask(approved.map((it) => ({ ...it, task_name: it.task_name || "" })));
    for (const g of approvedGroups) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text(g.taskNumber != null ? `Tarefa ${g.taskNumber}${g.taskName ? ` — ${g.taskName}` : ""}` : g.taskName || "Sem tarefa", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: pricingDone
          ? [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Total", "Otimização"]]
          : [["Linha", "Partnumber", "Descrição", "Qtde.", "Preço Total"]],
        body: g.entries.map((it) =>
          pricingDone
            ? [
                it.product_line || "",
                it.part_number || "",
                it.description,
                String(it.quantity ?? ""),
                currency(it.cost),
                it.outsourced
                  ? `Terceirizado (${it.outsourced_to || "-"})`
                  : brandLabel(it.brand) + (it.brand === "ekotruck_spot" && it.supplier ? ` — ${it.supplier}` : ""),
              ]
            : [it.product_line || "", it.part_number || "", it.description, String(it.quantity ?? ""), currency(it.cost)]
        ),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [1, 45, 43] },
        margin: { left: 14, right: 14 },
      });
      y = finalY(doc) + 8;
    }

    doc.setFontSize(12);
    doc.text(`Total: ${currency(total)}`, 14, y);
    if (pricingDone) {
      y += 6;
      doc.text(`Economia em relação ao orçamento original: ${currency(savings)}`, 14, y);
    }
    doc.save(`otimizacao-${caseId}.pdf`);
  }

  return (
    <div className="space-y-2 text-xs">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-ekotruck-darkGreen/5"
      >
        📄 Baixar PDF da {pricingDone ? "otimização" : "moderação"}
      </button>
      {groups.map((g) => (
        <div key={taskKey(g.taskNumber, g.taskName)} className="overflow-x-auto rounded-md border">
          <div className="bg-ekotruck-darkGreen/5 px-2 py-1 font-semibold text-ekotruck-darkGreen">
            {g.taskNumber != null ? `Tarefa ${g.taskNumber}` : g.taskName || "Sem tarefa"}
            {g.taskNumber != null && g.taskName ? ` — ${g.taskName}` : ""}
          </div>
          <table className="w-full">
            <tbody>
              {g.entries.map((it, i) => (
                <tr key={i} className={`border-t ${!it.approved ? "bg-red-50/50 line-through" : ""}`}>
                  <td className="px-2 py-1">{it.source_label}</td>
                  <td className="px-2 py-1">{it.part_number}</td>
                  <td className="px-2 py-1">{it.description}</td>
                  <td className="px-2 py-1">{it.quantity}</td>
                  <td className="px-2 py-1">{currency(it.cost)}</td>
                  <td className="px-2 py-1">{it.approved ? "Aprovado" : it.justification || "Desconsiderado"}</td>
                  {pricingDone && it.approved && (
                    <td className="px-2 py-1">
                      {it.outsourced
                        ? `Terceirizado (${it.outsourced_to || "-"})`
                        : brandLabel(it.brand) + (it.brand === "ekotruck_spot" && it.supplier ? ` — ${it.supplier}` : "")}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="text-right font-semibold">Total aprovado: {currency(total)}</div>
      {pricingDone && (
        <div className="text-right font-semibold text-emerald-700">
          Economia em relação ao orçamento original: {currency(savings)}
        </div>
      )}
    </div>
  );
}

interface Incident {
  kind: "adicionado" | "removido";
  description: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  cost: number;
}

function ExecutionSummary({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("execution_incidents")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      setIncidents((data as Incident[]) ?? []);
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return <p className="text-xs text-ekotruck-gray">Carregando...</p>;
  if (incidents.length === 0) return <p className="text-xs text-ekotruck-gray">Nenhum imprevisto registrado.</p>;

  const addedTotal = incidents.filter((i) => i.kind === "adicionado").reduce((s, i) => s + i.cost, 0);
  const removedTotal = incidents.filter((i) => i.kind === "removido").reduce((s, i) => s + i.cost, 0);
  const net = addedTotal - removedTotal;

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Imprevistos da Execução", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Tipo", "Partnumber", "Descrição", "Qtde.", "Preço Unit.", "Custo"]],
      body: incidents.map((it) => [
        it.kind === "adicionado" ? "Adicionado" : "Removido",
        it.part_number || "",
        it.description,
        String(it.quantity ?? ""),
        currency(it.unit_price),
        currency(it.cost),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [1, 45, 43] },
      margin: { left: 14, right: 14 },
    });

    let y = finalY(doc) + 8;
    doc.setFontSize(12);
    doc.text(`Adicionado: ${currency(addedTotal)}`, 14, y);
    y += 6;
    doc.text(`Removido: ${currency(removedTotal)}`, 14, y);
    y += 6;
    doc.text(`Impacto líquido: ${currency(net)}`, 14, y);
    doc.save(`imprevistos-${caseId}.pdf`);
  }

  return (
    <div className="space-y-2 text-xs">
      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-md border px-3 py-1.5 text-xs hover:bg-ekotruck-darkGreen/5"
      >
        📄 Baixar PDF dos imprevistos
      </button>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full">
          <tbody>
            {incidents.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      it.kind === "adicionado" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {it.kind === "adicionado" ? "Adicionado" : "Removido"}
                  </span>
                </td>
                <td className="px-2 py-1">{it.part_number}</td>
                <td className="px-2 py-1">{it.description}</td>
                <td className="px-2 py-1">{it.quantity}</td>
                <td className="px-2 py-1">{currency(it.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-right font-semibold">
        Impacto líquido:{" "}
        <span className={net > 0 ? "text-red-600" : net < 0 ? "text-emerald-700" : ""}>{currency(net)}</span>
      </div>
    </div>
  );
}

export function StageDetails({ caseId, stage }: { caseId: string; stage: CaseStatus }) {
  if (stage === "inspecao_mecanica_em_andamento") return <MechanicalSummary caseId={caseId} />;
  if (stage === "vistoria_em_andamento") return <InspectionSummary caseId={caseId} />;
  if (stage === "orcamento_unificado") return <UnifiedBudgetSummary caseId={caseId} />;
  if (stage === "em_otimizacao") return <OptimizationSummary caseId={caseId} />;
  if (stage === "em_execucao") return <ExecutionSummary caseId={caseId} />;
  return null;
}
