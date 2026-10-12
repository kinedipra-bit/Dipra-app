"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SuscripcionPushInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Guarda (o actualiza, si el navegador reusa el mismo endpoint) la
// suscripción Web Push de este dispositivo — ver ActivarNotificaciones.tsx.
export async function guardarPushSubscription(token: string, sub: SuscripcionPushInput) {
  const admin = createAdminClient();
  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin
    .from("client_push_subscriptions")
    .upsert(
      { client_id: cliente.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message);
}

export async function eliminarPushSubscription(token: string, endpoint: string) {
  const admin = createAdminClient();
  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin
    .from("client_push_subscriptions")
    .delete()
    .eq("client_id", cliente.id)
    .eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
