import { ReturnCase, STAGE_ORDER } from "@/types/domain";
import { StatusBadge } from "./StatusBadge";

function isOverdue(dueAt: string | null) {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

function statusToStageIndex(status: ReturnCase["status"]) {
  const idx = STAGE_ORDER.findIndex((s) => s.status === status);
  if (idx !== -1) return idx;
  // status intermediários (ex.: *_concluida) caem na etapa correspondente
  if (status.startsWith("vistoria")) return 2;
  if (status.startsWith("inspecao_mecanica")) return 3;
  if (status.startsWith("aprovado") || status.startsWith("reprovado")) return 5;
  if (status.startsWith("otimizacao")) return 6;
  return 0;
}

export function KanbanBoard({ cases }: { cases: ReturnCase[] }) {
  const columns = STAGE_ORDER.map((stage, i) => ({
    ...stage,
    cases: cases.filter((c) => statusToStageIndex(c.status) === i),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div key={col.status} className="w-72 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-neutral-700">{col.label}</h3>
            <span className="text-xs text-neutral-400">{col.cases.length}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-neutral-100 p-2 min-h-[120px]">
            {col.cases.map((c) => (
              <a
                key={c.id}
                href={`/casos/${c.id}`}
                className="block rounded-md border bg-white p-3 shadow-sm hover:border-ekotruck-orange"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.vehiclePlate}</span>
                  {isOverdue(c.dueAt) && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      ATRASADO
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{c.vehicleModel}</p>
                <p className="text-xs text-neutral-500">{c.clientName}</p>
                <div className="mt-2">
                  <StatusBadge status={c.status} />
                </div>
                {c.dueAt && (
                  <p className="mt-2 text-[11px] text-neutral-400">
                    Prazo: {new Date(c.dueAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </a>
            ))}
            {col.cases.length === 0 && (
              <p className="px-1 py-4 text-center text-xs text-neutral-400">
                Nenhum caso
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
