-- Tighten RLS for private service images bucket.
-- Path shape: {owner_id}/{service_id}/{uuid}-{filename}
-- Inserts must target a service_entries row owned by auth.uid().

begin;

insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', false)
on conflict (id) do nothing;

drop policy if exists "service-images_objects_select_own" on storage.objects;
drop policy if exists "service-images_objects_insert_own" on storage.objects;
drop policy if exists "service-images_objects_update_own" on storage.objects;
drop policy if exists "service-images_objects_delete_own" on storage.objects;

-- Read: objects under the user's folder prefix only.
create policy "service-images_objects_select_own" on storage.objects
for select
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Write: must be under own uid; second segment = service id the user owns;
-- third segment = object file (uuid-stem + name).
create policy "service-images_objects_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
  and split_part(name, '/', 2)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and nullif(trim(split_part(name, '/', 3)), '') is not null
  and exists (
    select 1
    from public.service_entries s
    where s.id::text = split_part(name, '/', 2)
      and s.owner_id = auth.uid()
  )
);

-- Updates are rare (no upsert in app). Keep within own prefix; insert rules cover new paths.
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

-- Remove: any object in own prefix (cleanup + app deletes).
create policy "service-images_objects_delete_own" on storage.objects
for delete
using (
  bucket_id = 'service-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

commit;
