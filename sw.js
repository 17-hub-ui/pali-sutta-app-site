const CACHE_NAME = "pali-sutta-app-v167";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=122",
  "./js/app.bundle.js?v=156",
  "./manifest.webmanifest?v=80",
  "./icons/favicon-16.png?v=80",
  "./icons/favicon-32.png?v=80",
  "./icons/icon-192.png?v=80",
  "./icons/icon-512.png?v=80",
  "./icons/apple-touch-icon.png?v=80",
  "./icons/hero-bodhi.png?v=83",
  "./audio/satori-light.wav",
  "./data/index.json",
  "./data/suttas/gokai.json",
  "./data/suttas/metta-sutta.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // MP3はRangeリクエストを含むストリーミングを優先し、大容量音声を
  // Service Workerのアプリキャッシュへ保存しない。
  const requestUrl = new URL(event.request.url);
  const isSatoriLightSound = requestUrl.pathname.endsWith("/audio/satori-light.wav");
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.includes("/audio/") && !isSatoriLightSound) return;

  const isCacheable = (request, response) => {
    if (!response || !response.ok) return false;
    try {
      return new URL(request.url).origin === self.location.origin;
    } catch {
      return false;
    }
  };

  // ページ本体はネットワーク優先。オフライン時だけキャッシュへフォールバックする。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (isCacheable(event.request, response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (isCacheable(event.request, response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => new Response("", { status: 503, statusText: "Offline" }));
    })
  );
});
