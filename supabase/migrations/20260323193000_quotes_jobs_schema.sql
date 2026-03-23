begin;

-- =============================================================================
-- 1) Lead pipeline: add linear statuses
-- =============================================================================
alter type public.lead_status add value if not exists 'Quoted';
alter type public.lead_status add value if not exists 'Won';
alter type public.lead_status add value if not exists 'Lost';

-- Capture optional lead details/message.
alter table public.leads
  add column if not exists details text,
  add column if not exists converted_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists converted_at timestamptz null;

-- =============================================================================
-- 2) Enums
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum (
      'Draft',
      'Sent',
      'Won',
      'Lost'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum (
      'Scheduled',
      'Completed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_recurrence_unit') then
    create type public.job_recurrence_unit as enum (
      'weekly',
      'biweekly',
      'monthly'
    );
  end if;
end
$$;

-- =============================================================================
-- 3) Quotes (potential work)
-- =============================================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- These can be null if the lead/customer is deleted later.
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,

  -- Snapshot recipient info for sending and history.
  recipient_name text,
  recipient_email text,
  recipient_phone text,

  status public.quote_status not null default 'Draft',
  price_amount numeric(12, 2) not null,
  price_currency text not null default 'USD',
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  sent_at timestamptz null,
  won_at timestamptz null,
  lost_at timestamptz null
);

create index if not exists quotes_owner_created_at_idx
  on public.quotes (owner_id, created_at desc);

create index if not exists quotes_owner_lead_idx
  on public.quotes (owner_id, lead_id);

create index if not exists quotes_owner_customer_idx
  on public.quotes (owner_id, customer_id);

alter table public.quotes enable row level security;

create policy "quotes_select_own" on public.quotes
for select
using (owner_id = auth.uid());

create policy "quotes_insert_own" on public.quotes
for insert
with check (
  owner_id = auth.uid()
  and (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.owner_id = auth.uid()
    )
  )
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id
        and c.owner_id = auth.uid()
    )
  )
);

create policy "quotes_update_own" on public.quotes
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.owner_id = auth.uid()
    )
  )
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id = customer_id
        and c.owner_id = auth.uid()
    )
  )
);

create policy "quotes_delete_own" on public.quotes
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_quotes_updated_at on public.quotes;
create trigger trg_quotes_updated_at
before update on public.quotes
for each row execute function public.set_updated_at();

-- Creating a quote should move the lead into the Quoted stage.
create or replace function public.set_lead_status_on_quote_created()
returns trigger as $$
begin
  if NEW.lead_id is not null then
    update public.leads
    set status = 'Quoted'
    where id = NEW.lead_id
      and owner_id = NEW.owner_id
      and status in ('New', 'Contacted');
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_set_lead_status_on_quote_created on public.quotes;
create trigger trg_set_lead_status_on_quote_created
after insert on public.quotes
for each row execute function public.set_lead_status_on_quote_created();

-- When a quote becomes Won/Lost, update the lead pipeline status.
create or replace function public.set_lead_status_on_quote_status_change()
returns trigger as $$
begin
  if NEW.lead_id is not null and NEW.status in ('Won', 'Lost') then
    update public.leads
    set status = NEW.status
    where id = NEW.lead_id
      and owner_id = NEW.owner_id;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_set_lead_status_on_quote_status_change on public.quotes;
create trigger trg_set_lead_status_on_quote_status_change
after update on public.quotes
for each row execute function public.set_lead_status_on_quote_status_change();

-- =============================================================================
-- 4) Normalized quote line items
-- =============================================================================
create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  quote_id uuid not null references public.quotes(id) on delete cascade,

  description text not null,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_line_items_owner_quote_idx
  on public.quote_line_items (owner_id, quote_id);

alter table public.quote_line_items enable row level security;

create policy "quote_line_items_select_own" on public.quote_line_items
for select
using (owner_id = auth.uid());

create policy "quote_line_items_insert_own" on public.quote_line_items
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
);

create policy "quote_line_items_update_own" on public.quote_line_items
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
);

create policy "quote_line_items_delete_own" on public.quote_line_items
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_quote_line_items_updated_at on public.quote_line_items;
create trigger trg_quote_line_items_updated_at
before update on public.quote_line_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- 5) Quote attachments (photos)
-- =============================================================================
create table if not exists public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  quote_id uuid not null references public.quotes(id) on delete cascade,

  file_name text not null,
  content_type text,

  storage_bucket text not null default 'quote-images',
  storage_path text not null,

  created_at timestamptz not null default now()
);

create index if not exists quote_attachments_owner_quote_idx
  on public.quote_attachments (owner_id, quote_id, created_at desc);

alter table public.quote_attachments enable row level security;

create policy "quote_attachments_select_own" on public.quote_attachments
for select
using (owner_id = auth.uid());

create policy "quote_attachments_insert_own" on public.quote_attachments
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
);

create policy "quote_attachments_update_own" on public.quote_attachments
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
);

create policy "quote_attachments_delete_own" on public.quote_attachments
for delete
using (owner_id = auth.uid());

-- =============================================================================
-- 6) Jobs (scheduled work)
-- =============================================================================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  lead_id uuid references public.leads(id) on delete set null,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,

  status public.job_status not null default 'Scheduled',
  scheduled_date date not null,
  notes text,

  is_recurring boolean not null default false,
  recurrence_unit public.job_recurrence_unit,

  reminder_at timestamptz null,
  reminder_sent_at timestamptz null,

  last_completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint jobs_recurrence_unit_valid
  check (
    (is_recurring = true and recurrence_unit is not null)
    or (is_recurring = false and recurrence_unit is null)
  )
);

create index if not exists jobs_owner_scheduled_idx
  on public.jobs (owner_id, status, scheduled_date desc);

create index if not exists jobs_owner_customer_idx
  on public.jobs (owner_id, customer_id, status, scheduled_date desc);

alter table public.jobs enable row level security;

create policy "jobs_select_own" on public.jobs
for select
using (owner_id = auth.uid());

create policy "jobs_insert_own" on public.jobs
for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
  and (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.owner_id = auth.uid()
    )
  )
);

create policy "jobs_update_own" on public.jobs
for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.quotes q
    where q.id = quote_id
      and q.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.customers c
    where c.id = customer_id
      and c.owner_id = auth.uid()
  )
  and (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.owner_id = auth.uid()
    )
  )
);

create policy "jobs_delete_own" on public.jobs
for delete
using (owner_id = auth.uid());

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- Link service history (service_entries) back to jobs.
alter table public.service_entries
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

create index if not exists service_entries_owner_job_date_idx
  on public.service_entries (owner_id, job_id, service_date desc);

-- =============================================================================
-- 7) Storage: quote-images bucket + RLS
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('quote-images', 'quote-images', false)
on conflict (id) do nothing;

-- Object paths must start with `{owner_id}/...` for RLS.
drop policy if exists "quote-images_objects_select_own" on storage.objects;
drop policy if exists "quote-images_objects_insert_own" on storage.objects;
drop policy if exists "quote-images_objects_update_own" on storage.objects;
drop policy if exists "quote-images_objects_delete_own" on storage.objects;

create policy "quote-images_objects_select_own" on storage.objects
for select
using (
  bucket_id = 'quote-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "quote-images_objects_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'quote-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "quote-images_objects_update_own" on storage.objects
for update
using (
  bucket_id = 'quote-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'quote-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "quote-images_objects_delete_own" on storage.objects
for delete
using (
  bucket_id = 'quote-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Cleanup: remove storage objects when quote_attachments rows are deleted.
create or replace function public.trg_cleanup_quote_attachment_storage()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if old.storage_path is null or btrim(old.storage_path) = '' then
    return old;
  end if;

  if split_part(old.storage_path, '/', 1) <> old.owner_id::text then
    raise warning 'quote attachment path prefix does not match owner_id; skipping storage delete';
    return old;
  end if;

  delete from storage.objects
  where bucket_id = old.storage_bucket
    and name = old.storage_path;

  return old;
end;
$$;

drop trigger if exists trg_quote_attachment_storage_cleanup on public.quote_attachments;
create trigger trg_quote_attachment_storage_cleanup
after delete on public.quote_attachments
for each row execute function public.trg_cleanup_quote_attachment_storage();

revoke all on function public.trg_cleanup_quote_attachment_storage() from public;
revoke all on function public.trg_cleanup_quote_attachment_storage() from anon;
revoke all on function public.trg_cleanup_quote_attachment_storage() from authenticated;

-- =============================================================================
-- 8) Triggers: lead status when contacting
-- =============================================================================
create or replace function public.set_lead_status_on_contact_notes()
returns trigger as $$
begin
  if new.type in ('call', 'email_sent', 'meeting') then
    update public.leads
    set status = 'Contacted'
    where id = new.lead_id
      and owner_id = new.owner_id
      and status = 'New';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_lead_status_on_contact_notes on public.lead_notes;
create trigger trg_set_lead_status_on_contact_notes
after insert on public.lead_notes
for each row execute function public.set_lead_status_on_contact_notes();

commit;

