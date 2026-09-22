/* ALIGN service worker — offline cache + web push */
const CACHE = "align-v17";
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
  "./db.js",
  "./config.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-32.png"
];

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || fetched;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "ALIGN", body: "The morning is waiting.", url: "./index.html" };
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
