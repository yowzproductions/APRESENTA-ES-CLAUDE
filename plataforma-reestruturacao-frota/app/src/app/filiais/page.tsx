import { createClient } from "@/lib/supabase/server";
import { BranchForm } from "./BranchForm";

export default async function Filiais() {
  const supabase = createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, city, state, created_at")
    .order("name");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ekotruck-darkGreen">Filiais</h1>
      <p className="mb-6 text-sm text-ekotruck-gray">
        Locais onde os casos são recebidos/atendidos — usados para segmentar o
        workflow por filial.
      </p>

      <BranchForm />

      <div className="mt-8 overflow-hidden rounded-lg border border-ekotruck-darkGreen/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ekotruck-darkGreen/5 text-left text-xs uppercase text-ekotruck-gray">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Cidade</th>
              <th className="px-4 py-2">UF</th>
            </tr>
          </thead>
          <tbody>
            {(branches ?? []).map((b) => (
              <tr key={b.id} className="border-t border-ekotruck-darkGreen/10">
                <td className="px-4 py-2 font-medium">{b.name}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{b.city ?? "—"}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{b.state ?? "—"}</td>
              </tr>
            ))}
            {(!branches || branches.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ekotruck-gray">
                  Nenhuma filial cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
