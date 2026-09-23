self.addEventListener('push', (event) => {
  let payload = { title: 'Wirt-Portal', body: 'Neue Aktivität' };
  try { payload = event.data.json(); } catch { /* keep default */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon.png',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/index.html'));
});
