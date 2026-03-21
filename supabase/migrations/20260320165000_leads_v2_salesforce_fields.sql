begin;

-- Add Salesforce-like company intelligence fields to leads
alter table public.leads
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists website text;

commit;

