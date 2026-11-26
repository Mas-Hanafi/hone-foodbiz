// Lets the cashier screen open without a connection. Sales made offline go to the device queue
// (src/lib/sale-queue.ts); this worker only keeps the last copy of /kasir and its static files.
// The sign-in page deletes the saved /kasir copy (src/app/login/forget-offline-page.tsx).
const PAGES = "pos-pages-v1";
const STATIC = "pos-static-v1";
const KASIR = "/kasir";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC];
      for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build files never change under the same name.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode !== "navigate") return;

  if (url.pathname === KASIR) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && !response.redirected) {
            const cache = await caches.open(PAGES);
            await cache.put(KASIR, response.clone());
          }
          return response;
        } catch {
          const saved = await caches.match(KASIR, { cacheName: PAGES });
          return saved ?? new Response("Offline. Buka layar kasir sekali saat online agar tersedia tanpa koneksi.", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
  }
});
