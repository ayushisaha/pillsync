// Service Worker for PillSync Web Push Notifications
self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || "Time for your medicine schedule!",
        icon: data.icon || "/favicon.svg",
        badge: data.badge || "/favicon.svg",
        data: {
          url: data.url || "/dashboard"
        },
        tag: data.tag || "pillsync-notification",
        renotify: true,
        vibrate: [100, 50, 100],
        actions: [
          { action: "open", title: "Open PillSync" }
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || "PillSync Alert", options)
      );
    } catch (e) {
      console.error("Error parsing push payload:", e);
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  
  let targetUrl = "/dashboard";
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.indexOf(targetUrl) !== -1 && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
