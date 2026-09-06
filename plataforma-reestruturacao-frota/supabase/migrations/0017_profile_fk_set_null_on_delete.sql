-- Excluir um acesso (profiles/auth.users) falhava com "Database error
-- deleting user" sempre que a pessoa tinha qualquer rastro no sistema
-- (um item de histórico, um anexo, uma etapa que ela mexeu) porque essas
-- FKs não tinham ação de exclusão definida (NO ACTION por padrão). Trocamos
-- para ON DELETE SET NULL nas colunas opcionais — preserva o histórico,
-- só perde a referência de quem foi. Colunas NOT NULL (ex.: quem criou o
-- caso) continuam bloqueando a exclusão de propósito: a conta que criou
-- um caso existente não deve poder ser apagada sem antes lidar com o caso.
alter table profiles drop constraint profiles_invited_by_fkey;
alter table profiles add constraint profiles_invited_by_fkey
  foreign key (invited_by) references profiles(id) on delete set null;

alter table clients drop constraint clients_created_by_fkey;
alter table clients add constraint clients_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table vehicles drop constraint vehicles_created_by_fkey;
alter table vehicles add constraint vehicles_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table return_cases drop constraint return_cases_scheduled_by_fkey;
alter table return_cases add constraint return_cases_scheduled_by_fkey
  foreign key (scheduled_by) references profiles(id) on delete set null;

alter table case_status_history drop constraint case_status_history_changed_by_fkey;
alter table case_status_history add constraint case_status_history_changed_by_fkey
  foreign key (changed_by) references profiles(id) on delete set null;

alter table case_deadlines drop constraint case_deadlines_created_by_fkey;
alter table case_deadlines add constraint case_deadlines_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table inspection_checklists drop constraint inspection_checklists_inspector_id_fkey;
alter table inspection_checklists add constraint inspection_checklists_inspector_id_fkey
  foreign key (inspector_id) references profiles(id) on delete set null;

alter table mechanical_inspections drop constraint mechanical_inspections_mechanic_id_fkey;
alter table mechanical_inspections add constraint mechanical_inspections_mechanic_id_fkey
  foreign key (mechanic_id) references profiles(id) on delete set null;

alter table unified_budgets drop constraint unified_budgets_unified_by_fkey;
alter table unified_budgets add constraint unified_budgets_unified_by_fkey
  foreign key (unified_by) references profiles(id) on delete set null;

alter table budget_optimizations drop constraint budget_optimizations_started_by_fkey;
alter table budget_optimizations add constraint budget_optimizations_started_by_fkey
  foreign key (started_by) references profiles(id) on delete set null;

alter table attachments drop constraint attachments_uploaded_by_fkey;
alter table attachments add constraint attachments_uploaded_by_fkey
  foreign key (uploaded_by) references profiles(id) on delete set null;

alter table activity_log drop constraint activity_log_actor_id_fkey;
alter table activity_log add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references profiles(id) on delete set null;

alter table case_stage_progress drop constraint case_stage_progress_updated_by_fkey;
alter table case_stage_progress add constraint case_stage_progress_updated_by_fkey
  foreign key (updated_by) references profiles(id) on delete set null;

alter table execution_incidents drop constraint execution_incidents_created_by_fkey;
alter table execution_incidents add constraint execution_incidents_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table case_deletions drop constraint case_deletions_deleted_by_fkey;
alter table case_deletions add constraint case_deletions_deleted_by_fkey
  foreign key (deleted_by) references auth.users(id) on delete set null;
