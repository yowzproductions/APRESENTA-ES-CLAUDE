import { createClient } from "@/lib/supabase/server";
import { MOCK_CASES } from "@/lib/mock-data";
import { CaseStatus, ReturnCase } from "@/types/domain";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Camada única de leitura de casos: usa Supabase quando configurado,
// cai para dados de demonstração enquanto o projeto não está provisionado —
// assim o scaffold nasce navegável sem depender de credenciais.
export async function getCases(): Promise<ReturnCase[]> {
  if (!SUPABASE_CONFIGURED) return MOCK_CASES;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("return_cases")
    .select(
      `id, status, scheduled_at,
       vehicles ( plate, model ),
       clients ( name ),
       unified_budgets ( base_total ),
       budget_optimizations ( final_total )`
    )
    .order("created_at", { ascending: false });

  if (error || !data) return MOCK_CASES;

  return data.map((row: any) => ({
    id: row.id,
    vehiclePlate: row.vehicles?.plate ?? "—",
    vehicleModel: row.vehicles?.model ?? "—",
    clientName: row.clients?.name ?? "—",
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
