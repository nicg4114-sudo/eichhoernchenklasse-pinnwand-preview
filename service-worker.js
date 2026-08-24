// Minimaler Service Worker für die Installierbarkeit als App-Icon
// (Android/iOS "Zum Startbildschirm hinzufügen") und als Grundlage für
// spätere Push-Benachrichtigungen (noch nicht aktiv, siehe unten).
//
// Bewusst zurückhaltend beim Caching: Nur die App-Hülle (HTML/CSS/JS/Icons)
// wird zwischengespeichert, damit die App auch ohne Netz kurz startet.
// Anfragen an Supabase (die eigentlichen Pinnwand-Daten) laufen immer direkt
// übers Netz, damit nie veraltete Inhalte angezeigt werden.

const CACHE_NAME = "pinnwand-shell-v18";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
  "./fonts/figtree-400.woff2",
  "./fonts/figtree-500.woff2",
  "./fonts/figtree-600.woff2",
  "./fonts/figtree-700.woff2",
  "./fonts/figtree-800.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Fremde Anfragen (Supabase-API, Google Fonts, CDN) unangetastet lassen —
  // nur die eigene App-Hülle wird aus dem Cache bedient.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ---- Push-Benachrichtigungen ----
// Der Versand selbst passiert serverseitig (Supabase Edge Function
// "send-push", ausgelöst über einen Database Webhook bei jedem neuen
// Eintrag). Hier wird die eingehende Push-Nachricht nur noch als System-
// Benachrichtigung angezeigt.

self.addEventListener("push", (event) => {
  let data = { title: "Neuigkeit auf der Pinnwand", body: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Falls der Payload mal kein JSON ist, bleibt der Standardtext stehen.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: data.type || "pinnwand",
      data: { url: "./index.html" },
    })
  );
});

// Wichtig: kein exakter URL-Vergleich (scheitert an Trailing Slash,
// Klassen-Link-Parametern etc. — je nach Gerät unterschiedlich, das war der
// Bug). Stattdessen: irgendein offenes App-Fenster nehmen, notfalls dorthin
// navigieren; erst wenn gar keins offen ist, ein neues öffnen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./index.html", self.location.href).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url !== targetUrl && "navigate" in client) {
          client.navigate(targetUrl).catch(() => {});
        }
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
