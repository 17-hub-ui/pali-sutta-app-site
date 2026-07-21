const CACHE_NAME = "pali-sutta-app-v132";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css?v=103",
  "./js/app.bundle.js?v=124",
  "./manifest.webmanifest?v=80",
  "./icons/favicon-16.png?v=80",
  "./icons/favicon-32.png?v=80",
  "./icons/icon-192.png?v=80",
  "./icons/icon-512.png?v=80",
  "./icons/apple-touch-icon.png?v=80",
  "./icons/hero-bodhi.png?v=83",
  "./data/index.json",
  "./data/suttas/gokai.json",
  "./data/suttas/metta-sutta.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
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
  if (event.request.method !== "GET") {
    return;
  }

  // キャッシュ対象は同一オリジンの正常応答のみ (404/500の固定化と他オリジン混入を防ぐ)
  const isCacheable = (request, response) => {
    if (!response || !response.ok) {
      return false;
    }
    try {
      return new URL(request.url).origin === self.location.origin;
    } catch {
      return false;
    }
  };

  // ページ本体はネットワーク優先。キャッシュ優先だと更新直後の1回目のロードで
  // 旧バージョンが表示され続けるため (オフライン時のみキャッシュへフォールバック)。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (isCacheable(event.request, response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (isCacheable(event.request, response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        return new Response("", {
          status: 503,
          statusText: "Offline"
        });
      });
    })
  );
});
