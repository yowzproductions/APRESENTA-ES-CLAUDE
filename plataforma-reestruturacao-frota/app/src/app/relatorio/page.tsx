import { getPartsReportRows } from "@/lib/data";
import { PartsReportClient } from "./PartsReportClient";

export default async function RelatorioPage() {
  const rows = await getPartsReportRows();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ekotruck-darkGreen">Relatório de Peças</h1>
        <p className="text-sm text-ekotruck-gray">
          Peças orçadas, moderadas e otimizadas em todos os casos — para priorizar onde desenvolver soluções.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-ekotruck-gray">
          Nenhum item de moderação/otimização registrado ainda.
        </p>
      ) : (
        <PartsReportClient rows={rows} />
      )}
    </div>
  );
}
