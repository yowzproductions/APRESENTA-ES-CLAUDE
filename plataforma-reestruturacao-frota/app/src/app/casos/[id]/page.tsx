import { notFound } from "next/navigation";
import { getCaseActivity, getCaseById } from "@/lib/data";
import { StatusBadge } from "@/components/StatusBadge";
import { STAGE_ORDER } from "@/types/domain";

function currency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CaseDetail({ params }: { params: { id: string } }) {
  const [c, activity] = await Promise.all([
    getCaseById(params.id),
    getCaseActivity(params.id),
  ]);
  if (!c) notFound();

  const savings =
    c.baseTotal != null && c.finalTotal != null ? c.baseTotal - c.finalTotal : null;

  return (
    <div>
      <div className="mb-6">
        <a href="/" className="text-sm text-ekotruck-gray hover:text-ekotruck-darkGreen">
          ← Voltar ao workflow
        </a>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {c.vehiclePlate} — {c.vehicleModel}
            </h1>
            <p className="text-sm text-ekotruck-gray">Cliente: {c.clientName}</p>
          </div>
          <StatusBadge status={c.status} />
        </div>
      </div>

      {/* Linha do tempo das etapas */}
      <div className="mb-8 flex items-center gap-1 overflow-x-auto rounded-lg border bg-white p-4">
        {STAGE_ORDER.map((stage, i) => (
          <div key={stage.status} className="flex items-center">
            <span className="whitespace-nowrap rounded-full border px-3 py-1 text-xs text-ekotruck-gray">
              {stage.label}
            </span>
            {i < STAGE_ORDER.length - 1 && (
              <span className="mx-1 text-neutral-300">→</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Agendamento</h2>
          <p className="text-sm text-ekotruck-gray">
            Data de recebimento:{" "}
            {c.scheduledAt
              ? new Date(c.scheduledAt).toLocaleString("pt-BR")
              : "ainda não agendado"}
          </p>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Vistoria de recebimento</h2>
          <p className="text-sm text-ekotruck-gray">
            Checklist com avarias, custo estimado e assinatura do responsável pela
            entrega. (itens ficam em <code>inspection_checklists</code> /{" "}
            <code>checklist_items</code>)
          </p>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Inspeção mecânica</h2>
          <p className="text-sm text-ekotruck-gray">
            Orçamento técnico da oficina. (<code>mechanical_inspections</code> /{" "}
            <code>mechanical_items</code>)
          </p>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Orçamento unificado</h2>
          <p className="text-sm text-ekotruck-gray">
            Preço base (checklist + inspeção mecânica, sem duplicidade):
          </p>
          <p className="mt-1 text-lg font-semibold">{currency(c.baseTotal)}</p>
        </section>

        <section className="rounded-lg border bg-white p-4 md:col-span-2">
          <h2 className="mb-2 font-medium">Otimização de orçamento — impacto</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-ekotruck-gray">Orçamento base</p>
              <p className="text-lg font-semibold">{currency(c.baseTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-ekotruck-gray">Orçamento final</p>
              <p className="text-lg font-semibold">{currency(c.finalTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-ekotruck-gray">Economia gerada</p>
              <p className="text-lg font-semibold text-emerald-600">
                {currency(savings)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ekotruck-gray">
            Histórico de itens removidos (com responsável + justificativa) e de
            peças substituídas (original × substituta, marca, preço, origem
            estoque Ekotruck/Spot e fornecedor) fica em{" "}
            <code>optimization_removed_items</code> e{" "}
            <code>optimization_part_substitutions</code>.
          </p>
        </section>

        <section className="rounded-lg border bg-white p-4 md:col-span-2">
          <h2 className="mb-2 font-medium">Execução dos serviços</h2>
          <p className="text-sm text-ekotruck-gray">
            Acompanhamento por item (interno/externo), com prazo e status, em{" "}
            <code>service_executions</code>.
          </p>
        </section>

        <section className="rounded-lg border bg-white p-4 md:col-span-2">
          <h2 className="mb-3 font-medium">Histórico de movimentações</h2>
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <span className="text-ekotruck-darkGreen">{a.description}</span>
                  {a.actorEmail && (
                    <span className="ml-2 text-xs text-ekotruck-gray">por {a.actorEmail}</span>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-ekotruck-gray">
                  {new Date(a.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="text-sm text-ekotruck-gray">Nenhuma movimentação registrada ainda.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
