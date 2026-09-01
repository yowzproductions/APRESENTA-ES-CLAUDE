-- Filiais/locais
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now()
);

alter table return_cases add column branch_id uuid references branches(id);
create index idx_return_cases_branch_id on return_cases(branch_id);

-- Chassi do veículo (visão em lista compacta pede placa OU chassi)
alter table vehicles add column chassis text;
create unique index idx_vehicles_chassis on vehicles(chassis) where chassis is not null;

-- Status do convite/perfil (admin convida por e-mail; pessoa define senha no
-- primeiro login)
create type profile_status as enum ('convidado', 'ativo', 'desativado');
alter table profiles add column status profile_status not null default 'convidado';
alter table profiles add column invited_by uuid references profiles(id);
alter table profiles add column invited_at timestamptz not null default now();

-- Log unificado de movimentações — quem fez o quê, quando, em qual caso.
-- Complementa as tabelas de auditoria específicas (case_status_history,
-- optimization_removed_items, etc.) com uma trilha única e legível.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references return_cases(id) on delete cascade,
  actor_id uuid references profiles(id),
  actor_email text,
  action text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_activity_log_case_id on activity_log(case_id);
create index idx_activity_log_created_at on activity_log(created_at desc);

alter table branches enable row level security;
alter table activity_log enable row level security;

create policy "authenticated_all" on branches for all using ((select auth.role()) = 'authenticated');
create policy "read_authenticated" on activity_log for select using ((select auth.role()) = 'authenticated');
create policy "insert_authenticated" on activity_log for insert with check ((select auth.role()) = 'authenticated');

-- Admin precisa poder gerenciar perfis de outros usuários (convite, papel).
-- Helper security definer evita recursão de RLS na própria tabela profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

revoke execute on function public.is_admin() from anon, public;
grant execute on function public.is_admin() to authenticated;

create policy "admin_manage_profiles" on profiles for all using (public.is_admin());
