/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data?.json() as {
        title?: string;
        body?: string;
        route?: string;
        tag?: string;
      };
    } catch {
      return { title: 'ONLYUS', body: 'New private activity' };
    }
  })();

  const title = data?.title || 'ONLYUS';
  const body = data?.body || 'New private activity';
  const route = data?.route || '/chats';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data?.tag || 'onlyus-activity',
      data: { route },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = (event.notification.data as { route?: string } | undefined)?.route || '/chats';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.focus();
          client.postMessage({ type: 'OPEN_ROUTE', route });
          return;
        }
      }
      return self.clients.openWindow(route);
    })
  );
});
