-- Permite organizar o orçamento unificado por tarefa (mesmo padrão da
-- inspeção mecânica) e adicionar itens manualmente nessa etapa.
alter table unified_budget_items add column task_number int;
alter table unified_budget_items add column task_name text not null default '';

-- Itens incluídos manualmente pelo operador na etapa de orçamento unificado
-- (não vieram nem da vistoria nem da inspeção mecânica).
alter type budget_item_source add value if not exists 'manual';
