"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FmsData } from "@/lib/dipra/calc";
import { emptyFms } from "@/lib/dipra/constants";
import type {
  ComposicionCorporalEntry,
  EvaluacionCustomEntry,
  FmsHistorialEntry,
  MovilidadEsferaEntry,
} from "@/lib/dipra/types";

function revalidar(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}/evaluacion`);
  revalidatePath(`/clientes/${clienteId}/plan`);
}

// FMS -------------------------------------------------------------------------
// Historial de evaluaciones (una por fecha, editable) en
// client_fms_historial. `clients.fms` se mantiene como snapshot del
// screening MÁS RECIENTE, para que Plan y Evaluación grupal (que lo leen
// directo) sigan mostrando el dato vigente sin tener que consultar el
// historial completo.
async function sincronizarFmsActual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string
) {
  const { data } = await supabase
    .from("client_fms_historial")
    .select("fms")
    .eq("client_id", clienteId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<{ fms: FmsData }[]>();
  await supabase
    .from("clients")
    .update({ fms: data?.[0]?.fms ?? emptyFms() })
    .eq("id", clienteId);
}

export async function crearFmsHistorial(clienteId: string, fecha: string, fms: FmsData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_fms_historial")
    .insert({ client_id: clienteId, fecha, fms })
    .select("*")
    .single<FmsHistorialEntry>();
  if (error) throw new Error(error.message);
  await sincronizarFmsActual(supabase, clienteId);
  revalidar(clienteId);
  return data;
}

export async function actualizarFmsHistorial(
  clienteId: string,
  id: string,
  fecha: string,
  fms: FmsData
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_fms_historial").update({ fecha, fms }).eq("id", id);
  if (error) throw new Error(error.message);
  await sincronizarFmsActual(supabase, clienteId);
  revalidar(clienteId);
}

export async function eliminarFmsHistorial(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_fms_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await sincronizarFmsActual(supabase, clienteId);
  revalidar(clienteId);
}

// Dolor (ALICIA) --------------------------------------------------------------
// Se guarda como jsonb en la fila del cliente, igual que Ficha.

export async function updateDolorAlicia(clienteId: string, dolorAlicia: Record<string, string>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ dolor_alicia: dolorAlicia })
    .eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function updatePilaresDescriptivos(clienteId: string, pilares: Record<string, string>) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ pilares }).eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function updateMotivoConsulta(clienteId: string, motivoConsulta: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ motivo_consulta: motivoConsulta })
    .eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Composición corporal --------------------------------------------------------
// Histórico por fecha: solo alta y eliminación, no se editan mediciones pasadas.

export async function agregarComposicion(
  clienteId: string,
  entry: {
    fecha: string;
    talla: number | null;
    peso: number | null;
    grasa_pct: number | null;
    masa_muscular: number | null;
    agua_pct: number | null;
    masa_osea: number | null;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_composicion_corporal")
    .insert({ client_id: clienteId, ...entry })
    .select("*")
    .single<ComposicionCorporalEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function eliminarComposicion(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_composicion_corporal").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Movilidad por esferas --------------------------------------------------------
// Patrones libres, evaluados en 4 esferas (ver ESFERAS en constants.ts).

export async function agregarMovilidadEsfera(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_movilidad_esferas")
    .insert({ client_id: clienteId, patron: "", craneo: "", torax: "", pelvis: "", tobillo: "" })
    .select("*")
    .single<MovilidadEsferaEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function actualizarMovilidadEsfera(
  clienteId: string,
  id: string,
  patch: Partial<Pick<MovilidadEsferaEntry, "patron" | "craneo" | "torax" | "pelvis" | "tobillo">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_movilidad_esferas").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarMovilidadEsfera(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_movilidad_esferas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Evaluaciones específicas (lista libre) --------------------------------------

export async function agregarEvaluacionCustom(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_evaluaciones_custom")
    .insert({ client_id: clienteId, nombre: "", resultado: "" })
    .select("*")
    .single<EvaluacionCustomEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function actualizarEvaluacionCustom(
  clienteId: string,
  id: string,
  patch: Partial<Pick<EvaluacionCustomEntry, "nombre" | "resultado">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_evaluaciones_custom").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarEvaluacionCustom(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_evaluaciones_custom").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
