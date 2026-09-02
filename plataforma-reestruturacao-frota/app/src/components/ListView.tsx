import { ReturnCase } from "@/types/domain";
import { StatusBadge } from "./StatusBadge";

// Visão compacta: uma linha por caso, só o essencial para achar rápido
// (placa ou chassi, cliente, filial, status).
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
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-ekotruck-gray">
                Nenhum caso encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
