import { getCases } from "@/lib/data";
import { KanbanBoard } from "@/components/KanbanBoard";

export default async function Home() {
  const cases = await getCases();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workflow de devolução de frota</h1>
          <p className="text-sm text-neutral-500">
            {cases.length} caso(s) em andamento — arraste a visão por etapa
          </p>
        </div>
        <a
          href="/novo"
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo caso
        </a>
      </div>
      <KanbanBoard cases={cases} />
    </div>
  );
}
