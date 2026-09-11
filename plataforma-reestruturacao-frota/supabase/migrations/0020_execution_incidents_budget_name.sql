-- Permite anexar um PDF de orçamento complementar inteiro durante a
-- execução (demanda não prevista no mesmo processo), em vez de só lançar
-- imprevistos um a um manualmente. budget_name identifica de qual
-- orçamento complementar cada item veio (nulo para os lançados manualmente).
alter table execution_incidents add column budget_name text;
