import { ReturnCase } from "@/types/domain";

// Dados de demonstração — usados apenas quando o Supabase ainda não está
// configurado (NEXT_PUBLIC_SUPABASE_URL ausente), para o dashboard já
// nascer navegável.
export const MOCK_CASES: ReturnCase[] = [
  {
    id: "1",
    vehiclePlate: "ABC1D23",
    vehicleModel: "VUC 3/4 - Volkswagen Delivery",
    clientName: "Transportadora Rio Claro",
    status: "vistoria_em_andamento",
    scheduledAt: "2026-09-03T09:00:00-03:00",
    dueAt: "2026-09-03T09:00:00-03:00",
    baseTotal: null,
    finalTotal: null,
  },
  {
    id: "2",
    vehiclePlate: "XYZ9K88",
    vehicleModel: "Toco - Mercedes-Benz Accelo",
    clientName: "Log Express Distribuição",
    status: "orcamento_unificado",
    scheduledAt: "2026-08-28T14:00:00-03:00",
    dueAt: "2026-09-05T18:00:00-03:00",
    baseTotal: 18450.0,
    finalTotal: null,
  },
  {
    id: "3",
    vehiclePlate: "QWE4R55",
    vehicleModel: "Truck - Scania P310",
    clientName: "Comércio Atacadista Boa Vista",
    status: "em_otimizacao",
    scheduledAt: "2026-08-20T10:00:00-03:00",
    dueAt: "2026-09-02T18:00:00-03:00",
    baseTotal: 31200.0,
    finalTotal: null,
  },
  {
    id: "4",
    vehiclePlate: "LMN2P11",
    vehicleModel: "Furgão - Fiat Ducato",
    clientName: "Distribuidora Norte Sul",
    status: "em_execucao",
    scheduledAt: "2026-08-15T11:00:00-03:00",
    dueAt: "2026-09-10T18:00:00-03:00",
    baseTotal: 9800.0,
    finalTotal: 6420.0,
  },
  {
    id: "5",
    vehiclePlate: "JKL7H90",
    vehicleModel: "VUC 3/4 - Iveco Daily",
    clientName: "Transportadora Rio Claro",
    status: "finalizado",
    scheduledAt: "2026-08-01T09:00:00-03:00",
    dueAt: null,
    baseTotal: 12100.0,
    finalTotal: 7950.0,
  },
];
