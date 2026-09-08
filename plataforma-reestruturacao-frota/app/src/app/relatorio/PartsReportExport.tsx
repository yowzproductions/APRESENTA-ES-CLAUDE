"use client";

import * as XLSX from "xlsx";
import { PartReportRow } from "@/lib/data";

function brandLabel(b: string) {
  if (b === "ekotruck") return "Ekotruck";
  if (b === "ekotruck_spot") return "Ekotruck Spot";
  return "Scania Original";
}

function partKey(row: PartReportRow) {
  return row.partNumber.trim() || `desc:${row.description.trim().toLowerCase()}`;
}

export function PartsReportExport({ rows }: { rows: PartReportRow[] }) {
  function downloadExcel() {
    const approvedRows = rows.filter((r) => r.approved);
    const removedRows = rows.filter((r) => !r.approved);
    const optimizedRows = approvedRows.filter((r) => r.brand !== "scania" || r.outsourced);
    const notOptimizedRows = approvedRows.filter((r) => r.brand === "scania" && !r.outsourced);

    // Resumo por peça: agrupa por partnumber (ou descrição, se não tiver
    // partnumber) para dar a visão de priorização por quantidade e valor.
    const groups = new Map<
      string,
      {
        partNumber: string;
        description: string;
        productLine: string;
        timesQuoted: number;
        totalQuantityQuoted: number;
        totalValueQuoted: number;
        timesRemoved: number;
        totalValueRemoved: number;
        timesOptimized: number;
        totalSavingsOptimized: number;
        timesNotOptimized: number;
        totalValueNotOptimized: number;
      }
    >();

    for (const r of rows) {
      const key = partKey(r);
      if (!groups.has(key)) {
        groups.set(key, {
          partNumber: r.partNumber || "-",
          description: r.description,
          productLine: r.productLine,
          timesQuoted: 0,
          totalQuantityQuoted: 0,
          totalValueQuoted: 0,
          timesRemoved: 0,
          totalValueRemoved: 0,
          timesOptimized: 0,
          totalSavingsOptimized: 0,
          timesNotOptimized: 0,
          totalValueNotOptimized: 0,
        });
      }
      const g = groups.get(key)!;
      g.timesQuoted += 1;
      g.totalQuantityQuoted += r.quantity;
      g.totalValueQuoted += r.originalCost ?? r.cost;

      if (!r.approved) {
        g.timesRemoved += 1;
        g.totalValueRemoved += r.originalCost ?? r.cost;
      } else if (r.brand !== "scania" || r.outsourced) {
        g.timesOptimized += 1;
        g.totalSavingsOptimized += (r.originalCost ?? r.cost) - r.cost;
      } else {
        g.timesNotOptimized += 1;
        g.totalValueNotOptimized += r.cost;
      }
    }

    const summarySheet = Array.from(groups.values())
      .sort((a, b) => b.totalValueNotOptimized - a.totalValueNotOptimized)
      .map((g) => ({
        Partnumber: g.partNumber,
        Descrição: g.description,
        Linha: g.productLine,
        "Qtde de orçamentos": g.timesQuoted,
        "Quantidade total orçada": g.totalQuantityQuoted,
        "Valor total orçado": g.totalValueQuoted,
        "Vezes removida na moderação": g.timesRemoved,
        "Valor removido na moderação": g.totalValueRemoved,
        "Vezes otimizada (outra marca/oficina)": g.timesOptimized,
        "Economia total obtida": g.totalSavingsOptimized,
        "Vezes NÃO otimizada (ainda Scania)": g.timesNotOptimized,
        "Valor total ainda em Scania (priorizar)": g.totalValueNotOptimized,
      }));

    const detailSheet = rows.map((r) => ({
      Placa: r.vehiclePlate,
      Cliente: r.clientName,
      Tarefa: r.taskNumber != null ? `Tarefa ${r.taskNumber}${r.taskName ? ` — ${r.taskName}` : ""}` : r.taskName,
      Origem: r.sourceLabel,
      Linha: r.productLine,
      Partnumber: r.partNumber,
      Descrição: r.description,
      Quantidade: r.quantity,
      "Preço Unit.": r.unitPrice,
      "Custo atual": r.cost,
      "Custo original": r.originalCost,
      "Status moderação": r.approved ? "Aprovado" : "Desconsiderado",
      "Motivo (se desconsiderado)": r.justification || "",
      Marca: brandLabel(r.brand),
      "Fornecedor/Origem": r.supplier || "",
      Terceirizado: r.outsourced ? "Sim" : "Não",
      "Oficina terceirizada": r.outsourcedTo || "",
      "Economia (custo original - atual)": r.originalCost != null ? r.originalCost - r.cost : "",
    }));

    const removedSheet = removedRows.map((r) => ({
      Placa: r.vehiclePlate,
      Cliente: r.clientName,
      Partnumber: r.partNumber,
      Descrição: r.description,
      Linha: r.productLine,
      Quantidade: r.quantity,
      "Valor (orçamento original)": r.originalCost ?? r.cost,
      Motivo: r.justification || "",
    }));

    const optimizedSheet = optimizedRows.map((r) => ({
      Placa: r.vehiclePlate,
      Cliente: r.clientName,
      Partnumber: r.partNumber,
      Descrição: r.description,
      Linha: r.productLine,
      Quantidade: r.quantity,
      Marca: brandLabel(r.brand),
      "Fornecedor/Origem": r.supplier || "",
      Terceirizado: r.outsourced ? "Sim" : "Não",
      "Oficina terceirizada": r.outsourcedTo || "",
      "Custo original": r.originalCost,
      "Custo otimizado": r.cost,
      Economia: r.originalCost != null ? r.originalCost - r.cost : "",
    }));

    const notOptimizedSheet = notOptimizedRows
      .sort((a, b) => b.cost - a.cost)
      .map((r) => ({
        Placa: r.vehiclePlate,
        Cliente: r.clientName,
        Partnumber: r.partNumber,
        Descrição: r.description,
        Linha: r.productLine,
        Quantidade: r.quantity,
        "Preço Unit.": r.unitPrice,
        "Custo (ainda Scania)": r.cost,
      }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "Resumo por peça");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notOptimizedSheet), "Não otimizadas (priorizar)");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(optimizedSheet), "Otimizadas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(removedSheet), "Removidas na moderação");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailSheet), "Detalhe completo");

    XLSX.writeFile(wb, `relatorio-pecas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      type="button"
      disabled={rows.length === 0}
      onClick={downloadExcel}
      className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
    >
      📊 Baixar Excel
    </button>
  );
}
