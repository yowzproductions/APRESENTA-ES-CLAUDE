-- Permite saber em qual etapa cada movimentação aconteceu, não só o quê e
-- quem — necessário para rastrear criação/edição/exclusão de itens
-- individuais (ex.: peças do orçamento unificado), não só troca de etapa.
alter table activity_log add column stage text;
