-- Fase 2 da Otimização (precificação): depois da moderação (fase 1), o
-- operador trabalha só os itens aprovados buscando reduzir o custo — troca
-- de marca (Ekotruck/Ekotruck Spot, com origem/fornecedor para rastreio) ou
-- terceirização do serviço (itens de mão de obra, linhas 90/92).
alter table budget_optimizations add column moderation_completed_at timestamptz;

create type part_brand as enum ('scania', 'ekotruck', 'ekotruck_spot');

alter table optimization_items add column brand part_brand not null default 'scania';
-- Origem/fornecedor da peça — obrigatório na prática quando brand != 'scania'.
alter table optimization_items add column supplier text;
-- Terceirização do serviço (itens de mão de obra) para outra oficina.
alter table optimization_items add column outsourced boolean not null default false;
alter table optimization_items add column outsourced_to text;
