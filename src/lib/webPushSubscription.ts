import { upsertMyPushSubscription } from '../features/notifications/api/notificationsApi'

function urlBase64ToUint8Array(base64String: string) {
  // Some env setups accidentally include quotes. Strip them to keep base64url valid.
  const cleaned = base64String.trim().replace(/^"+|"+$/g, '')

  // base64url -> base64
  if (!/^[A-Za-z0-9_-]+$/.test(cleaned)) {
    throw new Error(
      'VAPID public key is not valid base64url. Ensure it has no quotes/newlines and matches VITE_VAPID_PUBLIC_KEY exactly from .env.',
    )
  }

  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4)
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getServiceWorkerUrl() {
  const base = (import.meta.env.BASE_URL as string | undefined) || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}sw.js`
}

async function subscribeOnce(registration: ServiceWorkerRegistration, applicationServerKey: BufferSource) {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
}

export async function ensureWebPushSubscribed() {
  if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported')
  if (!('PushManager' in window)) throw new Error('Push not supported')

  if (!window.isSecureContext) {
    // Web Push requires a secure context. Local HTTP can fail in many browsers.
    throw new Error('Web Push requires a secure context (HTTPS). Test this on your HTTPS domain, not plain HTTP localhost.')
  }

  const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim()
  if (!vapidPublicKey) throw new Error('Missing VITE_VAPID_PUBLIC_KEY')
  const vapidKeyInfo = {
    len: vapidPublicKey.length,
    head: vapidPublicKey.slice(0, 10),
    tail: vapidPublicKey.slice(-10),
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(`Notification permission not granted. currentPermission=${permission}`)
  }

  // Register and WAIT until there's an active SW before subscribing.
  // Otherwise some browsers throw "no active service worker".
  // Also confirm `sw.js` is reachable (helps diagnose 404/scope issues).
  const swUrl = getServiceWorkerUrl()
  try {
    const resp = await fetch(swUrl, { cache: 'no-store' })
    if (!resp.ok) {
      throw new Error(`sw.js fetch failed: HTTP ${resp.status}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Cannot reach sw.js. ${msg}`)
  }

  await navigator.serviceWorker.register(swUrl)
  const registration = await navigator.serviceWorker.ready
  if (!registration.active || registration.active.state !== 'activated') {
    // Give the SW a moment to transition to "activated".
    const startedAt = Date.now()
    while (Date.now() - startedAt < 5000) {
      const r = await navigator.serviceWorker.ready
      if (r.active && r.active.state === 'activated') break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
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
  const appServerKeyLen = applicationServerKey.byteLength

  let subscription: PushSubscription
  try {
    subscription = await subscribeOnce(registration, applicationServerKey)
  } catch (e) {
    // Chromium can throw AbortError ("Registration failed - push service error")
    // for stale service worker state or transient push service issues.
    const staleSub = await registration.pushManager.getSubscription()
    if (staleSub) {
      try {
        await staleSub.unsubscribe()
      } catch {
        // best effort
      }
    }
    try {
      await registration.unregister()
    } catch {
      // best effort
    }
    await navigator.serviceWorker.register(swUrl)
    const retryRegistration = await navigator.serviceWorker.ready
    const msg = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : 'UnknownError'
    try {
      subscription = await subscribeOnce(retryRegistration, applicationServerKey)
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2)
      const name2 = e2 instanceof Error ? e2.name : 'UnknownError'
      const swState = retryRegistration.active?.state ?? null
      console.error('[web push] subscribe failed', {
        firstError: { name, msg },
        retryError: { name: name2, msg: msg2 },
        secureContext: window.isSecureContext,
        href: window.location.href,
        swState,
        vapidKeyInfo,
      })
      throw new Error(
        `Push subscribe failed (${name2}). ${msg2}\nsecureContext=${String(
          window.isSecureContext,
        )} swState=${String(swState)}\nurl=${window.location.href}\nappServerKeyLen=${appServerKeyLen}\nvapidKey=len:${vapidKeyInfo.len} head:${vapidKeyInfo.head} tail:${vapidKeyInfo.tail}\nIf this is Chrome desktop, check chrome://gcm-internals shows CONNECTED and disable blockers/firewall/VPN for FCM.`,
      )
    }
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

