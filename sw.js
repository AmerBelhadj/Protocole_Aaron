// Service worker — Aaron Centres & Protocoles d'urgence
// Stratégie : cache-first pour l'app shell local (fonctionnement garanti hors-ligne),
// network-first (avec repli sur le cache) pour les ressources externes (tuiles de carte CDN).
const CACHE_VERSION = 'aaron-app-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/img/mascot.svg',
  './assets/img/bg-band.svg',
  './assets/img/cas1.jpg',
  './assets/img/cas2.jpg',
  './assets/img/cas3.jpg',
  './assets/img/cas4.jpg',
  './assets/img/cas5.jpg',
  './assets/img/cas6.jpg',
  './assets/img/cas7.jpg',
  './assets/img/cas8.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell local : cache-first, avec mise à jour silencieuse en tâche de fond
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    // Ressources externes (tuiles OpenStreetMap, CDN Leaflet/jsPDF) : network-first,
    // repli sur le cache si hors-ligne (utile pour les zones déjà consultées en ligne).
    event.respondWith(
      fetch(req).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, clone)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});
