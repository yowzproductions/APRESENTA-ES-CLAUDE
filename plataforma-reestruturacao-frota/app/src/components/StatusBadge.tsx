import { CaseStatus } from "@/types/domain";

const COLORS: Record<CaseStatus, string> = {
  cadastrado: "bg-neutral-200 text-neutral-700",
  agendado: "bg-blue-100 text-blue-700",
  vistoria_em_andamento: "bg-amber-100 text-amber-700",
  vistoria_concluida: "bg-amber-100 text-amber-700",
  inspecao_mecanica_em_andamento: "bg-purple-100 text-purple-700",
  inspecao_mecanica_concluida: "bg-purple-100 text-purple-700",
  orcamento_unificado: "bg-cyan-100 text-cyan-700",
  aguardando_aprovacao_cliente: "bg-yellow-100 text-yellow-800",
  aprovado_pelo_cliente: "bg-green-100 text-green-700",
  reprovado_pelo_cliente: "bg-red-100 text-red-700",
  em_otimizacao: "bg-orange-100 text-orange-700",
  otimizacao_concluida: "bg-orange-100 text-orange-700",
  em_execucao: "bg-indigo-100 text-indigo-700",
  finalizado: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};

export const LABELS: Record<CaseStatus, string> = {
  cadastrado: "Cadastrado",
  agendado: "Agendado",
  vistoria_em_andamento: "Vistoria em andamento",
  vistoria_concluida: "Vistoria concluída",
  inspecao_mecanica_em_andamento: "Inspeção mecânica em andamento",
  inspecao_mecanica_concluida: "Inspeção mecânica concluída",
  orcamento_unificado: "Orçamento unificado",
  aguardando_aprovacao_cliente: "Aguardando aprovação do cliente",
  aprovado_pelo_cliente: "Aprovado pelo cliente",
  reprovado_pelo_cliente: "Reprovado pelo cliente",
  em_otimizacao: "Em otimização",
  otimizacao_concluida: "Otimização concluída",
  em_execucao: "Em execução",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
