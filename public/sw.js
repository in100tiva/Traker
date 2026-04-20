// Traker Service Worker — app-shell cache + notifications
const CACHE = "traker-v1";
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchAndCache = fetch(req)
        .then((res) => {
          // Cache only same-origin successful responses
          if (
            res.ok &&
            new URL(req.url).origin === self.location.origin &&
            res.type === "basic"
          ) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchAndCache;
    }),
  );
});

// Messages from the page: { type: 'notify', title, body }
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type === "notify") {
    self.registration.showNotification(data.title ?? "Traker", {
      body: data.body ?? "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "traker-reminder",
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});
