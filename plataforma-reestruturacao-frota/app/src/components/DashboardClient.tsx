"use client";

import { useMemo, useState } from "react";
import { FilterOption, ReturnCase } from "@/types/domain";
import { KanbanBoard } from "./KanbanBoard";
import { ListView } from "./ListView";

export function DashboardClient({
  cases,
  clients,
  branches,
}: {
  cases: ReturnCase[];
  clients: FilterOption[];
  branches: FilterOption[];
}) {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [clientId, setClientId] = useState("");
  const [branchId, setBranchId] = useState("");

  const filtered = useMemo(
    () =>
      cases.filter(
        (c) =>
          (!clientId || c.clientId === clientId) &&
          (!branchId || c.branchId === branchId)
      ),
    [cases, clientId, branchId]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Workflow de devolução de frota</h1>
          <p className="text-sm text-neutral-500">
            {filtered.length} caso(s) — {view === "kanban" ? "visão por etapa" : "lista compacta"}
          </p>
        </div>
        <a
          href="/novo"
          className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo caso
        </a>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          <button
            onClick={() => setView("kanban")}
            className={`rounded px-3 py-1.5 ${
              view === "kanban" ? "bg-ekotruck-orange text-white" : "text-neutral-600"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("lista")}
            className={`rounded px-3 py-1.5 ${
              view === "lista" ? "bg-ekotruck-orange text-white" : "text-neutral-600"
            }`}
          >
            Lista
          </button>
        </div>

        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">Todas as filiais</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {view === "kanban" ? <KanbanBoard cases={filtered} /> : <ListView cases={filtered} />}
    </div>
  );
}
