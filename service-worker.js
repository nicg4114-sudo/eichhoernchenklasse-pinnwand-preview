// Minimaler Service Worker für die Installierbarkeit als App-Icon
// (Android/iOS "Zum Startbildschirm hinzufügen") und als Grundlage für
// spätere Push-Benachrichtigungen (noch nicht aktiv, siehe unten).
//
// Bewusst zurückhaltend beim Caching: Nur die App-Hülle (HTML/CSS/JS/Icons)
// wird zwischengespeichert, damit die App auch ohne Netz kurz startet.
// Anfragen an Supabase (die eigentlichen Pinnwand-Daten) laufen immer direkt
// übers Netz, damit nie veraltete Inhalte angezeigt werden.

const CACHE_NAME = "pinnwand-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.webmanifest",
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

// ---- Vorbereitung für Punkt 3 (Push-Benachrichtigungen) ----
// Hier kommen später "push"- und "notificationclick"-Listener hinzu, sobald
// der Server-Baustein dafür steht. Bewusst noch nicht aktiv.
