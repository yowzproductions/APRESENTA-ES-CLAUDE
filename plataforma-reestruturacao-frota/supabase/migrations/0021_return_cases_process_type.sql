-- Segundo tipo de processo, mais curto: Ativação (cadastro → programação →
-- vistoria → finalizado, sem orçamento/otimização/execução), ao lado do
-- processo de Retomada já existente (fluxo completo).
alter table return_cases add column process_type text not null default 'retomada' check (process_type in ('retomada','ativacao'));
