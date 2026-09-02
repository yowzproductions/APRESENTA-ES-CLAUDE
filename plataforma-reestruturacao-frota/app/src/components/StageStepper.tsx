"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CaseStatus, STAGE_ORDER } from "@/types/domain";
import { StageProgress, StageState } from "@/lib/data";

const STATE_LABEL: Record<StageState, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  nao_se_aplica: "Não se aplica",
};

const STATE_COLOR: Record<StageState, string> = {
  pendente: "bg-neutral-200 text-neutral-600",
  em_andamento: "bg-ekotruck-orange/15 text-ekotruck-orange",
  concluido: "bg-emerald-100 text-emerald-700",
  nao_se_aplica: "bg-neutral-200 text-neutral-500",
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-BR");
}

export function StageStepper({
  caseId,
  progress,
}: {
  caseId: string;
  progress: Record<string, StageProgress>;
}) {
  const router = useRouter();
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [dueDrafts, setDueDrafts] = useState<Record<string, string>>({});

  // Etapa 0 (cadastro) é implicitamente concluída pela própria existência do
  // caso — não exige linha em case_stage_progress.
  const effective = (stage: string, index: number): StageState => {
    if (index === 0 && !progress[stage]) return "concluido";
    return progress[stage]?.state ?? "pendente";
  };

  const activeIndex = STAGE_ORDER.findIndex(
    (s, i) => !["concluido", "nao_se_aplica"].includes(effective(s.status, i))
  );

  async function updateStage(
    stage: CaseStatus,
    index: number,
    state: "concluido" | "nao_se_aplica",
    dueAtOverride?: string
  ) {
    setBusyStage(stage);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const dueAt = dueAtOverride ?? dueDrafts[stage] ?? progress[stage]?.dueAt ?? null;

    await supabase.from("case_stage_progress").upsert(
      {
        case_id: caseId,
        stage,
        state,
        due_at: dueAt || null,
        completed_at: new Date().toISOString(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id,stage" }
    );

    const next = STAGE_ORDER[index + 1];
    if (next) {
      await supabase
        .from("return_cases")
        .update({ status: next.status })
        .eq("id", caseId);

      await supabase.from("case_status_history").insert({
        case_id: caseId,
        to_status: next.status,
        changed_by: user?.id,
        notes:
          state === "nao_se_aplica"
            ? `Etapa "${STAGE_ORDER[index].label}" marcada como não se aplica.`
            : `Etapa "${STAGE_ORDER[index].label}" concluída.`,
      });
    }

    await supabase.from("activity_log").insert({
      case_id: caseId,
      actor_id: user?.id,
      actor_email: user?.email,
      action: state === "nao_se_aplica" ? "etapa_nao_se_aplica" : "etapa_concluida",
      description:
        state === "nao_se_aplica"
          ? `Marcou a etapa "${STAGE_ORDER[index].label}" como não se aplica.`
          : `Concluiu a etapa "${STAGE_ORDER[index].label}".`,
    });

    setBusyStage(null);
    router.refresh();
  }

  async function saveDueDate(stage: string) {
    setBusyStage(stage);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("case_stage_progress").upsert(
      {
        case_id: caseId,
        stage,
        state: progress[stage]?.state ?? "em_andamento",
        due_at: dueDrafts[stage] || null,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id,stage" }
    );

    setBusyStage(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {STAGE_ORDER.map((s, i) => {
        const state = effective(s.status, i);
        const isActive = i === activeIndex;
        const isLocked = activeIndex !== -1 && i > activeIndex;
        const p = progress[s.status];

        if (state === "concluido" || state === "nao_se_aplica") {
          return (
            <div
              key={s.status}
              className="flex items-center justify-between rounded-lg border border-ekotruck-darkGreen/10 bg-white px-4 py-3"
            >
              <div>
                <span className="font-medium">{s.label}</span>
                {p?.dueAt && (
                  <span className="ml-2 text-xs text-ekotruck-gray">
                    prazo: {fmt(p.dueAt)}
                  </span>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_COLOR[state]}`}
              >
                {STATE_LABEL[state]}
              </span>
            </div>
          );
        }

        if (isLocked) {
          return (
            <div
              key={s.status}
              className="flex items-center justify-between rounded-lg border border-dashed border-ekotruck-darkGreen/15 bg-ekotruck-darkGreen/5 px-4 py-3 text-ekotruck-gray"
            >
              <span>{s.label}</span>
              <span className="text-xs">Aguardando etapas anteriores</span>
            </div>
          );
        }

        // etapa ativa e editável
        return (
          <div
            key={s.status}
            className="rounded-lg border-2 border-ekotruck-orange bg-white px-4 py-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-ekotruck-darkGreen">{s.label}</span>
              <span className="rounded-full bg-ekotruck-orange/15 px-2.5 py-0.5 text-xs font-medium text-ekotruck-orange">
                Etapa atual
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Prazo estimado</label>
                <input
                  type="datetime-local"
                  defaultValue={p?.dueAt ? p.dueAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setDueDrafts((d) => ({ ...d, [s.status]: e.target.value }))
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={busyStage === s.status}
                onClick={() => saveDueDate(s.status)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
              >
                Salvar prazo
              </button>

              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  disabled={busyStage === s.status}
                  onClick={() => updateStage(s.status, i, "nao_se_aplica")}
                  className="rounded-md border border-ekotruck-gray/40 px-3 py-2 text-sm text-ekotruck-gray hover:bg-ekotruck-darkGreen/5 disabled:opacity-50"
                >
                  Não se aplica
                </button>
                <button
                  type="button"
                  disabled={busyStage === s.status}
                  onClick={() => updateStage(s.status, i, "concluido")}
                  className="rounded-md bg-ekotruck-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busyStage === s.status ? "Salvando..." : "Concluir e avançar"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
