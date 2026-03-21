-- At most 5 notes per lead and per customer (matches app logic).
create or replace function public.enforce_max_five_notes()
returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  if TG_TABLE_NAME = 'lead_notes' then
    select count(*)::int into cnt from public.lead_notes where lead_id = new.lead_id;
  elsif TG_TABLE_NAME = 'customer_notes' then
    select count(*)::int into cnt from public.customer_notes where customer_id = new.customer_id;
  else
    return new;
  end if;

  if cnt >= 5 then
    raise exception 'MAX_NOTES_EXCEEDED: Maximum of 5 notes per lead or customer.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_lead_notes on public.lead_notes;
create trigger trg_enforce_max_lead_notes
  before insert on public.lead_notes
  for each row execute function public.enforce_max_five_notes();

drop trigger if exists trg_enforce_max_customer_notes on public.customer_notes;
create trigger trg_enforce_max_customer_notes
  before insert on public.customer_notes
  for each row execute function public.enforce_max_five_notes();
