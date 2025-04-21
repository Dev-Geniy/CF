self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open('client-flow-v2').then((cache) => {
      return cache.addAll([
        'crm.html',
        'crm-styles.css',
        'crm-script.js',
        'favicon.png',
        'favicon-144x144.png',
        'favicon-192x192.png',
        'favicon-512x512.png',
        'manifest.json'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = ['client-flow-v2'];
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
