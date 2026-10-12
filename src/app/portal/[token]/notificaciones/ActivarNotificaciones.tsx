"use client";

import { useEffect, useState } from "react";
import { eliminarPushSubscription, guardarPushSubscription } from "./actions";

// Las claves VAPID vienen en base64url — PushManager.subscribe() las pide
// como Uint8Array.
function base64UrlAUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Estado = "cargando" | "no_disponible" | "denegado" | "inactivo" | "activo";

/**
 * Botón para que el cliente active los recordatorios push de "hoy
 * entrenás" (ver src/lib/push.ts). Requiere que el navegador soporte Web
 * Push — en iPhone solo funciona si el portal está instalado como app
 * (Safari suelto no lo soporta), así que en ese caso se explica en vez de
 * fallar en silencio.
 */
export function ActivarNotificaciones({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [pending, setPending] = useState(false);

  // Hace falta setState síncrono acá (no solo desde el .then de una
  // promesa): saber si el navegador soporta Web Push y si el permiso ya
  // está denegado depende de APIs que no existen en el render de servidor
  // (mismo caso que InstalarApp.tsx).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelado = false;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setEstado("no_disponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denegado");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelado) setEstado(sub ? "activo" : "inactivo");
      })
      .catch(() => {
        if (!cancelado) setEstado("inactivo");
      });
    return () => {
      cancelado = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activar = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    setPending(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado("denegado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      await guardarPushSubscription(token, {
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setEstado("activo");
    } finally {
      setPending(false);
    }
  };

  const desactivar = async () => {
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await eliminarPushSubscription(token, sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } finally {
      setPending(false);
    }
  };

  if (estado === "cargando" || estado === "no_disponible") return null;

  if (estado === "denegado") {
    return (
      <p className="dp-muted text-[11px]">
        Bloqueaste las notificaciones de este sitio — para activarlas, habilitalas desde el ícono 🔒 del navegador.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={estado === "activo" ? desactivar : activar}
      disabled={pending}
      className="dp-text-brand text-xs font-medium hover:underline disabled:opacity-50"
    >
      {pending
        ? "Un momento…"
        : estado === "activo"
          ? "🔔 Recordatorios activados (tocá para desactivar)"
          : "🔕 Activar recordatorio de entrenamiento"}
    </button>
  );
}
