import { supabase } from '../../../lib/supabaseClient'

export type StoredPushSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

async function getUserId() {
  const { data, error } = await supabase!.auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error('Not authenticated')
  return userId
}

export async function getHasMyPushSubscription() {
  const ownerId = await getUserId()
  const { data, error } = await supabase!
    .from('notification_subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function upsertMyPushSubscription(sub: StoredPushSubscription) {
  const ownerId = await getUserId()
  const endpoint = sub.endpoint
  const p256dh = sub.keys.p256dh
  const auth = sub.keys.auth

  const { error } = await supabase!
    .from('notification_subscriptions')
    .upsert(
      {
        owner_id: ownerId,
        endpoint,
        p256dh,
        auth,
      } as any,
      { onConflict: 'owner_id,endpoint' },
    )

  if (error) throw error
}

