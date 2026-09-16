export type CaseStatus =
  | "cadastrado"
  | "agendado"
  | "vistoria_em_andamento"
  | "vistoria_concluida"
  | "inspecao_mecanica_em_andamento"
  | "inspecao_mecanica_concluida"
  | "orcamento_unificado"
  | "aguardando_aprovacao_cliente"
  | "aprovado_pelo_cliente"
  | "reprovado_pelo_cliente"
  | "em_otimizacao"
  | "otimizacao_concluida"
  | "em_execucao"
  | "finalizado"
  | "cancelado";

// Processo de Retomada: fluxo completo (devolução de frota, com orçamento,
// otimização e execução).
export const RETOMADA_STAGE_ORDER: { status: CaseStatus; label: string }[] = [
  { status: "cadastrado", label: "Cadastro" },
  { status: "agendado", label: "Programação de Entrega" },
  { status: "vistoria_em_andamento", label: "Vistoria" },
  { status: "inspecao_mecanica_em_andamento", label: "Inspeção Mecânica" },
  { status: "orcamento_unificado", label: "Orçamento Unificado" },
  { status: "aguardando_aprovacao_cliente", label: "Aprovação Cliente" },
  { status: "em_otimizacao", label: "Otimização" },
  { status: "em_execucao", label: "Execução" },
  { status: "finalizado", label: "Finalizado" },
];

// Mantido por compatibilidade — sempre o fluxo de Retomada. Prefira
// getStageOrder(processType) em código novo, que já leva o tipo em conta.
export const STAGE_ORDER = RETOMADA_STAGE_ORDER;

// Processo de Ativação: fluxo curto (cadastro → programação → vistoria →
// finalizado), sem orçamento nem otimização — reaproveita os mesmos módulos
// das etapas iniciais do processo de Retomada.
export const ATIVACAO_STAGE_ORDER: { status: CaseStatus; label: string }[] = [
  { status: "cadastrado", label: "Cadastro" },
  { status: "agendado", label: "Programação de Entrega" },
  { status: "vistoria_em_andamento", label: "Vistoria" },
  { status: "finalizado", label: "Finalizado" },
];

export type ProcessType = "retomada" | "ativacao";

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  retomada: "Retomada",
  ativacao: "Ativação",
};

export function getStageOrder(processType: ProcessType): { status: CaseStatus; label: string }[] {
  return processType === "ativacao" ? ATIVACAO_STAGE_ORDER : RETOMADA_STAGE_ORDER;
}

export interface ReturnCase {
  id: string;
  vehiclePlate: string;
  vehicleChassis: string | null;
  vehicleModel: string;
  clientId: string | null;
  clientName: string;
  branchId: string | null;
  branchName: string | null;
  processType: ProcessType;
  status: CaseStatus;
  scheduledAt: string | null;
  dueAt: string | null;
  baseTotal: number | null;
  finalTotal: number | null;
  moderationSavings: number | null;
  incidentsNet: number | null;
}

export interface FilterOption {
  id: string;
  name: string;
}
