begin;

-- Tier for subscription / plan
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_tier') then
    create type public.account_tier as enum (
      'Freemium',
      'Basic',
      'Advanced',
      'Enterprise'
    );
  end if;
end
$$;

-- Extend profiles to store the signup / company/account details.
-- We keep existing columns (display_name, company_name) and add the rest.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists website text,
  add column if not exists tier public.account_tier not null default 'Freemium';

-- If display_name is empty but first/last exist, fill it (best-effort).
update public.profiles
set display_name = coalesce(display_name, concat_ws(' ', first_name, last_name))
where (display_name is null or display_name = '')
  and (first_name is not null or last_name is not null);

commit;

