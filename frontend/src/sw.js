import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

const STATIC_CACHE = 'static-v1'
const APP_SHELL = '/index.html'

/* ---------- install ---------- */
self.addEventListener('install', () => {
  self.skipWaiting()
})

cleanupOutdatedCaches()
// Vite inyecta aquí los assets con hash de producción.
precacheAndRoute(self.__WB_MANIFEST)

/* ---------- activate ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys()
      await Promise.all(
        claves
          .filter((clave) => clave.startsWith('static-') && clave !== STATIC_CACHE)
          .map((clave) => caches.delete(clave))
      )
      await self.clients.claim()
    })()
  )
})

/* ---------- fetch ---------- */

// Estáticos: Stale-While-Revalidate (responde rápido y actualiza en segundo plano).
registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin && ['style', 'script', 'image', 'font'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// La API nunca se cachea: los reportes viven en IndexedDB hasta confirmarse.
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly())

// Navegación: red primero; si falla, shell precacheado y luego offline.html.
const navigationHandler = async ({ event }) => {
  const { pathname } = new URL(event.request.url)

  try {
    return await fetch(event.request)
  } catch {
    if (pathname === '/' || pathname === APP_SHELL) {
      return (await matchPrecache(APP_SHELL)) ?? Response.error()
    }
    return (await matchPrecache('/offline.html')) ?? Response.error()
  }
}

registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/api\//] }))
