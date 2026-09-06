import { notFound } from "next/navigation";
import {
  getCaseActivity,
  getCaseById,
  getStageAttachments,
  getStageProgress,
} from "@/lib/data";
import { StatusBadge } from "@/components/StatusBadge";
import { StageStepper } from "@/components/StageStepper";

function currency(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CaseDetail({ params }: { params: { id: string } }) {
  const [c, activity, progress, stageAttachments] = await Promise.all([
    getCaseById(params.id),
    getCaseActivity(params.id),
    getStageProgress(params.id),
    getStageAttachments(params.id),
  ]);
  if (!c) notFound();

  const attachmentsByStage: Record<string, typeof stageAttachments> = {};
  for (const a of stageAttachments) {
    (attachmentsByStage[a.stage] ??= []).push(a);
  }

  const savings =
    c.baseTotal != null && c.finalTotal != null ? c.baseTotal - c.finalTotal : null;
  // Economia da moderação (itens desconsiderados) separada da economia obtida
  // depois, na precificação (troca de marca/oficina), sobre o que sobrou aprovado.
  const moderationSavings = c.moderationSavings;
  const afterModerationTotal =
    c.baseTotal != null && moderationSavings != null ? c.baseTotal - moderationSavings : null;
  const pricingSavings =
    afterModerationTotal != null && c.finalTotal != null ? afterModerationTotal - c.finalTotal : null;

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

      <div className="mb-8">
        <h2 className="mb-3 font-medium text-ekotruck-darkGreen">Progresso do caso</h2>
        <StageStepper caseId={c.id} progress={progress} attachments={attachmentsByStage} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Orçamento unificado</h2>
          <p className="text-sm text-ekotruck-gray">
            Preço base (checklist + inspeção mecânica, sem duplicidade):
          </p>
          <p className="mt-1 text-lg font-semibold">{currency(c.baseTotal)}</p>
        </section>

        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-medium">Otimização de orçamento — impacto</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-ekotruck-gray">Base</p>
              <p className="text-sm font-semibold">{currency(c.baseTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-ekotruck-gray">Final</p>
              <p className="text-sm font-semibold">{currency(c.finalTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-ekotruck-gray">Economia total</p>
              <p className="text-sm font-semibold text-emerald-600">{currency(savings)}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-center">
            <div>
              <p className="text-xs text-ekotruck-gray">Economia da moderação</p>
              <p className="text-sm font-semibold text-emerald-600">{currency(moderationSavings)}</p>
            </div>
            <div>
              <p className="text-xs text-ekotruck-gray">Economia da precificação</p>
              <p className="text-sm font-semibold text-emerald-600">{currency(pricingSavings)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 md:col-span-2">
          <h2 className="mb-3 font-medium">Histórico de movimentações</h2>
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  {a.stageLabel && (
                    <span className="mr-2 rounded-full bg-ekotruck-darkGreen/10 px-2 py-0.5 text-xs font-medium text-ekotruck-darkGreen">
                      {a.stageLabel}
                    </span>
                  )}
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
