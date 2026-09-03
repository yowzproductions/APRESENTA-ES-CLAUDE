-- Campos extraídos automaticamente do PDF padrão de orçamento (espelho de
-- negociação) anexado na etapa de inspeção mecânica.
alter table mechanical_items add column task_number int;
alter table mechanical_items add column task_name text;
alter table mechanical_items add column product_line text;
alter table mechanical_items add column part_number text;
alter table mechanical_items add column quantity numeric(10,2) default 1;
alter table mechanical_items add column unit_price numeric(12,2);
-- estimated_cost (já existente) continua representando o preço total do item
