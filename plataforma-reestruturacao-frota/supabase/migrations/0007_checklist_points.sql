-- Checklist fotográfico de vistoria (45 pontos do PDF padrão): cada ponto
-- vira uma linha em checklist_items, nascendo "ok"; o vistoriador marca
-- manualmente os avariados, com justificativa e tipo de dano.
alter table checklist_items add column point_number int;
alter table checklist_items add column status text not null default 'ok' check (status in ('ok', 'avariado'));
alter table checklist_items add column damage_type text;
alter table checklist_items add column justification text;

-- Peças/serviços necessários para corrigir um ponto avariado — lista própria
-- da vistoria, unificada com o orçamento da inspeção mecânica só depois, na
-- etapa do moderador.
create table checklist_item_parts (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  description text not null default '',
  product_line text,
  part_number text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_checklist_item_parts_checklist_item_id on checklist_item_parts(checklist_item_id);

alter table checklist_item_parts enable row level security;
create policy "authenticated_all" on checklist_item_parts for all using ((select auth.role()) = 'authenticated');
