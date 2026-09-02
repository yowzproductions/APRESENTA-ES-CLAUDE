import { ReturnCase } from "@/types/domain";
import { StatusBadge } from "./StatusBadge";

function isOverdue(dueAt: string | null) {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

// Visão compacta: uma linha por caso, só o essencial para achar rápido
// (placa ou chassi, cliente, filial, status, prazo da etapa atual).
export function ListView({ cases }: { cases: ReturnCase[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ekotruck-darkGreen/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-ekotruck-darkGreen/5 text-left text-xs uppercase text-ekotruck-gray">
          <tr>
            <th className="px-4 py-2">Placa / Chassi</th>
            <th className="px-4 py-2">Cliente</th>
            <th className="px-4 py-2">Filial</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Prazo da etapa</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-t border-ekotruck-darkGreen/10 hover:bg-ekotruck-light">
              <td className="px-4 py-2">
                <a href={`/casos/${c.id}`} className="font-medium hover:underline">
                  {c.vehiclePlate}
                </a>
                {c.vehicleChassis && (
                  <span className="ml-2 text-xs text-ekotruck-gray">{c.vehicleChassis}</span>
                )}
              </td>
              <td className="px-4 py-2">{c.clientName}</td>
              <td className="px-4 py-2 text-ekotruck-gray">{c.branchName ?? "—"}</td>
              <td className="px-4 py-2">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-2">
                {c.dueAt ? (
                  <span
                    className={
                      isOverdue(c.dueAt)
                        ? "rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700"
                        : "text-xs text-ekotruck-gray"
                    }
                  >
                    {new Date(c.dueAt).toLocaleString("pt-BR")}
                    {isOverdue(c.dueAt) && " · atrasado"}
                  </span>
                ) : (
                  <span className="text-xs text-ekotruck-gray">—</span>
                )}
              </td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-ekotruck-gray">
                Nenhum caso encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
