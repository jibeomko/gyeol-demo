// Only public synthetic-demo app files are cached; APKs and requests outside the app scope are excluded.
const CACHE = 'gyeol-demo-47723775cbc219b6';
const PATHS = ["./", "./assets/AssetManifest.bin", "./assets/AssetManifest.bin.json", "./assets/FontManifest.json", "./assets/NOTICES", "./assets/assets/fonts/NotoSansKR.ttf", "./assets/assets/fonts/OFL.txt", "./assets/fonts/MaterialIcons-Regular.otf", "./assets/fonts/fallback/Roboto-Regular.ttf", "./assets/packages/cupertino_icons/assets/CupertinoIcons.ttf", "./assets/shaders/ink_sparkle.frag", "./assets/shaders/stretch_effect.frag", "./brand.svg", "./canvaskit/canvaskit.js", "./canvaskit/canvaskit.wasm", "./favicon.png", "./flutter.js", "./flutter_bootstrap.js", "./icons/Icon-192.png", "./icons/Icon-512.png", "./icons/Icon-maskable-192.png", "./icons/Icon-maskable-512.png", "./index.html", "./main.dart.js", "./manifest.json", "./pwa.css", "./pwa.js", "./version.json"];
const URLS = new Set(PATHS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all([...URLS].map(async url => {
        const response = await fetch(new Request(url, {cache: 'reload', redirect: 'error'}));
        if (!response.ok) throw new Error('Unavailable app asset');
        await cache.put(url, response);
      }));
    } catch (error) { await caches.delete(CACHE); throw error; }
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
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(url.href)) || fetch(event.request);
  })());
});
