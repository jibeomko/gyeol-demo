// Only public synthetic-demo app files are cached; APKs and requests outside the app scope are excluded.
const CACHE = 'gyeol-demo-b3ce9567086b899f';
const PATHS = ["./", "./assets/AssetManifest.bin", "./assets/AssetManifest.bin.json", "./assets/FontManifest.json", "./assets/NOTICES", "./assets/assets/fonts/NotoSansKR.ttf", "./assets/assets/fonts/OFL.txt", "./assets/fonts/MaterialIcons-Regular.otf", "./assets/fonts/fallback/Roboto-Regular.ttf", "./assets/shaders/ink_sparkle.frag", "./assets/shaders/stretch_effect.frag", "./canvaskit/canvaskit.js", "./canvaskit/canvaskit.wasm", "./favicon.png", "./flutter.js", "./flutter_bootstrap.js", "./icons/Icon-192.png", "./icons/Icon-512.png", "./icons/Icon-maskable-192.png", "./icons/Icon-maskable-512.png", "./index.html", "./main.dart.js", "./manifest.json", "./pwa.css", "./pwa.js", "./version.json"];
const URLS = new Set(PATHS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all([...URLS].map(async url => {
        // 'no-cache' revalidates instead of re-downloading: the 10 MB font and the 7 MB
        // CanvasKit come back as 304s when they have not changed, which is what keeps an
        // update from costing a full 20 MB on a phone.
        const response = await fetch(new Request(url, {cache: 'no-cache', redirect: 'error'}));
        if (!response.ok) throw new Error('Unavailable app asset');
        await cache.put(url, response);
      }));
    } catch (error) { await caches.delete(CACHE); throw error; }
    // Take over from the previous build at once. Without this the new worker sits in
    // "waiting" until every tab of the site is closed, so a phone that keeps the demo
    // open can serve a stale build indefinitely. Not awaited: it settles on activation,
    // which cannot happen until this install handler has returned.
    self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(name => name.startsWith('gyeol-demo-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  url.search = ''; url.hash = '';
  if (!URLS.has(url.href)) return;
  // The document decides which build the customer sees, so it comes from the network
  // whenever there is one; the cache is the offline fallback. Assets stay cache-first,
  // which is what keeps the offline relaunch fast.
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE);
        await cache.put(url.href, fresh.clone());
        return fresh;
      } catch (error) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.href)) || fetch(event.request);
  })());
});
