begin;

-- =============================================================================
-- Web Push foundation (PWA)
-- =============================================================================

-- 1) User subscriptions (browser push endpoints + keys)
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  endpoint text not null,
  p256dh text not null,
  auth text not null,

  created_at timestamptz not null default now()
);

create unique index if not exists notification_subscriptions_owner_endpoint_uidx
  on public.notification_subscriptions (owner_id, endpoint);

alter table public.notification_subscriptions enable row level security;

create policy "notification_subscriptions_select_own" on public.notification_subscriptions
for select
using (owner_id = auth.uid());

create policy "notification_subscriptions_insert_own" on public.notification_subscriptions
for insert
with check (owner_id = auth.uid());

create policy "notification_subscriptions_delete_own" on public.notification_subscriptions
for delete
using (owner_id = auth.uid());

-- 2) Queue table for lead-notification push events
-- Webhook: Supabase can call an Edge Function on INSERT into this table.
create table if not exists public.lead_push_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists lead_push_events_owner_created_at_idx
  on public.lead_push_events (owner_id, created_at desc);

-- 3) Trigger: enqueue a push event whenever a lead is inserted.
create or replace function public.enqueue_lead_push_event()
returns trigger as $$
begin
  insert into public.lead_push_events (owner_id, lead_id)
  values (new.owner_id, new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enqueue_lead_push_event on public.leads;
create trigger trg_enqueue_lead_push_event
after insert on public.leads
for each row execute function public.enqueue_lead_push_event();

commit;

