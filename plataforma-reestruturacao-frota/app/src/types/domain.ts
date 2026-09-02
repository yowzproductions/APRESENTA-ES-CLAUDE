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

export const STAGE_ORDER: { status: CaseStatus; label: string }[] = [
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

export interface ReturnCase {
  id: string;
  vehiclePlate: string;
  vehicleChassis: string | null;
  vehicleModel: string;
  clientId: string | null;
  clientName: string;
  branchId: string | null;
  branchName: string | null;
  status: CaseStatus;
  scheduledAt: string | null;
  dueAt: string | null;
  baseTotal: number | null;
  finalTotal: number | null;
}

export interface FilterOption {
  id: string;
  name: string;
}
