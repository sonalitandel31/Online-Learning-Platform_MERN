const CACHE_NAME = 'smartlearn-cache-v2';

// Core assets to download and save as soon as the app is installed
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Install Event: Cache basic files
self.addEventListener('install', event => {
  self.skipWaiting(); // Instantly activate the new service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching files');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. Activate Event: Delete old caches (Storage clean up)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: Network First, Fallback to Cache strategy
self.addEventListener('fetch', event => {
  // Only cache GET requests (POST requests like login/video uploads cannot be cached)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the network is available, fetch new data and update the cache
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If the network fails (user is offline), serve the stored data from the cache
        return caches.match(event.request);
      })
  );
});

// ====== PUSH NOTIFICATIONS ======
// Listen for incoming push messages from the server
self.addEventListener('push', event => {
  let data = {};

  if (event.data) {
    try {
      // First, try to parse the incoming data as JSON
      data = event.data.json(); 
    } catch (e) {
      // If it is just plain text and not JSON, catch the error and save it as the body
      data = { body: event.data.text() }; 
    }
  }

  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: data.url || '/'
    }
  };

  // Display the native OS notification
  event.waitUntil(
    self.registration.showNotification(data.title || 'SmartLearn LMS', options)
  );
});

// Listen for the user clicking the notification
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Open the specific URL provided in the notification data
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});