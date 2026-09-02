import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "./ClientForm";

export default async function Clientes() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, document, contact_name, contact_phone, contact_email, created_at")
    .order("name");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ekotruck-darkGreen">
        Clientes / Frotas
      </h1>
      <p className="mb-6 text-sm text-ekotruck-gray">
        Cadastre uma vez e reutilize na abertura de cada caso — evita duplicar
        cliente a cada devolução.
      </p>

      <ClientForm />

      <div className="mt-8 overflow-hidden rounded-lg border border-ekotruck-darkGreen/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ekotruck-darkGreen/5 text-left text-xs uppercase text-ekotruck-gray">
            <tr>
              <th className="px-4 py-2">Nome / Razão social</th>
              <th className="px-4 py-2">CNPJ/CPF</th>
              <th className="px-4 py-2">Contato</th>
              <th className="px-4 py-2">Telefone</th>
              <th className="px-4 py-2">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr key={c.id} className="border-t border-ekotruck-darkGreen/10">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{c.document ?? "—"}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{c.contact_name ?? "—"}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{c.contact_phone ?? "—"}</td>
                <td className="px-4 py-2 text-ekotruck-gray">{c.contact_email ?? "—"}</td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ekotruck-gray">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
