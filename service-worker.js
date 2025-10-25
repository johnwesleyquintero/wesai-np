const CACHE_NAME = 'wescore-cache-v1';

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/index.tsx', // The main JS entry point
  'https://cdn.tailwindcss.com',
  "https://aistudiocdn.com/@google/genai@^1.25.0",
  "https://aistudiocdn.com/react@^19.2.0",
  "https://aistudiocdn.com/react-dom@^19.2.0",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm",
  "https://esm.sh/react-markdown@9?deps=react@19",
  "https://esm.sh/remark-gfm@4?deps=react@19",
  "https://esm.sh/rehype-raw@7?deps=react@19",
  "https://esm.sh/react-syntax-highlighter@15.5.0?deps=react@19",
  "https://esm.sh/react-force-graph-2d@1.23.11?deps=react@19",
  "https://esm.sh/three@0.129.0"
];

// Install event: Open cache and add all core assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Fetch event: Serve assets from cache first, fall back to network.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - go to network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // We don't cache Supabase API calls
                if (!event.request.url.includes('supabase.co')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});

// Activate event: Clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
