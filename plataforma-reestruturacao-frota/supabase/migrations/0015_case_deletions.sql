-- Exclusão de processo (caso): a exclusão do return_cases cascateia e apaga
-- todo o histórico daquele caso (activity_log, case_status_history etc.), então
-- guardamos aqui um retrato do que foi excluído para o histórico geral
-- sobreviver à exclusão — sem FK para return_cases, propositalmente.
create table case_deletions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  vehicle_plate text,
  vehicle_model text,
  client_name text,
  branch_name text,
  status_at_deletion text,
  base_total numeric(12,2),
  final_total numeric(12,2),
  reason text,
  deleted_by uuid references auth.users(id),
  deleted_by_email text,
  deleted_at timestamptz not null default now()
);

create index idx_case_deletions_deleted_at on case_deletions(deleted_at desc);

alter table case_deletions enable row level security;
create policy "authenticated_all" on case_deletions for all using ((select auth.role()) = 'authenticated');
