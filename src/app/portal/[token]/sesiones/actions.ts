"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DiaEntrenamiento, EjercicioSesion } from "@/lib/dipra/types";

export interface NuevaSesionPortalInput {
  fecha: string;
  dia_plan_label: string;
  pilares: { sueno: string; nutricion: string; hidratacion: string; movimiento: string; estres: string };
  comentarios: string;
  ejercicios: EjercicioSesion[];
}

// El atleta no tiene sesión de Supabase Auth — solo el link con su
// portal_token. Por eso se usa el cliente admin (service role, bypassa
// RLS) y se resuelve el client_id A PARTIR del token acá adentro, nunca
// confiando en un id que venga del cliente.
export async function crearSesionPortal(token: string, input: NuevaSesionPortalInput) {
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin.from("sesiones").insert({
    client_id: cliente.id,
    fecha: input.fecha,
    tipo: "Entrenamiento personalizado",
    dia_plan_label: input.dia_plan_label,
    es_primera_sesion: false,
    comentarios_pre: "",
    pilares: input.pilares,
    comentarios: input.comentarios,
    ejercicios: input.ejercicios,
    registrada_por_cliente: true,
    revisada: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${token}/sesiones`);
  revalidatePath(`/clientes/${cliente.id}/sesiones`);
  // Inicio y la lista de clientes muestran las alertas de programación
  // (semana completa / sesión sin revisar), que cambian con cada sesión
  // nueva del portal.
  revalidatePath("/");
  revalidatePath("/clientes");
}

// El atleta puede borrar una sesión que él mismo registró (ej. si eligió el
// día equivocado). Igual que crearSesionPortal, valida ownership a partir
// del token antes de borrar — así un token no puede usarse para tocar
// sesiones de otro cliente aunque alguien adivinara/forzara un id ajeno.
export async function eliminarSesionPortal(token: string, sesionId: string) {
  const admin = createAdminClient();

  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin.from("sesiones").delete().eq("id", sesionId).eq("client_id", cliente.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${token}/sesiones`);
  revalidatePath(`/clientes/${cliente.id}/sesiones`);
}

// Mini calendario: el cliente toca una fecha para confirmar "voy a entrenar
// este día" — de ahí sale el recordatorio push (ver src/lib/push.ts y el
// cron en app/api/cron/recordatorios-entrenamiento). Son fechas sueltas que
// el cliente elige él mismo, no un horario fijo que arme el profesional.
export async function confirmarDiaEntrenamiento(token: string, fecha: string) {
  const admin = createAdminClient();
  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin
    .from("client_dias_entrenamiento")
    .upsert({ client_id: cliente.id, fecha }, { onConflict: "client_id,fecha" });
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${token}/sesiones`);
  revalidatePath(`/clientes/${cliente.id}/sesiones`);
}

export async function quitarDiaEntrenamiento(token: string, fecha: string) {
  const admin = createAdminClient();
  const { data: cliente } = await admin.from("clients").select("id").eq("portal_token", token).single();
  if (!cliente) throw new Error("Link inválido");

  const { error } = await admin
    .from("client_dias_entrenamiento")
    .delete()
    .eq("client_id", cliente.id)
    .eq("fecha", fecha);
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${token}/sesiones`);
  revalidatePath(`/clientes/${cliente.id}/sesiones`);
}

export async function obtenerDiasConfirmados(clienteId: string, desde: string): Promise<DiaEntrenamiento[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_dias_entrenamiento")
    .select("*")
    .eq("client_id", clienteId)
    .gte("fecha", desde)
    .order("fecha")
    .returns<DiaEntrenamiento[]>();
  return data ?? [];
}
