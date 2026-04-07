/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCXDr6kMLp-Zinf9BYPOHwDvDMLg9RBWD0',
  projectId: 'receptenboek-1e91e',
  messagingSenderId: '445963080639',
  appId: '1:445963080639:web:ff6c1f818fbd148560870a',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, link } = payload.data || {};

  self.registration.showNotification(title || 'Receptenboek', {
    body: body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { link: link || '/meldingen' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/meldingen';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(link);
          return;
        }
      }
      return clients.openWindow(link);
    })
  );
});
