-- Fase 1 da Otimização (Moderação): lista final do orçamento unificado
-- trazida para o especialista aprovar/desconsiderar item a item, com a
-- mesma possibilidade de criar tarefa e adicionar item das etapas
-- anteriores. budget_optimizations já existia (schema original), só
-- faltava a tabela de itens desta fase.
create table optimization_items (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references budget_optimizations(id) on delete cascade,
  description text not null default '',
  part_number text,
  product_line text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  task_number int,
  task_name text not null default '',
  source_label text,
  source_unified_budget_item_id uuid references unified_budget_items(id),
  approved boolean not null default true,
  justification text,
  created_at timestamptz not null default now()
);

create index idx_optimization_items_optimization_id on optimization_items(optimization_id);

alter table optimization_items enable row level security;
create policy "authenticated_all" on optimization_items for all using ((select auth.role()) = 'authenticated');
