// Service worker "vacío": no cachea nada, cada pedido va siempre a la red.
// Existe únicamente porque Chrome/Android exige un service worker con
// handler de fetch para considerar la app instalable (criterio técnico de
// "beforeinstallprompt") — no queremos cachear datos de clientes en el
// dispositivo, así que este solo deja pasar todo de largo.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op a propósito: sin event.respondWith(), el navegador hace el
  // fetch normal contra la red, como si no hubiera service worker.
});
