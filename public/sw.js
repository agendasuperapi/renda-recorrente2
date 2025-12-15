// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  event.waitUntil((async () => {
    const fallback = {
      title: 'Renda Recorrente',
      body: 'Você tem uma nova notificação',
      icon: '/app-icon.png',
      badge: '/app-icon.png',
      data: { url: '/' },
      type: 'default',
    };

    let payload = fallback;

    if (event.data) {
      try {
        if (typeof event.data.json === 'function') {
          payload = { ...fallback, ...event.data.json() };
        } else {
          const text = await event.data.text();
          payload = { ...fallback, ...JSON.parse(text) };
        }
      } catch (e) {
        console.log('Error parsing push data:', e);
      }
    }

    const title = payload.title || fallback.title;

    // Keep options minimal and compatible across Chrome/Windows and iOS PWA.
    const baseOptions = {
      body: payload.body || fallback.body,
      icon: payload.icon || fallback.icon,
      badge: payload.badge || fallback.badge,
      data: payload.data || fallback.data,
      // Avoid constant tags for tests (some platforms may update silently).
      tag: payload.type === 'test' ? `test-${Date.now()}` : (payload.type || 'default'),
    };

    // Actions are not consistently supported on iOS PWA; include only when allowed.
    const maxActions = (typeof Notification !== 'undefined' && 'maxActions' in Notification)
      ? Notification.maxActions
      : 0;

    const options = {
      ...baseOptions,
      ...(maxActions > 0
        ? {
            actions: [
              { action: 'open', title: 'Abrir' },
              { action: 'close', title: 'Fechar' },
            ],
          }
        : {}),
    };

    try {
      await self.registration.showNotification(title, options);
    } catch (err) {
      console.log('showNotification failed, retrying with minimal options:', err);
      await self.registration.showNotification(title, baseOptions);
    }
  })());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
