"use client";

import { useMemo, useState } from "react";
import { PartReportRow } from "@/lib/data";
import { PartsReportExport } from "./PartsReportExport";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PartsReportClient({ rows }: { rows: PartReportRow[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    // dateTo é inclusivo até o fim do dia escolhido.
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return rows.filter((r) => {
      const created = new Date(r.createdAt);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo]);

  const approved = filteredRows.filter((r) => r.approved);
  const removed = filteredRows.filter((r) => !r.approved);
  const optimized = approved.filter((r) => r.brand !== "scania" || r.outsourced);
  const notOptimized = approved.filter((r) => r.brand === "scania" && !r.outsourced);

  const valueRemoved = removed.reduce((s, r) => s + (r.originalCost ?? r.cost), 0);
  const valueOptimizedSavings = optimized.reduce((s, r) => s + ((r.originalCost ?? r.cost) - r.cost), 0);
  const valueNotOptimized = notOptimized.reduce((s, r) => s + r.cost, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Período — de</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">até</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-ekotruck-gray hover:underline"
          >
            limpar período
          </button>
        )}
        <span className="ml-auto text-xs text-ekotruck-gray">
          {filteredRows.length} de {rows.length} item(ns)
        </span>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <PartsReportExport rows={filteredRows} />
      </div>

      {filteredRows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-ekotruck-gray">
          Nenhum item de moderação/otimização no período selecionado.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-ekotruck-gray">Removidas na moderação</p>
            <p className="text-lg font-semibold">{removed.length} item(ns)</p>
            <p className="text-sm text-ekotruck-gray">{currency(valueRemoved)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-ekotruck-gray">Otimizadas (outra marca/oficina)</p>
            <p className="text-lg font-semibold">{optimized.length} item(ns)</p>
            <p className="text-sm text-emerald-600">Economia: {currency(valueOptimizedSavings)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-xs text-ekotruck-gray">Não otimizadas (ainda Scania)</p>
            <p className="text-lg font-semibold">{notOptimized.length} item(ns)</p>
            <p className="text-sm text-red-600">{currency(valueNotOptimized)} — priorizar</p>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-ekotruck-gray">
        Baixe o Excel para a visão detalhada por peça (quantidade e valores, agrupados por partnumber) e por caso —
        respeitando o período selecionado acima.
      </p>
    </div>
  );
}
