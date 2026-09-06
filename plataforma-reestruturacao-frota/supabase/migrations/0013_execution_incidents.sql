-- Imprevistos na etapa de Execução: manutenção sempre tem imprevistos, então
-- o operador precisa poder colocar (custo extra) ou tirar (custo a menos)
-- algo já considerado, a qualquer momento durante a execução — sem reabrir
-- as etapas anteriores já aprovadas pelo cliente. O impacto líquido conta na
-- conta final do veículo e é medido ao lado da economia.
create type execution_incident_kind as enum ('adicionado', 'removido');

create table execution_incidents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  kind execution_incident_kind not null,
  description text not null default '',
  part_number text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_execution_incidents_case_id on execution_incidents(case_id);

alter table execution_incidents enable row level security;
create policy "authenticated_all" on execution_incidents for all using ((select auth.role()) = 'authenticated');
