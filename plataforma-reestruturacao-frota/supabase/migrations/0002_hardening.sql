-- Hardening pós-provisionamento: aplicado diretamente no projeto Supabase
-- (gsbmywrigseigtyqsmbr) e replicado aqui para manter o schema em git
-- sincronizado com o banco real.

-- role é atribuída por um admin após o convite (não auto-atribuída no signup,
-- já que o trigger on_auth_user_created só preenche id/full_name)
alter table public.profiles alter column role drop not null;

-- view deve respeitar RLS de quem consulta, não do criador (achado do
-- linter de segurança do Supabase: security_definer_view)
alter view public.budget_impact set (security_invoker = on);

-- função de signup não deve ser chamável via RPC pública, só pelo trigger
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- índices em todas as foreign keys sem cobertura (achado do linter de
-- performance: unindexed_foreign_keys)
create index if not exists idx_attachments_uploaded_by on attachments(uploaded_by);
create index if not exists idx_budget_optimizations_case_id on budget_optimizations(case_id);
create index if not exists idx_budget_optimizations_started_by on budget_optimizations(started_by);
create index if not exists idx_budget_optimizations_unified_budget_id on budget_optimizations(unified_budget_id);
create index if not exists idx_case_deadlines_created_by on case_deadlines(created_by);
create index if not exists idx_case_status_history_case_id on case_status_history(case_id);
create index if not exists idx_case_status_history_changed_by on case_status_history(changed_by);
create index if not exists idx_checklist_items_checklist_id on checklist_items(checklist_id);
create index if not exists idx_client_approvals_case_id on client_approvals(case_id);
create index if not exists idx_client_approvals_unified_budget_id on client_approvals(unified_budget_id);
create index if not exists idx_clients_created_by on clients(created_by);
create index if not exists idx_inspection_checklists_case_id on inspection_checklists(case_id);
create index if not exists idx_inspection_checklists_inspector_id on inspection_checklists(inspector_id);
create index if not exists idx_mechanical_inspections_case_id on mechanical_inspections(case_id);
create index if not exists idx_mechanical_inspections_mechanic_id on mechanical_inspections(mechanic_id);
create index if not exists idx_mechanical_items_inspection_id on mechanical_items(inspection_id);
create index if not exists idx_optimization_outsourced_items_decided_by on optimization_outsourced_items(decided_by);
create index if not exists idx_optimization_outsourced_items_optimization_id on optimization_outsourced_items(optimization_id);
create index if not exists idx_optimization_outsourced_items_unified_budget_item_id on optimization_outsourced_items(unified_budget_item_id);
create index if not exists idx_optimization_part_substitutions_optimization_id on optimization_part_substitutions(optimization_id);
create index if not exists idx_optimization_part_substitutions_substituted_by on optimization_part_substitutions(substituted_by);
create index if not exists idx_optimization_part_substitutions_unified_budget_item_id on optimization_part_substitutions(unified_budget_item_id);
create index if not exists idx_optimization_removed_items_optimization_id on optimization_removed_items(optimization_id);
create index if not exists idx_optimization_removed_items_removed_by on optimization_removed_items(removed_by);
create index if not exists idx_optimization_removed_items_unified_budget_item_id on optimization_removed_items(unified_budget_item_id);
create index if not exists idx_return_cases_created_by on return_cases(created_by);
create index if not exists idx_return_cases_scheduled_by on return_cases(scheduled_by);
create index if not exists idx_service_executions_unified_budget_item_id on service_executions(unified_budget_item_id);
create index if not exists idx_unified_budget_items_source_checklist_item_id on unified_budget_items(source_checklist_item_id);
create index if not exists idx_unified_budget_items_source_mechanical_item_id on unified_budget_items(source_mechanical_item_id);
create index if not exists idx_unified_budget_items_unified_budget_id on unified_budget_items(unified_budget_id);
create index if not exists idx_unified_budgets_case_id on unified_budgets(case_id);
create index if not exists idx_unified_budgets_unified_by on unified_budgets(unified_by);
create index if not exists idx_vehicles_created_by on vehicles(created_by);
create index if not exists idx_vehicles_current_client_id on vehicles(current_client_id);

-- Consolidação das policies de RLS: cada tabela tinha uma policy de select
-- ("read_authenticated") e outra "for all" ("write_authenticated") que já
-- cobria select, causando avaliação duplicada em toda leitura (achado do
-- linter: multiple_permissive_policies). Substituídas por uma única policy
-- por tabela. Também trocado auth.role()/auth.uid() por
-- (select auth.role())/(select auth.uid()) para permitir cache do
-- initplan em vez de reavaliar por linha (achado: auth_rls_initplan).

drop policy if exists "read_authenticated" on clients;
drop policy if exists "write_authenticated" on clients;
create policy "authenticated_all" on clients for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on vehicles;
drop policy if exists "write_authenticated" on vehicles;
create policy "authenticated_all" on vehicles for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on return_cases;
drop policy if exists "write_authenticated" on return_cases;
create policy "authenticated_all" on return_cases for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on case_status_history;
drop policy if exists "write_authenticated" on case_status_history;
create policy "authenticated_all" on case_status_history for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on case_deadlines;
drop policy if exists "write_authenticated" on case_deadlines;
create policy "authenticated_all" on case_deadlines for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on inspection_checklists;
drop policy if exists "write_authenticated" on inspection_checklists;
create policy "authenticated_all" on inspection_checklists for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on checklist_items;
drop policy if exists "write_authenticated" on checklist_items;
create policy "authenticated_all" on checklist_items for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on mechanical_inspections;
drop policy if exists "write_authenticated" on mechanical_inspections;
create policy "authenticated_all" on mechanical_inspections for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on mechanical_items;
drop policy if exists "write_authenticated" on mechanical_items;
create policy "authenticated_all" on mechanical_items for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on unified_budgets;
drop policy if exists "write_authenticated" on unified_budgets;
create policy "authenticated_all" on unified_budgets for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on unified_budget_items;
drop policy if exists "write_authenticated" on unified_budget_items;
create policy "authenticated_all" on unified_budget_items for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on client_approvals;
drop policy if exists "write_authenticated" on client_approvals;
create policy "authenticated_all" on client_approvals for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on budget_optimizations;
drop policy if exists "write_authenticated" on budget_optimizations;
create policy "authenticated_all" on budget_optimizations for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on optimization_removed_items;
drop policy if exists "write_authenticated" on optimization_removed_items;
create policy "authenticated_all" on optimization_removed_items for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on optimization_part_substitutions;
drop policy if exists "write_authenticated" on optimization_part_substitutions;
create policy "authenticated_all" on optimization_part_substitutions for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on optimization_outsourced_items;
drop policy if exists "write_authenticated" on optimization_outsourced_items;
create policy "authenticated_all" on optimization_outsourced_items for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on service_executions;
drop policy if exists "write_authenticated" on service_executions;
create policy "authenticated_all" on service_executions for all using ((select auth.role()) = 'authenticated');

drop policy if exists "read_authenticated" on attachments;
drop policy if exists "write_authenticated" on attachments;
create policy "authenticated_all" on attachments for all using ((select auth.role()) = 'authenticated');

-- profiles: self_read era redundante com read_authenticated (todo
-- autenticado já lê todos os perfis, é um time interno); mantém apenas
-- leitura ampla + self_update.
drop policy if exists "self_read" on profiles;
drop policy if exists "read_authenticated" on profiles;
create policy "read_authenticated" on profiles for select using ((select auth.role()) = 'authenticated');

drop policy if exists "self_update" on profiles;
create policy "self_update" on profiles for update using ((select auth.uid()) = id);
