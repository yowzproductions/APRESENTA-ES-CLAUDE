import { ReturnCase } from "@/types/domain";
import { StatusBadge } from "./StatusBadge";

// Visão compacta: uma linha por caso, só o essencial para achar rápido
// (placa ou chassi, cliente, filial, status).
export function ListView({ cases }: { cases: ReturnCase[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Placa / Chassi</th>
            <th className="px-4 py-2">Cliente</th>
            <th className="px-4 py-2">Filial</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-t hover:bg-neutral-50">
              <td className="px-4 py-2">
                <a href={`/casos/${c.id}`} className="font-medium hover:underline">
                  {c.vehiclePlate}
                </a>
                {c.vehicleChassis && (
                  <span className="ml-2 text-xs text-neutral-400">{c.vehicleChassis}</span>
                )}
              </td>
              <td className="px-4 py-2">{c.clientName}</td>
              <td className="px-4 py-2 text-neutral-500">{c.branchName ?? "—"}</td>
              <td className="px-4 py-2">
                <StatusBadge status={c.status} />
              </td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                Nenhum caso encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
