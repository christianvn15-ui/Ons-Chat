const CACHE_NAME = "chat-pwa-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

// === Firebase Cloud Messaging Support ===
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Paste your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyBbbmy0UURIGmRX0PMeWVlffxFZ_f81bto",
  authDomain: "ons-chat.firebaseapp.com",
  projectId: "ons-chat",
  storageBucket: "ons-chat.firebasestorage.app",
  messagingSenderId: "725598039868",
  appId: "1:725598039868:web:d0e6b9856c98717d203839",
  measurementId: "G-WT2GDQRLBP"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage(payload => {
  console.log("Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
