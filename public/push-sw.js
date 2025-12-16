// Push event handlers for the PWA service worker - iOS PWA Compatible

self.addEventListener('push', (event) => {
  console.log('[Push-SW] Push notification received');

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
        console.log('[Push-SW] Push data:', JSON.stringify(jsonData));
        payload = { ...defaultPayload, ...jsonData };
      } catch (e) {
        console.log('[Push-SW] Error parsing push data:', e);
        try {
          const textData = event.data.text();
          payload = { ...defaultPayload, ...JSON.parse(textData) };
        } catch (e2) {
          console.log('[Push-SW] Error parsing push text:', e2);
        }
      }
    }

    const title = payload.title || defaultPayload.title;

    // iOS PWA compatible options - minimal and safe
    const options = {
      body: payload.body || defaultPayload.body,
      icon: payload.icon || defaultPayload.icon,
      data: payload.data || defaultPayload.data,
      tag: payload.type === 'test' ? `test-${Date.now()}` : (payload.type || 'default'),
    };

    console.log('[Push-SW] Showing notification:', title, JSON.stringify(options));

    try {
      await self.registration.showNotification(title, options);
      console.log('[Push-SW] Notification shown successfully');
    } catch (err) {
      console.error('[Push-SW] showNotification error:', err);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Push-SW] Notification clicked');

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
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Push-SW] Notification closed');
});
