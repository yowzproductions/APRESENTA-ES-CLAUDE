-- Multiusuário com controle de acesso por etapa: ao criar o acesso de uma
-- pessoa, o admin escolhe, para cada etapa do workflow, se ela fica oculta,
-- somente leitura ou editável. Ausência de registro = acesso total (editar),
-- para não quebrar contas já existentes antes desse controle existir — só
-- restringe quem o admin explicitamente restringir.
create table stage_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  stage text not null,
  access text not null check (access in ('oculto', 'visualizar', 'editar')),
  unique (profile_id, stage)
);

alter table stage_permissions enable row level security;
create policy "authenticated_all" on stage_permissions for all using ((select auth.role()) = 'authenticated');

-- Criação de acesso com senha padrão (em vez de convite por link): a pessoa
-- é obrigada a trocar a senha no primeiro login.
alter table profiles add column must_change_password boolean not null default true;
