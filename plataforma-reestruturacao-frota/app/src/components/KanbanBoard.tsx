import { ProcessType, ReturnCase, getStageOrder } from "@/types/domain";
import { StatusBadge } from "./StatusBadge";

function isOverdue(dueAt: string | null) {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

function statusToStageIndex(status: ReturnCase["status"], stageOrder: { status: string; label: string }[]) {
  const idx = stageOrder.findIndex((s) => s.status === status);
  if (idx !== -1) return idx;
  // status intermediários (ex.: *_concluida) caem na etapa correspondente,
  // quando ela existir no fluxo deste tipo de processo.
  const fallback = (target: string) => {
    const i = stageOrder.findIndex((s) => s.status === target);
    return i !== -1 ? i : 0;
  };
  if (status.startsWith("vistoria")) return fallback("vistoria_em_andamento");
  if (status.startsWith("inspecao_mecanica")) return fallback("inspecao_mecanica_em_andamento");
  if (status.startsWith("aprovado") || status.startsWith("reprovado")) return fallback("aguardando_aprovacao_cliente");
  if (status.startsWith("otimizacao")) return fallback("em_otimizacao");
  return 0;
}

export function KanbanBoard({ cases, processType }: { cases: ReturnCase[]; processType: ProcessType }) {
  const stageOrder = getStageOrder(processType);
  const columns = stageOrder.map((stage, i) => ({
    ...stage,
    cases: cases.filter((c) => statusToStageIndex(c.status, stageOrder) === i),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.status} className="w-72 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-ekotruck-darkGreen">{col.label}</h3>
            <span className="text-xs text-ekotruck-gray">{col.cases.length}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-ekotruck-darkGreen/5 p-2 min-h-[120px]">
            {col.cases.map((c) => (
              <a
                key={c.id}
                href={`/casos/${c.id}`}
                className="block rounded-md border border-ekotruck-darkGreen/10 bg-white p-3 shadow-sm hover:border-ekotruck-orange"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.vehiclePlate}</span>
                  {isOverdue(c.dueAt) && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      ATRASADO
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ekotruck-gray">{c.vehicleModel}</p>
                <p className="text-xs text-ekotruck-gray">{c.clientName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={c.status} />
                  {c.dueAt && (
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isOverdue(c.dueAt) ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      🚩 Agendado: {new Date(c.dueAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </a>
            ))}
            {col.cases.length === 0 && (
              <p className="px-1 py-4 text-center text-xs text-ekotruck-gray">
                Nenhum caso
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
