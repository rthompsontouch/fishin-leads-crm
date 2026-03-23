begin;

drop trigger if exists trg_enforce_max_lead_notes on public.lead_notes;
drop trigger if exists trg_enforce_max_customer_notes on public.customer_notes;
drop function if exists public.enforce_max_five_notes();

commit;

