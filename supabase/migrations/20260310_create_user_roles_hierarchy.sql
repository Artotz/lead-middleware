-- Hierarquia de usuários para o app:
-- - admin: acesso completo
-- - standard: acesso padrão (sem criação de apontamento na UI)

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'standard' check (role in ('admin', 'standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create or replace function public.user_roles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_roles_set_updated_at on public.user_roles;
create trigger trg_user_roles_set_updated_at
before update on public.user_roles
for each row
execute function public.user_roles_set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'user_roles_select_own'
  ) then
    create policy user_roles_select_own
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Garante que todo usuário novo receba papel padrão.
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'standard')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_user_role on auth.users;
create trigger on_auth_user_created_user_role
after insert on auth.users
for each row
execute function public.handle_new_user_role();

-- Backfill para usuários já existentes.
insert into public.user_roles (user_id, role)
select id, 'standard'
from auth.users
on conflict (user_id) do nothing;

-- Função utilitária para o front consultar papel atual (fallback: standard).
create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'standard'
  );
$$;

grant select on public.user_roles to authenticated;
grant execute on function public.get_current_user_role() to authenticated;

-- Exemplo para promover um usuário:
-- update public.user_roles
-- set role = 'admin'
-- where user_id = 'UUID_DO_USUARIO';
