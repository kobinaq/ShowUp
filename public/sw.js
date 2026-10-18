self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("meridiqa-v1").then((cache) => cache.addAll(["/", "/rep/submit", "/manifest.json"])));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
