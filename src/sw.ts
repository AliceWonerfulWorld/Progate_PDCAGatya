/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// oxlint-disable-next-line no-underscore-dangle -- workbox-injected precache manifest global.
precacheAndRoute(self.__WB_MANIFEST)

interface AtRiskPushPayload {
  title: string
  body: string
  url: string
}

const DEFAULT_PAYLOAD: AtRiskPushPayload = { title: 'PDCA GACHA', body: '', url: '/' }

self.addEventListener('push', (event) => {
  let payload = DEFAULT_PAYLOAD
  try {
    if (event.data) payload = { ...DEFAULT_PAYLOAD, ...event.data.json() }
  } catch {
    // 壊れたpayloadは既定値にフォールバックする。SWのイベントハンドラ内では例外を投げない。
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = clientsList.find((client): client is WindowClient => 'focus' in client)
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(targetUrl)
        return
      }
      await self.clients.openWindow(targetUrl)
    })(),
  )
})
