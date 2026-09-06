-- Amplia unified_budget_items com o detalhe necessário para exibir e
-- selecionar, lado a lado, os achados da vistoria e da inspeção mecânica na
-- etapa de Orçamento Unificado.
alter table unified_budget_items add column part_number text;
alter table unified_budget_items add column product_line text;
alter table unified_budget_items add column quantity numeric(10,2);
alter table unified_budget_items add column unit_price numeric(12,2);
alter table unified_budget_items add column source_label text;
alter table unified_budget_items add column source_checklist_item_part_id uuid references checklist_item_parts(id);

-- Seleção do operador: nasce true (tudo vai ao orçamento final por padrão),
-- ele desmarca o que deve ficar de fora.
alter table unified_budget_items add column included boolean not null default true;
