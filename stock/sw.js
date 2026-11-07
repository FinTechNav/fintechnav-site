// Retire old offline caches containing the former PIN gate and token-bearing code.
// Portfolio and API requests remain network-only.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('redday-')).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
