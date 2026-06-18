const CACHE_NAME = "sobrecarga-shell-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/css/variables.css",
  "./src/css/layout.css",
  "./src/css/components.css",
  "./src/css/app.css",
  "./src/js/app.js",
  "./src/js/firebase/firebaseConfig.js",
  "./src/js/firebase/firebase.js",
  "./src/js/models/BaseVariable.js",
  "./src/js/models/CardinalVariable.js",
  "./src/js/models/WeeklyReview.js",
  "./src/js/services/adviceService.js",
  "./src/js/services/moodService.js",
  "./src/js/services/reviewService.js",
  "./src/js/services/variableService.js",
  "./src/js/ui/dashboard.js",
  "./src/js/ui/radarChart.js",
  "./src/js/ui/moodPanel.js",
  "./src/js/ui/adviceModal.js",
  "./src/js/utils/calculations.js",
  "./src/js/utils/dates.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("./"))
      )
  );
});
