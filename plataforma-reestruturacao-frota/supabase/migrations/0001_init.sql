-- Plataforma de Reestruturação de Frota — schema inicial
-- Convenção: toda tabela sensível a auditoria tem created_at/created_by;
-- mudanças de status/valores relevantes também gravam em case_events.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Perfis e papéis
-- ─────────────────────────────────────────────────────────────────────────

create type user_role as enum (
  'comercial',
  'vistoriador',
  'mecanica',
  'moderador',
  'execucao',
  'gestor',
  'admin'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  phone text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Clientes e veículos
-- ─────────────────────────────────────────────────────────────────────────

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text, -- CPF/CNPJ
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  fleet_code text,
  brand text,
  model text,
  model_year int,
  current_client_id uuid references clients(id),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Caso de devolução (a instância do workflow)
-- ─────────────────────────────────────────────────────────────────────────

create type case_status as enum (
  'cadastrado',
  'agendado',
  'vistoria_em_andamento',
  'vistoria_concluida',
  'inspecao_mecanica_em_andamento',
  'inspecao_mecanica_concluida',
  'orcamento_unificado',
  'aguardando_aprovacao_cliente',
  'aprovado_pelo_cliente',
  'reprovado_pelo_cliente',
  'em_otimizacao',
  'otimizacao_concluida',
  'em_execucao',
  'finalizado',
  'cancelado'
);

create table return_cases (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  client_id uuid not null references clients(id),
  status case_status not null default 'cadastrado',
  scheduled_at timestamptz,
  scheduled_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) not null
);

create index on return_cases (status);
create index on return_cases (vehicle_id);
create index on return_cases (client_id);

-- Histórico de mudança de status (auditoria de workflow)
create table case_status_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  from_status case_status,
  to_status case_status not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now(),
  notes text
);

-- Prazos por etapa (campo de prazo quando houver, genérico por etapa)
create table case_deadlines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  stage text not null, -- ex: 'agendamento','vistoria','inspecao_mecanica','unificacao','aprovacao_cliente','otimizacao','execucao'
  due_at timestamptz not null,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index on case_deadlines (case_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Vistoria de recebimento (checklist)
-- ─────────────────────────────────────────────────────────────────────────

create table inspection_checklists (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  inspector_id uuid references profiles(id),
  performed_at timestamptz,
  client_responsible_name text,
  client_signature_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references inspection_checklists(id) on delete cascade,
  description text not null,
  category text, -- ex: lataria, pneu, interior, elétrica...
  estimated_cost numeric(12,2) not null default 0,
  severity text, -- leve/media/grave
  photo_url text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Inspeção mecânica (orçamento técnico)
-- ─────────────────────────────────────────────────────────────────────────

create table mechanical_inspections (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  mechanic_id uuid references profiles(id),
  workshop_name text,
  performed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table mechanical_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references mechanical_inspections(id) on delete cascade,
  description text not null,
  category text,
  estimated_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Orçamento unificado (base) — moderador junta checklist + inspeção mecânica
-- ─────────────────────────────────────────────────────────────────────────

create table unified_budgets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  unified_by uuid references profiles(id),
  unified_at timestamptz not null default now(),
  base_total numeric(12,2) not null default 0,
  sent_to_client_at timestamptz,
  created_at timestamptz not null default now()
);

create type budget_item_source as enum ('checklist', 'mechanical', 'both');

create table unified_budget_items (
  id uuid primary key default gen_random_uuid(),
  unified_budget_id uuid not null references unified_budgets(id) on delete cascade,
  description text not null,
  cost numeric(12,2) not null default 0,
  source budget_item_source not null,
  source_checklist_item_id uuid references checklist_items(id),
  source_mechanical_item_id uuid references mechanical_items(id),
  created_at timestamptz not null default now()
);

create table client_approvals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  unified_budget_id uuid not null references unified_budgets(id),
  approved boolean,
  responded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Otimização de orçamento (pós-aprovação)
-- ─────────────────────────────────────────────────────────────────────────

create table budget_optimizations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  unified_budget_id uuid not null references unified_budgets(id),
  started_by uuid references profiles(id),
  started_at timestamptz not null default now(),
  final_total numeric(12,2),
  completed_at timestamptz
);

-- Itens removidos do orçamento durante a otimização (com responsável + justificativa)
create table optimization_removed_items (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references budget_optimizations(id) on delete cascade,
  unified_budget_item_id uuid not null references unified_budget_items(id),
  removed_by uuid references profiles(id) not null,
  removed_at timestamptz not null default now(),
  justification text not null,
  evidence_url text
);

-- Peças originais substituídas por Ekotruck (estoque) ou Spot (multimarcas)
create type part_origin as enum ('estoque_ekotruck', 'spot');

create table optimization_part_substitutions (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references budget_optimizations(id) on delete cascade,
  unified_budget_item_id uuid not null references unified_budget_items(id),
  original_part_description text not null,
  original_price numeric(12,2) not null,
  substitute_part_description text not null,
  substitute_brand text,
  substitute_price numeric(12,2) not null,
  origin part_origin not null,
  supplier_name text, -- obrigatório na prática quando origin = 'spot'
  substituted_by uuid references profiles(id) not null,
  substituted_at timestamptz not null default now()
);

-- Itens de terceirização (serviço simples terceirizado durante a otimização)
create table optimization_outsourced_items (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references budget_optimizations(id) on delete cascade,
  unified_budget_item_id uuid not null references unified_budget_items(id),
  outsourced_to text not null,
  price numeric(12,2) not null,
  decided_by uuid references profiles(id) not null,
  decided_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Execução dos serviços (interno/externo)
-- ─────────────────────────────────────────────────────────────────────────

create type execution_type as enum ('interno', 'externo');
create type execution_status as enum ('pendente', 'em_andamento', 'concluido', 'cancelado');

create table service_executions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references return_cases(id) on delete cascade,
  unified_budget_item_id uuid references unified_budget_items(id),
  description text not null,
  type execution_type not null,
  responsible text,
  status execution_status not null default 'pendente',
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on service_executions (case_id);
create index on service_executions (status);

-- ─────────────────────────────────────────────────────────────────────────
-- Anexos genéricos (fotos, laudos, evidências)
-- ─────────────────────────────────────────────────────────────────────────

create table attachments (
  id uuid primary key default gen_random_uuid(),
  related_table text not null,
  related_id uuid not null,
  url text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- View de impacto financeiro da moderação (base x final x economia)
-- ─────────────────────────────────────────────────────────────────────────

create view budget_impact as
select
  rc.id as case_id,
  v.plate,
  ub.base_total,
  bo.final_total,
  (ub.base_total - coalesce(bo.final_total, ub.base_total)) as savings,
  bo.completed_at
from return_cases rc
join vehicles v on v.id = rc.vehicle_id
left join unified_budgets ub on ub.case_id = rc.id
left join budget_optimizations bo on bo.unified_budget_id = ub.id;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — habilitado em todas as tabelas; policies básicas por papel.
-- (regras finas de escrita por etapa devem ser reforçadas na camada de API)
-- ─────────────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table clients enable row level security;
alter table vehicles enable row level security;
alter table return_cases enable row level security;
alter table case_status_history enable row level security;
alter table case_deadlines enable row level security;
alter table inspection_checklists enable row level security;
alter table checklist_items enable row level security;
alter table mechanical_inspections enable row level security;
alter table mechanical_items enable row level security;
alter table unified_budgets enable row level security;
alter table unified_budget_items enable row level security;
alter table client_approvals enable row level security;
alter table budget_optimizations enable row level security;
alter table optimization_removed_items enable row level security;
alter table optimization_part_substitutions enable row level security;
alter table optimization_outsourced_items enable row level security;
alter table service_executions enable row level security;
alter table attachments enable row level security;

-- Todo usuário autenticado pode ler (o processo é interno, multi-time);
-- escrita restrita a autenticados também nesta fase — refinar por papel na Fase 2.
create policy "read_authenticated" on profiles for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on clients for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on vehicles for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on return_cases for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on case_status_history for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on case_deadlines for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on inspection_checklists for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on checklist_items for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on mechanical_inspections for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on mechanical_items for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on unified_budgets for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on unified_budget_items for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on client_approvals for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on budget_optimizations for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on optimization_removed_items for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on optimization_part_substitutions for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on optimization_outsourced_items for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on service_executions for select using (auth.role() = 'authenticated');
create policy "read_authenticated" on attachments for select using (auth.role() = 'authenticated');

create policy "write_authenticated" on clients for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on vehicles for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on return_cases for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on case_status_history for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on case_deadlines for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on inspection_checklists for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on checklist_items for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on mechanical_inspections for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on mechanical_items for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on unified_budgets for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on unified_budget_items for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on client_approvals for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on budget_optimizations for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on optimization_removed_items for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on optimization_part_substitutions for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on optimization_outsourced_items for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on service_executions for all using (auth.role() = 'authenticated');
create policy "write_authenticated" on attachments for all using (auth.role() = 'authenticated');

create policy "self_read" on profiles for select using (auth.uid() = id);
create policy "self_update" on profiles for update using (auth.uid() = id);
