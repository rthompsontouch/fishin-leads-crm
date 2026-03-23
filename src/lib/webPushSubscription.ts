import { upsertMyPushSubscription } from '../features/notifications/api/notificationsApi'

function urlBase64ToUint8Array(base64String: string) {
  // base64url -> base64
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function ensureWebPushSubscribed() {
  if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported')
  if (!('PushManager' in window)) throw new Error('Push not supported')

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublicKey) throw new Error('Missing VITE_VAPID_PUBLIC_KEY')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  // Register and WAIT until there's an active SW before subscribing.
  // Otherwise some browsers throw "no active service worker".
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready
  if (!registration.active) {
    // Give the SW a moment to transition to "active".
    await new Promise((r) => setTimeout(r, 300))
  }

  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    const json = existing.toJSON()
    if (!json.endpoint) throw new Error('Push subscription endpoint missing.')
    if (!json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Push subscription keys missing.')
    }
    await upsertMyPushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })
    return
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

  let subscription: PushSubscription
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : 'UnknownError'
    throw new Error(`Push subscribe failed (${name}): ${msg}`)
  }

  const json = subscription.toJSON()
  const sub = {
    endpoint: json.endpoint,
    keys: json.keys,
  }

  if (!sub.endpoint) throw new Error('Push subscription endpoint missing.')
  if (!sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error('Push subscription keys missing.')
  }

  await upsertMyPushSubscription({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  })
}

