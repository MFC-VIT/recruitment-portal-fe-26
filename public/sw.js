// Service worker for application update notifications (Web Push).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MFC Recruitments", body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "MFC Recruitments", {
      body: data.body || "There's an update on your application.",
      icon: "/fox-avatar.png",
      badge: "/fox.ico",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
