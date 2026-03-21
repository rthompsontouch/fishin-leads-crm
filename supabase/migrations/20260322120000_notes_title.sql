-- Optional titles for lead/customer notes (searchable in app; stored per row).
alter table public.lead_notes
  add column if not exists title text not null default '';

alter table public.customer_notes
  add column if not exists title text not null default '';
