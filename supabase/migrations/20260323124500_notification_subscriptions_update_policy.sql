begin;

-- upsert() on notification_subscriptions can execute UPDATE on conflict,
-- so owners need an UPDATE policy in addition to INSERT.
drop policy if exists "notification_subscriptions_update_own" on public.notification_subscriptions;
create policy "notification_subscriptions_update_own" on public.notification_subscriptions
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

commit;

