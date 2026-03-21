begin;

-- Public path inside Storage bucket `company-logos`, e.g. "{user_id}/logo.png"
alter table public.profiles
  add column if not exists company_logo_path text;

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

drop policy if exists "company_logos_select_public" on storage.objects;
drop policy if exists "company_logos_insert_own" on storage.objects;
drop policy if exists "company_logos_update_own" on storage.objects;
drop policy if exists "company_logos_delete_own" on storage.objects;

-- Public read (bucket is public; objects still scoped by path prefix = auth uid)
create policy "company_logos_select_public" on storage.objects
for select
using (bucket_id = 'company-logos');

create policy "company_logos_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "company_logos_update_own" on storage.objects
for update
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "company_logos_delete_own" on storage.objects
for delete
using (
  bucket_id = 'company-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

commit;
