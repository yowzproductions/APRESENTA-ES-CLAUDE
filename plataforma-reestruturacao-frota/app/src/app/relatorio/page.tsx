import { getPartsReportRows } from "@/lib/data";
import { PartsReportExport } from "./PartsReportExport";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RelatorioPage() {
  const rows = await getPartsReportRows();

  const approved = rows.filter((r) => r.approved);
  const removed = rows.filter((r) => !r.approved);
  const optimized = approved.filter((r) => r.brand !== "scania" || r.outsourced);
  const notOptimized = approved.filter((r) => r.brand === "scania" && !r.outsourced);

  const valueRemoved = removed.reduce((s, r) => s + (r.originalCost ?? r.cost), 0);
  const valueOptimizedSavings = optimized.reduce((s, r) => s + ((r.originalCost ?? r.cost) - r.cost), 0);
  const valueNotOptimized = notOptimized.reduce((s, r) => s + r.cost, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ekotruck-darkGreen">Relatório de Peças</h1>
          <p className="text-sm text-ekotruck-gray">
            Peças orçadas, moderadas e otimizadas em todos os casos — para priorizar onde desenvolver soluções.
          </p>
        </div>
        <PartsReportExport rows={rows} />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-ekotruck-gray">
          Nenhum item de moderação/otimização registrado ainda.
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
        Baixe o Excel para a visão detalhada por peça (quantidade e valores, agrupados por partnumber) e por caso.
      </p>
    </div>
  );
}
