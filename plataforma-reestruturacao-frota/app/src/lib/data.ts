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
       budget_optimizations ( id, final_total )`
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const ids = data.map((row: any) => row.id);
  const { data: progressRows } = await supabase
    .from("case_stage_progress")
    .select("case_id, stage, due_at")
    .in("case_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  // Prazo relevante para o workflow: o da etapa em que o caso está agora.
  const dueByCase = new Map<string, string>();
  for (const p of progressRows ?? []) {
    if (p.due_at) dueByCase.set(`${p.case_id}:${p.stage}`, p.due_at);
  }

  // Economia obtida na moderação (itens desconsiderados) — separada da
  // economia obtida depois na precificação (troca de marca/oficina).
  const optimizationIds = data
    .map((row: any) => row.budget_optimizations?.[0]?.id)
    .filter((id: string | undefined): id is string => !!id);
  const moderationSavingsByOptimization = new Map<string, number>();
  if (optimizationIds.length > 0) {
    const { data: rejectedItems } = await supabase
      .from("optimization_items")
      .select("optimization_id, cost")
      .in("optimization_id", optimizationIds)
      .eq("approved", false);
    for (const it of rejectedItems ?? []) {
      moderationSavingsByOptimization.set(
        it.optimization_id,
        (moderationSavingsByOptimization.get(it.optimization_id) ?? 0) + it.cost
      );
    }
  }

  // Impacto líquido dos imprevistos da execução (colocado - tirado), que
  // conta na conta final do veículo ao lado da economia.
  const incidentsNetByCase = new Map<string, number>();
  if (ids.length > 0) {
    const { data: incidentRows } = await supabase
      .from("execution_incidents")
      .select("case_id, kind, cost")
      .in("case_id", ids);
    for (const it of incidentRows ?? []) {
      const delta = it.kind === "adicionado" ? it.cost : -it.cost;
      incidentsNetByCase.set(it.case_id, (incidentsNetByCase.get(it.case_id) ?? 0) + delta);
    }
  }

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
    dueAt: dueByCase.get(`${row.id}:${row.status}`) ?? null,
    baseTotal: row.unified_budgets?.[0]?.base_total ?? null,
    finalTotal: row.budget_optimizations?.[0]?.final_total ?? null,
    moderationSavings: row.budget_optimizations?.[0]?.id
      ? moderationSavingsByOptimization.get(row.budget_optimizations[0].id) ?? 0
      : null,
    incidentsNet: incidentsNetByCase.get(row.id) ?? null,
  }));
}

export async function getCaseById(id: string): Promise<ReturnCase | undefined> {
  const cases = await getCases();
  return cases.find((c) => c.id === id);
}

export type StageAccess = "oculto" | "visualizar" | "editar";

// Acesso por etapa do usuário logado. Ausência de registro para uma etapa
// significa acesso total — só restringe quem o admin explicitamente
// restringir na criação do acesso (mesmo que a conta seja de outro admin).
export async function getMyStageAccess(): Promise<Record<string, StageAccess>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: perms } = await supabase
    .from("stage_permissions")
    .select("stage, access")
    .eq("profile_id", user.id);

  const map: Record<string, StageAccess> = {};
  for (const p of perms ?? []) map[p.stage] = p.access as StageAccess;
  return map;
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

export interface StageAttachment {
  id: string;
  stage: string;
  url: string;
  uploadedAt: string;
}

export async function getStageAttachments(caseId: string): Promise<StageAttachment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("attachments")
    .select("id, stage, url, uploaded_at")
    .eq("related_table", "return_cases")
    .eq("related_id", caseId);

  return (data ?? []).map((a) => ({
    id: a.id,
    stage: a.stage,
    url: a.url,
    uploadedAt: a.uploaded_at,
  }));
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
  stageLabel: string | null;
}

// Nome de etapa exibido junto de cada movimentação do histórico, para
// diferenciar "quem editou/excluiu o quê" por etapa. Mantido em paralelo a
// STAGE_ORDER (não importado diretamente para evitar acoplar lib/data.ts a
// types/domain.ts só por causa de um rótulo).
const STAGE_LABELS: Record<string, string> = {
  cadastrado: "Cadastro",
  agendado: "Programação de Entrega",
  vistoria_em_andamento: "Vistoria",
  inspecao_mecanica_em_andamento: "Inspeção Mecânica",
  orcamento_unificado: "Orçamento Unificado",
  aguardando_aprovacao_cliente: "Aprovação Cliente",
  em_otimizacao: "Otimização",
  em_execucao: "Execução",
  finalizado: "Finalizado",
};

// Junta o log de atividade livre (activity_log) com o histórico de troca de
// status (case_status_history) numa única linha do tempo, mais recente
// primeiro.
export async function getCaseActivity(caseId: string): Promise<ActivityEntry[]> {
  const supabase = createClient();

  const [{ data: activity }, { data: statusHistory }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, actor_email, description, created_at, stage")
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
    stageLabel: a.stage ? STAGE_LABELS[a.stage] ?? a.stage : null,
  }));

  const fromStatus: ActivityEntry[] = (statusHistory ?? []).map((s: any) => ({
    id: s.id,
    actorEmail: s.profiles?.full_name ?? null,
    description: `Status alterado para "${s.to_status}".`,
    createdAt: s.changed_at,
    stageLabel: STAGE_LABELS[s.to_status] ?? s.to_status,
  }));

  return [...fromActivity, ...fromStatus].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface PartReportRow {
  caseId: string;
  createdAt: string;
  vehiclePlate: string;
  clientName: string;
  taskNumber: number | null;
  taskName: string;
  partNumber: string;
  description: string;
  productLine: string;
  sourceLabel: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  originalCost: number | null;
  approved: boolean;
  justification: string | null;
  brand: string;
  supplier: string | null;
  outsourced: boolean;
  outsourcedTo: string | null;
  nature: string;
}

// Relatório de peças (orçadas → moderadas → otimizadas) cruzando todos os
// casos, para priorizar onde desenvolver soluções: peças removidas com
// frequência na moderação, peças já com marca alternativa funcionando, e
// peças que continuam saindo só como Scania original.
export async function getPartsReportRows(): Promise<PartReportRow[]> {
  const supabase = createClient();

  const { data: optimizations } = await supabase
    .from("budget_optimizations")
    .select("id, case_id");
  if (!optimizations || optimizations.length === 0) return [];

  const optimizationIds = optimizations.map((o) => o.id);
  const caseByOptimization = new Map(optimizations.map((o) => [o.id, o.case_id]));

  const { data: items } = await supabase
    .from("optimization_items")
    .select("*")
    .in("optimization_id", optimizationIds);
  if (!items || items.length === 0) return [];

  const caseIds = Array.from(new Set(optimizations.map((o) => o.case_id)));
  const { data: cases } = await supabase
    .from("return_cases")
    .select("id, vehicles ( plate ), clients ( name )")
    .in("id", caseIds);
  const caseInfo = new Map(
    (cases ?? []).map((c: any) => [c.id, { plate: c.vehicles?.plate ?? "—", client: c.clients?.name ?? "—" }])
  );

  const sourceIds = Array.from(
    new Set(items.map((it: any) => it.source_unified_budget_item_id).filter((id: string | null): id is string => !!id))
  );
  const originalCosts = new Map<string, number>();
  if (sourceIds.length > 0) {
    const { data: sourceItems } = await supabase
      .from("unified_budget_items")
      .select("id, cost")
      .in("id", sourceIds);
    for (const s of sourceItems ?? []) originalCosts.set(s.id, s.cost);
  }

  return items.map((it: any) => {
    const caseId = caseByOptimization.get(it.optimization_id) ?? "";
    const info = caseInfo.get(caseId);
    return {
      caseId,
      createdAt: it.created_at,
      vehiclePlate: info?.plate ?? "—",
      clientName: info?.client ?? "—",
      taskNumber: it.task_number,
      taskName: it.task_name || "",
      partNumber: it.part_number || "",
      description: it.description,
      productLine: it.product_line || "",
      sourceLabel: it.source_label || "",
      quantity: it.quantity,
      unitPrice: it.unit_price,
      cost: it.cost,
      originalCost: it.source_unified_budget_item_id
        ? originalCosts.get(it.source_unified_budget_item_id) ?? null
        : null,
      approved: it.approved,
      justification: it.justification,
      brand: it.brand || "scania",
      supplier: it.supplier,
      outsourced: it.outsourced ?? false,
      outsourcedTo: it.outsourced_to,
      nature: it.nature || "corretiva",
    };
  });
}
