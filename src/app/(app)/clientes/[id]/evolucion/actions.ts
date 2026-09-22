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

export async function crearPrHistorial(clienteId: string, input: NuevaMedicionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pr_historial").insert({ client_id: clienteId, ...input });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/evolucion`);
}

export async function eliminarPrHistorial(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pr_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/evolucion`);
}
