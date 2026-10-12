// Envío de notificaciones push (Web Push) al portal del cliente. Se usa
// SOLO en server actions / route handlers — VAPID_PRIVATE_KEY nunca se
// expone al navegador. La clave pública (NEXT_PUBLIC_VAPID_PUBLIC_KEY) es la
// misma que usa el cliente para suscribirse (ver ActivarNotificaciones.tsx)
// — a diferencia de la privada, está pensada para ser pública.
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow } from "@/lib/dipra/types";

let vapidConfigurado = false;

function asegurarVapid() {
  if (vapidConfigurado) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:kine.dipra@gmail.com", publicKey, privateKey);
  vapidConfigurado = true;
  return true;
}

// Manda la misma notificación a TODAS las suscripciones de un cliente (puede
// tener más de un dispositivo instalado). Una suscripción vencida/revocada
// por el navegador responde 404/410 — esas se borran solas en vez de
// reintentarse para siempre.
export async function mandarPushACliente(
  clientId: string,
  payload: { title: string; body: string; url: string }
): Promise<{ enviadas: number }> {
  if (!asegurarVapid()) throw new Error("VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY no están configuradas.");

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("client_push_subscriptions")
    .select("*")
    .eq("client_id", clientId)
    .returns<PushSubscriptionRow[]>();
  if (!subs || subs.length === 0) return { enviadas: 0 };

  let enviadas = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        enviadas++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("client_push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
  return { enviadas };
}
