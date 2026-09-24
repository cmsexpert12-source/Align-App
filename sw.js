/* ALIGN service worker — offline cache + web push */
const CACHE = "align-v65";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./life.js",
  "./scripture.js",
  "./books.js",
  "./ai.js",
  "./sound.js",
  "./db.js",
  "./config.js",
  "./vendor/supabase.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32.png"
];

const skipPut = (pathname) => /\/data\/spurgeon\.json$/.test(pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((u) => cache.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const staleWhileRevalidate = (req) =>
  caches.open(CACHE).then((cache) =>
    cache.match(req).then((cached) => {
      const fetching = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const path = new URL(req.url).pathname;
            if (!skipPut(path)) cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || fetching;
    })
  );

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(staleWhileRevalidate(req));
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "align-sync") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "align-sync" }));
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "ALIGN", body: "Rise. The morning is a gift. Walk the path.", url: "./index.html" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    try { payload.body = event.data.text(); } catch { /* empty push */ }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./assets/icon-192.png",
      badge: "./assets/favicon-32.png",
      vibrate: [80, 40, 80],
      data: { url: payload.url || "./index.html" },
      tag: payload.tag || "align-reminder",
      renotify: true
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.postMessage({ type: "notification-click" });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
