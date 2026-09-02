"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CaseStatus, STAGE_ORDER } from "@/types/domain";
import { StageAttachment, StageProgress, StageState } from "@/lib/data";

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

// Etapas que exigem anexo (ex.: laudo da vistoria) antes de poder concluir.
// Fácil de estender: basta adicionar a chave da etapa (CaseStatus) aqui.
const REQUIRES_ATTACHMENT: Partial<Record<CaseStatus, string>> = {
  vistoria_em_andamento: "Anexe o arquivo da vistoria realizada para concluir esta etapa.",
};

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-BR");
}

export function StageStepper({
  caseId,
  progress,
  attachments,
}: {
  caseId: string;
  progress: Record<string, StageProgress>;
  attachments: Record<string, StageAttachment[]>;
}) {
  const router = useRouter();
  const [busyStage, setBusyStage] = useState<string | null>(null);
  const [dueDrafts, setDueDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Etapa 0 (cadastro) é implicitamente concluída pela própria existência do
  // caso — não exige linha em case_stage_progress.
  const effective = (stage: string, index: number): StageState => {
    if (index === 0 && !progress[stage]) return "concluido";
    return progress[stage]?.state ?? "pendente";
  };

  const activeIndex = STAGE_ORDER.findIndex(
    (s, i) => !["concluido", "nao_se_aplica"].includes(effective(s.status, i))
  );

  async function openAttachment(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("case-attachments")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function updateStage(
    stage: CaseStatus,
    index: number,
    state: "concluido" | "nao_se_aplica"
  ) {
    setError(null);

    const requiredMessage = REQUIRES_ATTACHMENT[stage];
    const hasExisting = (attachments[stage]?.length ?? 0) > 0;
    const fileInput = fileInputRefs.current[stage];
    const file = fileInput?.files?.[0];

    if (state === "concluido" && requiredMessage && !hasExisting && !file) {
      setError(requiredMessage);
      return;
    }

    setBusyStage(stage);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (file) {
      const path = `${caseId}/${stage}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("case-attachments")
        .upload(path, file);
      if (upErr) {
        setError(upErr.message);
        setBusyStage(null);
        return;
      }
      await supabase.from("attachments").insert({
        related_table: "return_cases",
        related_id: caseId,
        stage,
        url: path,
        uploaded_by: user?.id,
      });
    }

    const dueAt = dueDrafts[stage] ?? progress[stage]?.dueAt ?? null;

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
          : `Concluiu a etapa "${STAGE_ORDER[index].label}"${file ? " (com anexo)" : ""}.`,
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
        const isLocked = activeIndex !== -1 && i > activeIndex;
        const p = progress[s.status];
        const stageFiles = attachments[s.status] ?? [];

        if (state === "concluido" || state === "nao_se_aplica") {
          return (
            <div
              key={s.status}
              className="rounded-lg border border-ekotruck-darkGreen/10 bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between">
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
              {stageFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {stageFiles.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => openAttachment(f.url)}
                      className="text-xs text-ekotruck-orange hover:underline"
                    >
                      📎 anexo ({new Date(f.uploadedAt).toLocaleDateString("pt-BR")})
                    </button>
                  ))}
                </div>
              )}
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
        const requiredMessage = REQUIRES_ATTACHMENT[s.status];

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

            {requiredMessage && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium">
                  Anexo da etapa {stageFiles.length > 0 ? "(já enviado, opcional trocar)" : "(obrigatório para concluir)"}
                </label>
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[s.status] = el;
                  }}
                  className="block text-sm"
                />
                {stageFiles.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {stageFiles.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => openAttachment(f.url)}
                        className="text-xs text-ekotruck-orange hover:underline"
                      >
                        📎 ver anexo atual
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {error && i === activeIndex && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
