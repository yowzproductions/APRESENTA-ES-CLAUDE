-- Progresso por etapa do caso: permite marcar cada etapa como concluída OU
-- "não se aplica" (pular), além de guardar o prazo estimado por etapa.
-- return_cases.status continua sendo o "ponteiro" da etapa atual (usado no
-- kanban/lista/filtros); esta tabela é o detalhamento por etapa exibido na
-- página do caso.
create type stage_state as enum ('pendente', 'em_andamento', 'concluido', 'nao_se_aplica');

create table case_stage_progress (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  stage text not null,
  state stage_state not null default 'pendente',
  due_at timestamptz,
  completed_at timestamptz,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (case_id, stage)
);

create index idx_case_stage_progress_case_id on case_stage_progress(case_id);

alter table case_stage_progress enable row level security;
create policy "authenticated_all" on case_stage_progress for all using ((select auth.role()) = 'authenticated');
