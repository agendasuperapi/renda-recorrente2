// Push event handlers for the PWA service worker (imported by Workbox generateSW)

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

    const baseOptions = {
      body: payload.body || fallback.body,
      icon: payload.icon || fallback.icon,
      badge: payload.badge || fallback.badge,
      data: payload.data || fallback.data,
      tag: payload.type === 'test' ? `test-${Date.now()}` : (payload.type || 'default'),
    };

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

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') return;

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
  console.log('Notification closed:', event);
});
