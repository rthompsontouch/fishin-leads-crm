-- Fishin Leads CRM MVP schema
-- Creates tables, enums, triggers, RLS, and Storage policies.

begin;

create extension if not exists pgcrypto;

-- -----------------------------
-- Shared trigger utilities
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- -----------------------------
-- Enums
-- -----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum (
      'New',
      'Contacted',
      'Qualified',
      'Unqualified',
      'ClosedWon',
      'ClosedLost'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'note_type') then
    create type public.note_type as enum (
      'note',
      'call',
      'email_sent',
      'meeting',
      'other'
    );
  end if;
end
$$;

-- -----------------------------
-- Profiles (optional display info)
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -----------------------------
-- Leads (export uncontacted = last_contacted_at is null)
-- -----------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  first_name text,
  last_name text,
  company text,

  email text,
  phone text,

  source text,
  status public.lead_status not null default 'New',
  last_contacted_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_name_required check (first_name is not null or last_name is not null)
);

create index if not exists leads_owner_created_at_idx
  on public.leads (owner_id, created_at desc);

create index if not exists leads_owner_last_contacted_at_idx
  on public.leads (owner_id, last_contacted_at);

create index if not exists leads_owner_status_idx
  on public.leads (owner_id, status);

alter table public.leads enable row level security;

create policy "leads_select_own" on public.leads
for select
using (owner_id = auth.uid());

create policy "leads_insert_own" on public.leads
for insert
with check (owner_id = auth.uid());

create policy "leads_update_own" on public.leads
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "leads_delete_own" on public.leads
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- -----------------------------
-- Lead notes/timeline
-- -----------------------------
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  lead_id uuid not null references public.leads(id) on delete cascade,
  type public.note_type not null default 'note',

  occurred_at timestamptz not null default now(),
  body text not null,

  created_at timestamptz not null default now()
);

create index if not exists lead_notes_owner_lead_idx
  on public.lead_notes (owner_id, lead_id, occurred_at desc);

alter table public.lead_notes enable row level security;

create policy "lead_notes_select_own" on public.lead_notes
for select
using (owner_id = auth.uid());

create policy "lead_notes_insert_own" on public.lead_notes
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.leads l
    where l.id = lead_id
      and l.owner_id = auth.uid()
  )
);

create policy "lead_notes_update_own" on public.lead_notes
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.leads l
    where l.id = lead_id
      and l.owner_id = auth.uid()
  )
);

create policy "lead_notes_delete_own" on public.lead_notes
for delete
using (owner_id = auth.uid());

-- Trigger: keep leads.last_contacted_at in sync.
create or replace function public.set_lead_last_contacted_at()
returns trigger as $$
begin
  if NEW.type in ('call', 'email_sent', 'meeting') then
    update public.leads
    set last_contacted_at = NEW.occurred_at
    where id = NEW.lead_id
      and owner_id = NEW.owner_id;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_set_lead_last_contacted_at on public.lead_notes;
create trigger trg_set_lead_last_contacted_at
after insert on public.lead_notes
for each row execute function public.set_lead_last_contacted_at();

-- -----------------------------
-- Customers
-- -----------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  email text,
  phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_owner_created_at_idx
  on public.customers (owner_id, created_at desc);

alter table public.customers enable row level security;

create policy "customers_select_own" on public.customers
for select
using (owner_id = auth.uid());

create policy "customers_insert_own" on public.customers
for insert
with check (owner_id = auth.uid());

create policy "customers_update_own" on public.customers
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "customers_delete_own" on public.customers
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- -----------------------------
-- Customer notes/timeline
-- -----------------------------
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  customer_id uuid not null references public.customers(id) on delete cascade,
  type public.note_type not null default 'note',

  occurred_at timestamptz not null default now(),
  body text not null,

  created_at timestamptz not null default now()
);

create index if not exists customer_notes_owner_customer_idx
  on public.customer_notes (owner_id, customer_id, occurred_at desc);

alter table public.customer_notes enable row level security;

create policy "customer_notes_select_own" on public.customer_notes
for select
using (owner_id = auth.uid());

create policy "customer_notes_insert_own" on public.customer_notes
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "customer_notes_update_own" on public.customer_notes
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "customer_notes_delete_own" on public.customer_notes
for delete
using (owner_id = auth.uid());

-- -----------------------------
-- Service entries (history)
-- -----------------------------
create table if not exists public.service_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  customer_id uuid not null references public.customers(id) on delete cascade,

  service_date date not null,
  description text not null,

  price_amount numeric(12, 2),
  price_currency text not null default 'USD',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_entries_owner_customer_date_idx
  on public.service_entries (owner_id, customer_id, service_date desc);

alter table public.service_entries enable row level security;

create policy "service_entries_select_own" on public.service_entries
for select
using (owner_id = auth.uid());

create policy "service_entries_insert_own" on public.service_entries
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "service_entries_update_own" on public.service_entries
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "service_entries_delete_own" on public.service_entries
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_service_entries_updated_at on public.service_entries;
create trigger trg_service_entries_updated_at
before update on public.service_entries
for each row execute function public.set_updated_at();

-- -----------------------------
-- Service attachments (multiple images)
-- -----------------------------
create table if not exists public.service_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  service_id uuid not null references public.service_entries(id) on delete cascade,

  file_name text not null,
  content_type text,

  storage_bucket text not null default 'service-images',
  storage_path text not null, -- storage.objects.name (e.g. "{owner_id}/{service_id}/{file_name}")

  created_at timestamptz not null default now()
);

create index if not exists service_attachments_owner_service_idx
  on public.service_attachments (owner_id, service_id, created_at desc);

alter table public.service_attachments enable row level security;

create policy "service_attachments_select_own" on public.service_attachments
for select
using (owner_id = auth.uid());

create policy "service_attachments_insert_own" on public.service_attachments
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.service_entries s
    where s.id = service_id
      and s.owner_id = auth.uid()
  )
);

create policy "service_attachments_update_own" on public.service_attachments
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.service_entries s
    where s.id = service_id
      and s.owner_id = auth.uid()
  )
);

create policy "service_attachments_delete_own" on public.service_attachments
for delete
using (owner_id = auth.uid());

-- -----------------------------
-- Integrations (API keys for website lead capture)
-- -----------------------------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  source_label text not null default 'Website',

  api_key_hash text not null,
  default_status public.lead_status not null default 'New',

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_rotated_at timestamptz null
);

create index if not exists integrations_owner_enabled_idx
  on public.integrations (owner_id, enabled);

alter table public.integrations enable row level security;

create policy "integrations_select_own" on public.integrations
for select
using (owner_id = auth.uid());

create policy "integrations_insert_own" on public.integrations
for insert
with check (owner_id = auth.uid());

create policy "integrations_update_own" on public.integrations
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "integrations_delete_own" on public.integrations
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_integrations_updated_at on public.integrations;
create trigger trg_integrations_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

-- -----------------------------
-- Storage: service-images bucket
-- -----------------------------
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', false)
on conflict (id) do nothing;

-- Supabase typically already enables RLS on `storage.objects`.
-- Your CLI user may not own `storage.objects`, so avoid `ALTER TABLE ... enable row level security`.

drop policy if exists "service-images_objects_select_own" on storage.objects;
drop policy if exists "service-images_objects_insert_own" on storage.objects;
drop policy if exists "service-images_objects_update_own" on storage.objects;
drop policy if exists "service-images_objects_delete_own" on storage.objects;

create policy "service-images_objects_select_own" on storage.objects
for select
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "service-images_objects_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "service-images_objects_update_own" on storage.objects
for update
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "service-images_objects_delete_own" on storage.objects
for delete
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

commit;

