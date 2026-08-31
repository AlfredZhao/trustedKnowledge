const SHELL_CACHE_NAME = "trusted-knowledge-shell-v3";
const RUNTIME_CACHE_NAME = "trusted-knowledge-runtime-v3";
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest"];
const HTML_NETWORK_TIMEOUT_MS = 450;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE_NAME && key !== RUNTIME_CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/index.html"));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE_NAME));
    return;
  }

  if (APP_SHELL_URLS.indexOf(url.pathname) !== -1) {
    event.respondWith(networkFirst(request));
  }
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(SHELL_CACHE_NAME);

  const networkResponse = fetch(request)
    .then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
    })
    .catch(() => null);
  const response = await Promise.race([
    networkResponse,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), HTML_NETWORK_TIMEOUT_MS);
    }),
  ]);
  if (response) return response;

  const cached = await caches.match(request);
  if (cached) return cached;
  if (fallbackUrl) {
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
  }

  const eventualResponse = await networkResponse;
  if (eventualResponse) return eventualResponse;
  throw new Error("Network request failed");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Asset request failed");
}
