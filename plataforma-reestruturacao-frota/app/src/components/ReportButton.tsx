"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReturnCase } from "@/types/domain";
import { LABELS } from "./StatusBadge";

function currency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function ReportButton({ cases }: { cases: ReturnCase[] }) {
  function downloadReport() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Relatório de Casos — Reestruturação de Frota", 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — ${cases.length} caso(s)`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Placa",
          "Modelo",
          "Cliente",
          "Filial",
          "Etapa atual",
          "Orçamento base",
          "Valores otimizados",
          "Economia",
          "Imprevistos",
          "Conta final",
        ],
      ],
      body: cases.map((c) => {
        const savings = c.baseTotal != null && c.finalTotal != null ? c.baseTotal - c.finalTotal : null;
        const vehicleAccountTotal = c.finalTotal != null ? c.finalTotal + (c.incidentsNet ?? 0) : null;
        return [
          c.vehiclePlate,
          c.vehicleModel,
          c.clientName,
          c.branchName || "-",
          LABELS[c.status],
          currency(c.baseTotal),
          currency(c.finalTotal),
          currency(savings),
          currency(c.incidentsNet),
          currency(vehicleAccountTotal),
        ];
      }),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [1, 45, 43] },
      margin: { left: 14, right: 14 },
    });

    let y = finalY(doc) + 10;
    const totalBase = cases.reduce((s, c) => s + (c.baseTotal ?? 0), 0);
    const totalFinal = cases.reduce((s, c) => s + (c.finalTotal ?? 0), 0);
    const totalSavings = cases.reduce(
      (s, c) => s + (c.baseTotal != null && c.finalTotal != null ? c.baseTotal - c.finalTotal : 0),
      0
    );
    const totalIncidents = cases.reduce((s, c) => s + (c.incidentsNet ?? 0), 0);

    doc.setFontSize(11);
    doc.text("Resumo geral", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Total de casos: ${cases.length}`, 14, y);
    y += 5;
    doc.text(`Orçamento base (soma): ${currency(totalBase)}`, 14, y);
    y += 5;
    doc.text(`Valores otimizados (soma): ${currency(totalFinal)}`, 14, y);
    y += 5;
    doc.text(`Economia (soma): ${currency(totalSavings)}`, 14, y);
    y += 5;
    doc.text(`Imprevistos (soma líquida): ${currency(totalIncidents)}`, 14, y);

    doc.save(`relatorio-casos-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <button
      type="button"
      disabled={cases.length === 0}
      onClick={downloadReport}
      className="rounded-md border border-ekotruck-darkGreen/20 px-4 py-2 text-sm font-medium text-ekotruck-darkGreen hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
    >
      📊 Emitir relatório
    </button>
  );
}
