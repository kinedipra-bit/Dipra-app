"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaPlan, PlanKine } from "@/lib/dipra/types";

// El plan de kine es 1 fila por cliente (sin semanas) — se crea recién al
// primer acceso a la pestaña "Tareas", no de antemano.
export async function obtenerOCrearPlanKine(clienteId: string): Promise<PlanKine> {
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("plan_kine")
    .select("*")
    .eq("client_id", clienteId)
    .maybeSingle<PlanKine>();
  if (existente) return existente;

  const { data: creado, error } = await supabase
    .from("plan_kine")
    .insert({ client_id: clienteId, dias: [] })
    .select("*")
    .single<PlanKine>();
  if (error) throw new Error(error.message);
  return creado;
}

export async function guardarPlanKine(clienteId: string, dias: DiaPlan[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_kine")
    // Cualquier guardado es borrador — el cliente sigue viendo la última
    // versión compartida hasta que se comparta de nuevo.
    .update({ dias, cambios_sin_compartir: true })
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/tareas`);
}

// "Compartir": copia el borrador actual (`dias`) a lo que el cliente
// realmente ve (`dias_publicado`). Se lee primero porque el cliente de
// Supabase no soporta "columna = otra_columna" en un solo update.
export async function compartirPlanKine(clienteId: string) {
  const supabase = await createClient();
  const { data: actual, error: errorLectura } = await supabase
    .from("plan_kine")
    .select("dias")
    .eq("client_id", clienteId)
    .single<{ dias: DiaPlan[] }>();
  if (errorLectura || !actual) throw new Error(errorLectura?.message ?? "Plan no encontrado");

  const { error } = await supabase
    .from("plan_kine")
    .update({
      dias_publicado: actual.dias,
      publicado_at: new Date().toISOString(),
      cambios_sin_compartir: false,
    })
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/tareas`);
}
