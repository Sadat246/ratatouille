self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {
    title: "Auction update",
    body: "Open the app to see the latest auction state.",
    url: "/",
    tag: "auction-update",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: {
        url: payload.url,
      },
      tag: payload.tag,
      badge: "/pwa-icon/192",
      icon: "/pwa-icon/192",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification.data?.url ?? "/";

  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate?.(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
