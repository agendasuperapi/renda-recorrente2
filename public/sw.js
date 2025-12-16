// Service Worker for Push Notifications - iOS PWA Compatible

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications - iOS PWA compatible
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  event.waitUntil((async () => {
    const defaultPayload = {
      title: 'Renda Recorrente',
      body: 'Você tem uma nova notificação',
      icon: '/app-icon.png',
      data: { url: '/' },
      type: 'default',
    };

    let payload = defaultPayload;

    if (event.data) {
      try {
        const jsonData = event.data.json();
        console.log('[SW] Push data:', JSON.stringify(jsonData));
        payload = { ...defaultPayload, ...jsonData };
      } catch (e) {
        console.log('[SW] Error parsing push data:', e);
        try {
          const textData = event.data.text();
          console.log('[SW] Push text data:', textData);
          payload = { ...defaultPayload, ...JSON.parse(textData) };
        } catch (e2) {
          console.log('[SW] Error parsing push text:', e2);
        }
      }
    }

    const title = payload.title || defaultPayload.title;

    // iOS PWA compatible options - minimal and safe
    const options = {
      body: payload.body || defaultPayload.body,
      icon: payload.icon || defaultPayload.icon,
      data: payload.data || defaultPayload.data,
      // Use unique tag for test notifications to prevent silent updates
      tag: payload.type === 'test' ? `test-${Date.now()}` : (payload.type || 'default'),
    };

    console.log('[SW] Showing notification:', title, JSON.stringify(options));

    try {
      await self.registration.showNotification(title, options);
      console.log('[SW] Notification shown successfully');
    } catch (err) {
      console.error('[SW] showNotification error:', err);
    }
  })());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
