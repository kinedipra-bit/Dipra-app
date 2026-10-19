import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente } from "@/lib/dipra/types";

export const PORTAL_SESSION_COOKIE = "dipra_portal_session";
export const SESSION_DIAS = 180;

export type ClientePortal = Pick<Cliente, "id" | "nombre" | "correo" | "semana_activa_id"> & {
  pinHash: string | null;
  bloqueadoHasta: string | null;
  // true si hay una rutina de fuerza efectivamente compartida (semana
  // activa con dias_publicado no vacío) — mientras no la comparta, el
  // cliente es "solo kine": no tiene sentido mostrarle "Mi rutina" ni
  // "Mis sesiones" (ambas del lado fuerza) en la navegación del portal.
  tieneRutinaFuerza: boolean;
};

// Trae al cliente por su portal_token + su fila de auth del portal (tabla
// separada — ver nota en la migración 0005). Se usa en todas las páginas
// del portal en vez de repetir el select a mano.
export async function obtenerClientePortal(token: string): Promise<ClientePortal | null> {
  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id, nombre, correo, semana_activa_id")
    .eq("portal_token", token)
    .single<Pick<Cliente, "id" | "nombre" | "correo" | "semana_activa_id">>();
  if (!cliente) return null;

  const [{ data: auth }, tieneRutinaFuerza] = await Promise.all([
    admin
      .from("client_portal_auth")
      .select("pin_hash, bloqueado_hasta")
      .eq("client_id", cliente.id)
      .maybeSingle<{ pin_hash: string | null; bloqueado_hasta: string | null }>(),
    (async () => {
      if (!cliente.semana_activa_id) return false;
      const { data: semana } = await admin
        .from("plan_semanas")
        .select("dias_publicado")
        .eq("id", cliente.semana_activa_id)
        .maybeSingle<{ dias_publicado: unknown[] | null }>();
      return !!semana?.dias_publicado && semana.dias_publicado.length > 0;
    })(),
  ]);

  return {
    ...cliente,
    pinHash: auth?.pin_hash ?? null,
    bloqueadoHasta: auth?.bloqueado_hasta ?? null,
    tieneRutinaFuerza,
  };
}

// Sesión activa = cookie con un id de portal_sessions vigente Y que
// pertenezca a ESTE cliente (no solo "alguna sesión válida cualquiera").
export async function sesionValidaPara(clienteId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!sessionId) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("portal_sessions")
    .select("client_id, expires_at")
    .eq("id", sessionId)
    .maybeSingle<{ client_id: string; expires_at: string }>();

  if (!data || new Date(data.expires_at).getTime() < Date.now()) return false;
  return data.client_id === clienteId;
}
