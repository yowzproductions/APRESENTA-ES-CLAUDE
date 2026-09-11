-- Permite anexar mais de um orçamento na inspeção mecânica (ex.: motor,
-- câmbio) e nomear cada um para facilitar o entendimento no orçamento
-- unificado e nos relatórios.
alter table mechanical_inspections add column budget_name text;
