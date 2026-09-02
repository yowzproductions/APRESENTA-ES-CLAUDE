import { getCases } from "@/lib/data";

function currency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function Impacto() {
  const cases = await getCases();
  const withBudget = cases.filter((c) => c.baseTotal != null);

  const totalBase = withBudget.reduce((s, c) => s + (c.baseTotal ?? 0), 0);
  const totalFinal = withBudget.reduce(
    (s, c) => s + (c.finalTotal ?? c.baseTotal ?? 0),
    0
  );
  const totalSavings = totalBase - totalFinal;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Impacto financeiro da moderação</h1>
      <p className="mb-6 text-sm text-ekotruck-gray">
        Comparativo entre orçamento base (checklist + inspeção mecânica) e
        orçamento final (pós-otimização).
      </p>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-ekotruck-gray">Total orçamento base</p>
          <p className="text-lg font-semibold">{currency(totalBase)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-ekotruck-gray">Total orçamento final</p>
          <p className="text-lg font-semibold">{currency(totalFinal)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 text-center">
          <p className="text-xs text-ekotruck-gray">Economia total</p>
          <p className="text-lg font-semibold text-emerald-600">
            {currency(totalSavings)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ekotruck-darkGreen/5 text-left text-xs uppercase text-ekotruck-gray">
            <tr>
              <th className="px-4 py-2">Placa</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Base</th>
              <th className="px-4 py-2">Final</th>
              <th className="px-4 py-2">Economia</th>
            </tr>
          </thead>
          <tbody>
            {withBudget.map((c) => {
              const savings =
                c.finalTotal != null ? (c.baseTotal ?? 0) - c.finalTotal : null;
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">
                    <a href={`/casos/${c.id}`} className="hover:underline">
                      {c.vehiclePlate}
                    </a>
                  </td>
                  <td className="px-4 py-2">{c.clientName}</td>
                  <td className="px-4 py-2">{currency(c.baseTotal)}</td>
                  <td className="px-4 py-2">{currency(c.finalTotal)}</td>
                  <td className="px-4 py-2 text-emerald-600">
                    {savings != null ? currency(savings) : "em andamento"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
