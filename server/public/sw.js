// Service-Worker: Offline-Shell + installierbare Web-App.
// Strategie: Netz zuerst, Cache nur als Offline-Fallback. So erscheinen neue
// UI-Versionen direkt nach einem Deploy statt dauerhaft aus einem alten Cache.
const CACHE = "ops-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/fonts/bangers.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // API: immer frisch versuchen, Cache nur als Notnagel.
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Shell: online immer frisch laden und nachcachen. Offline: letzter Stand.
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/"))),
  );
});
