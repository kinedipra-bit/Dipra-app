"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MetricaExtra } from "@/lib/dipra/types";

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
  // Valores de métricas personalizadas (ver MetricaExtra), clave = su id —
  // opcional porque la evaluación grupal (EvaluacionGrupalForm) no las usa.
  extra?: Record<string, number>;
}

// El formulario de carga (NuevaMedicionForm) se reusa desde Evaluación
// además de Evolución — se revalidan las dos rutas.
function revalidar(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}/evolucion`);
  revalidatePath(`/clientes/${clienteId}/evaluacion`);
}

export async function crearPrHistorial(clienteId: string, input: NuevaMedicionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_pr_historial")
    .insert({ client_id: clienteId, ...input, extra: input.extra ?? {} });
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarPrHistorial(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pr_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Ejercicios de rendimiento personalizados (ver MetricaExtra) — "general"
// (cliente_id null) o solo para este cliente, mismo criterio que
// crearPlantilla en plan/actions.ts.
export async function crearMetricaExtra(
  clienteId: string,
  alcanceClienteId: string | null,
  label: string
): Promise<MetricaExtra> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas_rendimiento_extra")
    .insert({ cliente_id: alcanceClienteId, label })
    .select("*")
    .single<MetricaExtra>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function eliminarMetricaExtra(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("metricas_rendimiento_extra").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
