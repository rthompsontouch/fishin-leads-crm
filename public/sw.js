/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Activate worker immediately on install.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function getUrl(data) {
  const url = data?.url
  if (!url) return '/'
  if (/^https?:\/\//i.test(url)) return url
  return self.location.origin + url
}

self.addEventListener('push', (event) => {
  const text = event.data ? event.data.text() : ''
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  const title = data?.title || 'New notification'
  const body = data?.body || ''
  const url = getUrl(data)

  const options = {
    body,
    data: { url },
    // Deduplicate multiple lead pushes to the same page.
    tag: `lead-${url}`,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification?.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus()
        }
        if (self.clients.openWindow) return self.clients.openWindow(url)
      }),
  )
})

