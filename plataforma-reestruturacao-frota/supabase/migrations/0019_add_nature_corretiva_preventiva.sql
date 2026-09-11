-- Permite marcar se uma tarefa/peça é de origem corretiva (avaria/quebra) ou
-- preventiva (manutenção programada), do início (inspeção mecânica/vistoria)
-- até o fim (orçamento unificado/otimização) do fluxo.
alter table mechanical_items add column nature text not null default 'corretiva' check (nature in ('corretiva','preventiva'));
alter table checklist_item_parts add column nature text not null default 'corretiva' check (nature in ('corretiva','preventiva'));
alter table unified_budget_items add column nature text not null default 'corretiva' check (nature in ('corretiva','preventiva'));
alter table optimization_items add column nature text not null default 'corretiva' check (nature in ('corretiva','preventiva'));
