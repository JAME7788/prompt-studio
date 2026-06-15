/* KruJames Prompt Studio — Service Worker
   network-first สำหรับหน้าเว็บ (ออนไลน์ = เวอร์ชันล่าสุดเสมอ, ออฟไลน์ = ใช้ cache)
   cache-first สำหรับไฟล์ static (ไอคอน/manifest) */
const CACHE_NAME = 'kj-prompt-studio-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const isPage = req.mode === 'navigate' || req.url.endsWith('/') || req.url.endsWith('index.html');

  if (isPage) {
    // network-first: ดึงหน้าใหม่จากเซิร์ฟเวอร์เสมอ แล้วอัปเดต cache; ออฟไลน์ค่อย fallback
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // cache-first: ไฟล์ static ที่ไม่ค่อยเปลี่ยน
    e.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
  }
});
