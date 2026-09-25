"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EjercicioSesion } from "@/lib/dipra/types";

export interface NuevaSesionInput {
  fecha: string;
  tipo: string;
  dia_plan_label: string;
  es_primera_sesion: boolean;
  comentarios_pre: string;
  pilares: { sueno: string; nutricion: string; hidratacion: string; movimiento: string; estres: string };
  comentarios: string;
  ejercicios: EjercicioSesion[];
}

function revalidar(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}/sesiones`);
  // Inicio y la lista de clientes muestran las alertas de programación
  // (semana completa / sesión sin revisar).
  revalidatePath("/");
  revalidatePath("/clientes");
}

export async function crearSesion(clienteId: string, input: NuevaSesionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .insert({ client_id: clienteId, ...input, registrada_por_cliente: false, revisada: true });
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarSesion(clienteId: string, sesionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sesiones").delete().eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function marcarSesionRevisada(clienteId: string, sesionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sesiones").update({ revisada: true }).eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
