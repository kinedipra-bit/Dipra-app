import { NextResponse } from "next/server";

// Mismo service worker "vacío" que /sw.js (ver ese archivo para el porqué),
// pero servido DENTRO del scope del portal (/portal/[token]/sw.js) para que
// el navegador pueda registrarlo con scope "/portal/[token]" en vez de "/".
// Antes el portal reusaba /sw.js, que solo admite scope "/" — un único
// service worker de alcance global terminaba atado a la app del
// profesional Y a cada portal de cliente a la vez, y el sistema de
// instalación de Android podía confundir cuál manifest (y por lo tanto qué
// ícono/"app") correspondía a cada uno. Con esto, cada portal tiene su
// propio service worker con su propio scope, igual que ya tiene su propio
// manifest (ver manifest.webmanifest/route.ts).
const SW_SOURCE = `
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op a propósito — ver /sw.js.
});

// Recordatorio de "hoy entrenás" (ver src/lib/push.ts) — el payload ya trae
// el título/cuerpo armados del lado del servidor y la URL exacta del
// portal a abrir (incluye el token), así funciona igual sin importar bajo
// qué portal esté registrado este service worker.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "DIPRA";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      const existente = lista.find((c) => c.url.includes(url));
      if (existente) return existente.focus();
      return self.clients.openWindow(url);
    })
  );
});
`;

export async function GET() {
  return new NextResponse(SW_SOURCE, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
    },
  });
}
