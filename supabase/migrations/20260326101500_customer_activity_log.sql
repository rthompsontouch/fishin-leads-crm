begin;

create table if not exists public.customer_activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  activity_type text not null,
  summary text not null,
  target_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_activity_events_owner_customer_created_idx
  on public.customer_activity_events (owner_id, customer_id, created_at desc);

alter table public.customer_activity_events enable row level security;

drop policy if exists "customer_activity_events_select_own" on public.customer_activity_events;
create policy "customer_activity_events_select_own" on public.customer_activity_events
for select
using (owner_id = auth.uid());

drop policy if exists "customer_activity_events_insert_own" on public.customer_activity_events;
create policy "customer_activity_events_insert_own" on public.customer_activity_events
for insert
with check (owner_id = auth.uid());

drop policy if exists "customer_activity_events_update_own" on public.customer_activity_events;
create policy "customer_activity_events_update_own" on public.customer_activity_events
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "customer_activity_events_delete_own" on public.customer_activity_events;
create policy "customer_activity_events_delete_own" on public.customer_activity_events
for delete
using (owner_id = auth.uid());

create or replace function public.append_customer_activity_event(
  p_owner_id uuid,
  p_customer_id uuid,
  p_activity_type text,
  p_summary text,
  p_target_path text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_activity_events (
    owner_id,
    customer_id,
    activity_type,
    summary,
    target_path,
    metadata
  )
  values (
    p_owner_id,
    p_customer_id,
    p_activity_type,
    p_summary,
    p_target_path,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.trg_customer_activity_on_customer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if row(new.*) is distinct from row(old.*) then
    perform public.append_customer_activity_event(
      new.owner_id,
      new.id,
      'customer.updated',
      'Customer account information updated',
      '/customers/' || new.id::text,
      jsonb_build_object('customer_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_activity_on_customer_update on public.customers;
create trigger trg_customer_activity_on_customer_update
after update on public.customers
for each row execute function public.trg_customer_activity_on_customer_update();

create or replace function public.trg_customer_activity_on_customer_note_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_owner_id uuid;
  v_note_id uuid;
  v_type text;
  v_summary text;
begin
  if tg_op = 'DELETE' then
    v_customer_id := old.customer_id;
    v_owner_id := old.owner_id;
    v_note_id := old.id;
    v_type := 'customer_note.deleted';
    v_summary := 'Customer note deleted';
  elsif tg_op = 'UPDATE' then
    v_customer_id := new.customer_id;
    v_owner_id := new.owner_id;
    v_note_id := new.id;
    v_type := 'customer_note.updated';
    v_summary := 'Customer note edited';
  else
    v_customer_id := new.customer_id;
    v_owner_id := new.owner_id;
    v_note_id := new.id;
    v_type := 'customer_note.created';
    v_summary := 'New customer note added';
  end if;

  perform public.append_customer_activity_event(
    v_owner_id,
    v_customer_id,
    v_type,
    v_summary,
    '/customers/' || v_customer_id::text || '/notes/' || v_note_id::text,
    jsonb_build_object('note_id', v_note_id, 'op', tg_op)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_activity_customer_notes_iud on public.customer_notes;
create trigger trg_customer_activity_customer_notes_iud
after insert or update or delete on public.customer_notes
for each row execute function public.trg_customer_activity_on_customer_note_change();

create or replace function public.trg_customer_activity_on_jobs_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary text;
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := 'job.created';
    v_summary := 'New upcoming job scheduled';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'Completed' then
    v_type := 'job.completed';
    v_summary := 'Job marked complete';
  elsif tg_op = 'UPDATE' then
    v_type := 'job.updated';
    v_summary := 'Upcoming job updated';
  else
    return new;
  end if;

  perform public.append_customer_activity_event(
    new.owner_id,
    new.customer_id,
    v_type,
    v_summary,
    '/jobs/' || new.id::text,
    jsonb_build_object('job_id', new.id, 'quote_id', new.quote_id, 'status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists trg_customer_activity_jobs_iu on public.jobs;
create trigger trg_customer_activity_jobs_iu
after insert or update on public.jobs
for each row execute function public.trg_customer_activity_on_jobs_change();

create or replace function public.trg_customer_activity_on_service_entries_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_customer_activity_event(
      new.owner_id,
      new.customer_id,
      'service.created',
      'Service entry added to history',
      '/customers/' || new.customer_id::text,
      jsonb_build_object('service_id', new.id, 'job_id', new.job_id)
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.append_customer_activity_event(
      old.owner_id,
      old.customer_id,
      'service.deleted',
      'Service entry removed from history',
      '/customers/' || old.customer_id::text,
      jsonb_build_object('service_id', old.id, 'job_id', old.job_id)
    );
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_activity_service_entries_id on public.service_entries;
create trigger trg_customer_activity_service_entries_id
after insert or delete on public.service_entries
for each row execute function public.trg_customer_activity_on_service_entries_change();

create or replace function public.trg_customer_activity_on_lead_converted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.converted_customer_id is distinct from new.converted_customer_id
    and new.converted_customer_id is not null then
    perform public.append_customer_activity_event(
      new.owner_id,
      new.converted_customer_id,
      'lead.converted',
      'Lead converted/merged into this customer',
      '/leads/' || new.id::text,
      jsonb_build_object('lead_id', new.id, 'lead_status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_activity_on_lead_converted on public.leads;
create trigger trg_customer_activity_on_lead_converted
after update on public.leads
for each row execute function public.trg_customer_activity_on_lead_converted();

revoke all on function public.append_customer_activity_event(uuid, uuid, text, text, text, jsonb) from public;
revoke all on function public.append_customer_activity_event(uuid, uuid, text, text, text, jsonb) from anon;
revoke all on function public.append_customer_activity_event(uuid, uuid, text, text, text, jsonb) from authenticated;

commit;

