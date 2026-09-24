"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarCorreoResetPin } from "@/lib/email";
import { generarTokenReset, hashPin, hashTokenReset, pinValido, verificarPin } from "@/lib/dipra/portalPin";
import { PORTAL_SESSION_COOKIE, SESSION_DIAS } from "./acceso";

type Resultado = { ok: true } | { ok: false; error: string };

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;
const RESET_MINUTOS = 30;

async function crearSesion(clienteId: string) {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + SESSION_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("portal_sessions")
    .insert({ client_id: clienteId, expires_at: expiresAt })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) throw new Error("No se pudo iniciar la sesión.");

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, data.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DIAS * 24 * 60 * 60,
  });
}

async function origenActual() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Primera visita: el cliente todavía no tiene PIN configurado.
export async function registrarPin(token: string, pin: string): Promise<Resultado> {
  if (!pinValido(pin)) return { ok: false, error: "El PIN debe tener 4 dígitos." };

  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id")
    .eq("portal_token", token)
    .single<{ id: string }>();
  if (!cliente) return { ok: false, error: "Portal no encontrado." };

  const { data: existente } = await admin
    .from("client_portal_auth")
    .select("pin_hash")
    .eq("client_id", cliente.id)
    .maybeSingle<{ pin_hash: string | null }>();
  if (existente?.pin_hash) return { ok: false, error: "Este portal ya tiene un PIN configurado." };

  const { error } = await admin.from("client_portal_auth").upsert(
    { client_id: cliente.id, pin_hash: hashPin(pin), pin_set_at: new Date().toISOString() },
    { onConflict: "client_id" }
  );
  if (error) return { ok: false, error: "No se pudo guardar el PIN." };

  await crearSesion(cliente.id);
  revalidatePath(`/portal/${token}`, "layout");
  return { ok: true };
}

export async function iniciarSesionPin(token: string, pin: string): Promise<Resultado> {
  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id")
    .eq("portal_token", token)
    .single<{ id: string }>();
  if (!cliente) return { ok: false, error: "Portal no encontrado." };

  const { data: auth } = await admin
    .from("client_portal_auth")
    .select("pin_hash, intentos, bloqueado_hasta")
    .eq("client_id", cliente.id)
    .maybeSingle<{ pin_hash: string | null; intentos: number; bloqueado_hasta: string | null }>();
  if (!auth?.pin_hash) return { ok: false, error: "Este portal todavía no tiene un PIN configurado." };

  if (auth.bloqueado_hasta && new Date(auth.bloqueado_hasta).getTime() > Date.now()) {
    const minutos = Math.ceil((new Date(auth.bloqueado_hasta).getTime() - Date.now()) / 60000);
    return { ok: false, error: `Demasiados intentos — probá de nuevo en ${minutos} min.` };
  }

  if (!verificarPin(pin, auth.pin_hash)) {
    const intentos = (auth.intentos ?? 0) + 1;
    const bloqueado = intentos >= MAX_INTENTOS;
    await admin
      .from("client_portal_auth")
      .update({
        intentos: bloqueado ? 0 : intentos,
        bloqueado_hasta: bloqueado ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString() : null,
      })
      .eq("client_id", cliente.id);
    return {
      ok: false,
      error: bloqueado ? `Demasiados intentos — probá de nuevo en ${BLOQUEO_MINUTOS} min.` : "PIN incorrecto.",
    };
  }

  await admin.from("client_portal_auth").update({ intentos: 0, bloqueado_hasta: null }).eq("client_id", cliente.id);
  await crearSesion(cliente.id);
  revalidatePath(`/portal/${token}`, "layout");
  return { ok: true };
}

export async function cerrarSesionPin(token: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (sessionId) {
    const admin = createAdminClient();
    await admin.from("portal_sessions").delete().eq("id", sessionId);
  }
  cookieStore.delete(PORTAL_SESSION_COOKIE);
  revalidatePath(`/portal/${token}`, "layout");
}

export async function solicitarRestablecerPin(token: string): Promise<Resultado> {
  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id, nombre, correo")
    .eq("portal_token", token)
    .single<{ id: string; nombre: string; correo: string }>();
  if (!cliente) return { ok: false, error: "Portal no encontrado." };
  if (!cliente.correo?.trim()) {
    return { ok: false, error: "No hay un correo registrado en tu ficha — pedile a tu profesional que lo cargue." };
  }

  const { token: resetToken, hash } = generarTokenReset();
  const expiresAt = new Date(Date.now() + RESET_MINUTOS * 60 * 1000).toISOString();
  const { error } = await admin
    .from("portal_pin_resets")
    .insert({ client_id: cliente.id, token_hash: hash, expires_at: expiresAt });
  if (error) return { ok: false, error: "No se pudo generar el enlace de reseteo." };

  const origen = await origenActual();
  const link = `${origen}/portal/${token}?rt=${resetToken}`;

  try {
    await enviarCorreoResetPin({ para: cliente.correo, nombre: cliente.nombre, link });
  } catch {
    return { ok: false, error: "No se pudo enviar el correo — intentá de nuevo en un momento." };
  }

  return { ok: true };
}

export async function restablecerPin(token: string, resetToken: string, nuevoPin: string): Promise<Resultado> {
  if (!pinValido(nuevoPin)) return { ok: false, error: "El PIN debe tener 4 dígitos." };

  const admin = createAdminClient();
  const { data: cliente } = await admin
    .from("clients")
    .select("id")
    .eq("portal_token", token)
    .single<{ id: string }>();
  if (!cliente) return { ok: false, error: "Portal no encontrado." };

  const tokenHash = hashTokenReset(resetToken);
  const { data: reset } = await admin
    .from("portal_pin_resets")
    .select("id, expires_at, used_at")
    .eq("client_id", cliente.id)
    .eq("token_hash", tokenHash)
    .maybeSingle<{ id: string; expires_at: string; used_at: string | null }>();

  if (!reset || reset.used_at || new Date(reset.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "El enlace ya no es válido — pedí uno nuevo." };
  }

  const { error } = await admin.from("client_portal_auth").upsert(
    {
      client_id: cliente.id,
      pin_hash: hashPin(nuevoPin),
      pin_set_at: new Date().toISOString(),
      intentos: 0,
      bloqueado_hasta: null,
    },
    { onConflict: "client_id" }
  );
  if (error) return { ok: false, error: "No se pudo guardar el nuevo PIN." };

  await admin.from("portal_pin_resets").update({ used_at: new Date().toISOString() }).eq("id", reset.id);

  await crearSesion(cliente.id);
  revalidatePath(`/portal/${token}`, "layout");
  return { ok: true };
}
