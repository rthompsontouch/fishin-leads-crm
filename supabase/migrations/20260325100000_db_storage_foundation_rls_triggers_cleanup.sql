-- Database + storage foundation: RLS completion, note triggers, storage cleanup, indexes.
-- Run after prior migrations. Requires postgres/superuser privileges (Supabase `db push`).

begin;

-- -----------------------------------------------------------------------------
-- 1) Profiles: allow users to delete their own row (e.g. account deletion flows)
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
for delete
using (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2) Integrations: one row per API key hash (edge function + app assume uniqueness)
-- -----------------------------------------------------------------------------
create unique index if not exists integrations_api_key_hash_uidx
  on public.integrations (api_key_hash);

-- -----------------------------------------------------------------------------
-- 3) Lead / customer notes: keep last_contacted_at in sync on INSERT and UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.set_lead_last_contacted_at()
returns trigger
language plpgsql
as $$
begin
  if new.type in ('call', 'email_sent', 'meeting') then
    update public.leads
    set last_contacted_at = new.occurred_at
    where id = new.lead_id
      and owner_id = new.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_lead_last_contacted_at on public.lead_notes;
create trigger trg_set_lead_last_contacted_at
after insert or update on public.lead_notes
for each row execute function public.set_lead_last_contacted_at();

create or replace function public.set_customer_last_contacted_at()
returns trigger
language plpgsql
as $$
begin
  if new.type in ('call', 'email_sent', 'meeting') then
    update public.customers
    set last_contacted_at = new.occurred_at
    where id = new.customer_id
      and owner_id = new.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_customer_last_contacted_at on public.customer_notes;
create trigger trg_set_customer_last_contacted_at
after insert or update on public.customer_notes
for each row execute function public.set_customer_last_contacted_at();

-- -----------------------------------------------------------------------------
-- 4) Storage cleanup: SECURITY DEFINER so deletes succeed regardless of caller RLS
--    Path must start with owner uuid (same rules as app + storage policies).
-- -----------------------------------------------------------------------------

create or replace function public.trg_cleanup_profile_company_logo_storage()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  path_to_remove text;
  uid uuid;
begin
  if tg_op = 'delete' then
    path_to_remove := old.company_logo_path;
    uid := old.id;
  elsif tg_op = 'update' then
    if old.company_logo_path is not distinct from new.company_logo_path then
      return new;
    end if;
    path_to_remove := old.company_logo_path;
    uid := old.id;
  else
    return new;
  end if;

  if path_to_remove is null or btrim(path_to_remove) = '' then
    return coalesce(new, old);
  end if;

  if split_part(path_to_remove, '/', 1) <> uid::text then
    raise warning 'company logo path prefix does not match profile id; skipping storage delete';
    return coalesce(new, old);
  end if;

  delete from storage.objects
  where bucket_id = 'company-logos'
    and name = path_to_remove;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_profiles_company_logo_storage_cleanup on public.profiles;
create trigger trg_profiles_company_logo_storage_cleanup
after delete or update on public.profiles
for each row execute function public.trg_cleanup_profile_company_logo_storage();

revoke all on function public.trg_cleanup_profile_company_logo_storage() from public;
revoke all on function public.trg_cleanup_profile_company_logo_storage() from anon;
revoke all on function public.trg_cleanup_profile_company_logo_storage() from authenticated;

create or replace function public.trg_cleanup_service_attachment_storage()
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
    raise warning 'service attachment path prefix does not match owner_id; skipping storage delete';
    return old;
  end if;

  delete from storage.objects
  where bucket_id = old.storage_bucket
    and name = old.storage_path;

  return old;
end;
$$;

drop trigger if exists trg_service_attachment_storage_cleanup on public.service_attachments;
create trigger trg_service_attachment_storage_cleanup
after delete on public.service_attachments
for each row execute function public.trg_cleanup_service_attachment_storage();

revoke all on function public.trg_cleanup_service_attachment_storage() from public;
revoke all on function public.trg_cleanup_service_attachment_storage() from anon;
revoke all on function public.trg_cleanup_service_attachment_storage() from authenticated;

-- -----------------------------------------------------------------------------
-- 5) Comments (discovery in Dashboard SQL editor)
-- -----------------------------------------------------------------------------
comment on function public.trg_cleanup_profile_company_logo_storage() is
  'Removes company-logos storage object when profile is deleted or company_logo_path changes.';
comment on function public.trg_cleanup_service_attachment_storage() is
  'Removes service-images (or other) storage object when service_attachments row is deleted.';

commit;
