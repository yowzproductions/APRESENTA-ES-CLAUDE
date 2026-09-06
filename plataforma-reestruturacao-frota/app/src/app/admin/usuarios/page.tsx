import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./InviteForm";

const ROLE_LABELS: Record<string, string> = {
  comercial: "Comercial",
  vistoriador: "Vistoriador",
  mecanica: "Mecânica",
  moderador: "Moderador",
  execucao: "Execução",
  gestor: "Gestor",
  admin: "Admin",
};

export default async function AdminUsuarios() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 text-center">
        <p className="text-sm text-ekotruck-gray">
          Esta página é restrita a administradores.
        </p>
      </div>
    );
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, invited_at")
    .order("invited_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Usuários</h1>
      <p className="mb-6 text-sm text-ekotruck-gray">
        Crie o acesso de qualquer pessoa por e-mail (não precisa ser de um domínio específico) com uma senha
        padrão gerada na hora — ela troca a senha no primeiro login e, se esquecer depois, recupera pelo próprio
        e-mail. Escolha também o que cada pessoa pode ver ou editar em cada etapa do workflow.
      </p>

      <InviteForm />

      <div className="mt-8 overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-ekotruck-darkGreen/5 text-left text-xs uppercase text-ekotruck-gray">
            <tr>
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Papel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Convidado em</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.full_name}</td>
                <td className="px-4 py-2">
                  {p.role ? ROLE_LABELS[p.role] ?? p.role : "—"}
                </td>
                <td className="px-4 py-2 capitalize">{p.status}</td>
                <td className="px-4 py-2 text-ekotruck-gray">
                  {p.invited_at ? new Date(p.invited_at).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ekotruck-gray">
                  Nenhum usuário ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
