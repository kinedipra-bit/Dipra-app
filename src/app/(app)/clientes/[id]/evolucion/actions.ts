"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface NuevaMedicionInput {
  fecha: string;
  mesociclo: string;
  objetivo: string;
  sentadilla: number;
  peso_muerto: number;
  press_banca: number;
  press_militar: number;
  broad_jump: number;
  abalakov_jump: number;
  cmj: number;
  squat_jump: number;
  agarre_der: number;
  agarre_izq: number;
  dead_hang: number;
  pull_ups: number;
  push_up: number;
  plancha_frontal: number;
  plancha_lateral_der: number;
  plancha_lateral_izq: number;
  pararse_del_suelo: number;
}

// El formulario de carga (NuevaMedicionForm) se reusa desde Evaluación
// además de Evolución — se revalidan las dos rutas.
function revalidar(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}/evolucion`);
  revalidatePath(`/clientes/${clienteId}/evaluacion`);
}

export async function crearPrHistorial(clienteId: string, input: NuevaMedicionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pr_historial").insert({ client_id: clienteId, ...input });
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarPrHistorial(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pr_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
