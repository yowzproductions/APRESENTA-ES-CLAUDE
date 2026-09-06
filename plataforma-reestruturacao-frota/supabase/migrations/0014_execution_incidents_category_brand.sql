-- Imprevisto pode ser peça (com marca/fornecedor, mesmo padrão da
-- precificação: Scania/Ekotruck/Ekotruck Spot) ou serviço (com a oficina
-- que executou), não só um valor genérico.
create type execution_incident_category as enum ('peca', 'servico');

alter table execution_incidents add column category execution_incident_category not null default 'peca';
alter table execution_incidents add column brand part_brand not null default 'scania';
alter table execution_incidents add column supplier text;
