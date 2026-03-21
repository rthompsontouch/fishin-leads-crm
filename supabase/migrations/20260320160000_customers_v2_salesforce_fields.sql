begin;

-- Customer lifecycle/status (approx. Salesforce Account-like lifecycle)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_status') then
    create type public.customer_status as enum (
      'Prospect',
      'Active',
      'OnHold',
      'Churned'
    );
  end if;
end
$$;

-- Extend customers with richer sales/relationship fields
alter table public.customers
  add column if not exists status public.customer_status not null default 'Active',
  add column if not exists last_contacted_at timestamptz null,

  -- Primary contact (customer-facing person)
  add column if not exists primary_first_name text,
  add column if not exists primary_last_name text,
  add column if not exists primary_email text,
  add column if not exists primary_phone text,
  add column if not exists primary_title text,

  -- Account-level company info
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists website text,

  -- Billing address (Salesforce-style basic address grouping)
  add column if not exists billing_street text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_country text;

-- Backfill: keep legacy columns consistent (so old rows still display sensibly).
-- If the new primary_* fields are null, populate them from existing email/phone.
update public.customers
set
  primary_email = coalesce(primary_email, email),
  primary_phone = coalesce(primary_phone, phone)
where (primary_email is null or primary_phone is null);

-- Trigger: set customers.last_contacted_at when we insert a customer note indicating contact
create or replace function public.set_customer_last_contacted_at()
returns trigger as $$
begin
  if NEW.type in ('call', 'email_sent', 'meeting') then
    update public.customers
    set last_contacted_at = NEW.occurred_at
    where id = NEW.customer_id
      and owner_id = NEW.owner_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_set_customer_last_contacted_at on public.customer_notes;
create trigger trg_set_customer_last_contacted_at
after insert on public.customer_notes
for each row execute function public.set_customer_last_contacted_at();

commit;

