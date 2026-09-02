import { createClient } from "@/lib/supabase/server";
import { CaseStatus, FilterOption, ReturnCase } from "@/types/domain";

export async function getCases(): Promise<ReturnCase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("return_cases")
    .select(
      `id, status, scheduled_at, client_id, branch_id,
       vehicles ( plate, chassis, model ),
       clients ( name ),
       branches ( name ),
       unified_budgets ( base_total ),
       budget_optimizations ( final_total )`
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    vehiclePlate: row.vehicles?.plate ?? "—",
    vehicleChassis: row.vehicles?.chassis ?? null,
    vehicleModel: row.vehicles?.model ?? "—",
    clientId: row.client_id,
    clientName: row.clients?.name ?? "—",
    branchId: row.branch_id,
    branchName: row.branches?.name ?? null,
    status: row.status as CaseStatus,
    scheduledAt: row.scheduled_at,
    dueAt: null,
    baseTotal: row.unified_budgets?.[0]?.base_total ?? null,
    finalTotal: row.budget_optimizations?.[0]?.final_total ?? null,
  }));
}

export async function getCaseById(id: string): Promise<ReturnCase | undefined> {
  const cases = await getCases();
  return cases.find((c) => c.id === id);
}

export type StageState = "pendente" | "em_andamento" | "concluido" | "nao_se_aplica";

export interface StageProgress {
  stage: string;
  state: StageState;
  dueAt: string | null;
  completedAt: string | null;
}

export async function getStageProgress(caseId: string): Promise<Record<string, StageProgress>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("case_stage_progress")
    .select("stage, state, due_at, completed_at")
    .eq("case_id", caseId);

  const map: Record<string, StageProgress> = {};
  for (const row of data ?? []) {
    map[row.stage] = {
      stage: row.stage,
      state: row.state,
      dueAt: row.due_at,
      completedAt: row.completed_at,
    };
  }
  return map;
}

export async function getClientOptions(): Promise<FilterOption[]> {
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("id, name").order("name");
  return data ?? [];
}

export async function getBranchOptions(): Promise<FilterOption[]> {
  const supabase = createClient();
  const { data } = await supabase.from("branches").select("id, name").order("name");
  return data ?? [];
}

export interface ActivityEntry {
  id: string;
  actorEmail: string | null;
  description: string;
  createdAt: string;
}

// Junta o log de atividade livre (activity_log) com o histórico de troca de
// status (case_status_history) numa única linha do tempo, mais recente
// primeiro.
export async function getCaseActivity(caseId: string): Promise<ActivityEntry[]> {
  const supabase = createClient();

  const [{ data: activity }, { data: statusHistory }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, actor_email, description, created_at")
      .eq("case_id", caseId),
    supabase
      .from("case_status_history")
      .select("id, to_status, changed_at, profiles ( full_name )")
      .eq("case_id", caseId),
  ]);

  const fromActivity: ActivityEntry[] = (activity ?? []).map((a: any) => ({
    id: a.id,
    actorEmail: a.actor_email,
    description: a.description,
    createdAt: a.created_at,
  }));

  const fromStatus: ActivityEntry[] = (statusHistory ?? []).map((s: any) => ({
    id: s.id,
    actorEmail: s.profiles?.full_name ?? null,
    description: `Status alterado para "${s.to_status}".`,
    createdAt: s.changed_at,
  }));

  return [...fromActivity, ...fromStatus].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
