"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FmsData } from "@/lib/dipra/calc";
import { emptyFms } from "@/lib/dipra/constants";
import type {
  BateriaAdultoMayorEntry,
  ComposicionCorporalEntry,
  EpisodioHistorialEntry,
  EvaluacionCustomEntry,
  FmsHistorialEntry,
  MovilidadArticularEntry,
  MovilidadEsferaEntry,
  PruebaEspecialEntry,
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

// Episodios (motivo de consulta + ALICIA) -------------------------------------
// Historial por fecha, igual patrón que FMS: un paciente que vuelve por una
// consulta distinta agrega un episodio nuevo en vez de pisar el anterior.

export async function crearEpisodio(
  clienteId: string,
  fecha: string,
  motivoConsulta: string,
  dolorAlicia: Record<string, string>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_episodios_historial")
    .insert({ client_id: clienteId, fecha, motivo_consulta: motivoConsulta, dolor_alicia: dolorAlicia })
    .select("*")
    .single<EpisodioHistorialEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function actualizarEpisodio(
  clienteId: string,
  id: string,
  fecha: string,
  motivoConsulta: string,
  dolorAlicia: Record<string, string>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_episodios_historial")
    .update({ fecha, motivo_consulta: motivoConsulta, dolor_alicia: dolorAlicia })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarEpisodio(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_episodios_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function updatePilaresDescriptivos(clienteId: string, pilares: Record<string, string>) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ pilares }).eq("id", clienteId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function updateDiagnosticoKinesico(clienteId: string, diagnostico: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ diagnostico_kinesico: diagnostico })
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
  patch: Partial<Pick<MovilidadEsferaEntry, "patron" | "craneo" | "torax" | "pelvis" | "tobillo" | "tags">>
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

// Mini pizarra de diagnóstico de cadenas — el dibujo se exporta a PNG en
// el navegador y se sube acá, mismo patrón que subirIndicacionesPdf
// (tareas/actions.ts) pero en el bucket "diagramas".
const DIBUJO_CADENAS_MAX_BYTES = 2 * 1024 * 1024;

export async function subirDibujoCadenas(clienteId: string, entryId: string, formData: FormData) {
  const file = formData.get("dibujo");
  if (!(file instanceof File) || file.size === 0) throw new Error("No se recibió ningún dibujo.");
  if (file.size > DIBUJO_CADENAS_MAX_BYTES) throw new Error("El dibujo no puede pesar más de 2 MB.");

  const supabase = await createClient();
  const path = `${clienteId}/${entryId}.png`;
  const { error: uploadError } = await supabase.storage
    .from("diagramas")
    .upload(path, file, { upsert: true, contentType: "image/png" });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("client_movilidad_esferas").update({ dibujo_path: path }).eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return path;
}

export async function eliminarDibujoCadenas(clienteId: string, entryId: string, path: string) {
  const supabase = await createClient();
  await supabase.storage.from("diagramas").remove([path]);

  const { error } = await supabase
    .from("client_movilidad_esferas")
    .update({ dibujo_path: null })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Evaluaciones específicas (lista libre) --------------------------------------

export async function agregarEvaluacionCustom(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_evaluaciones_custom")
    .insert({ client_id: clienteId, nombre: "", resultado: "", fecha: new Date().toISOString().slice(0, 10) })
    .select("*")
    .single<EvaluacionCustomEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function actualizarEvaluacionCustom(
  clienteId: string,
  id: string,
  patch: Partial<Pick<EvaluacionCustomEntry, "nombre" | "resultado" | "fecha">>
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

// Movilidad articular (0-3, lógica FMS) -----------------------------------
// Historial por fecha, igual patrón que FMS — un registro nuevo por
// reevaluación, nunca se pisa el anterior.

export type NuevaMovilidadArticularInput = Omit<
  MovilidadArticularEntry,
  "id" | "client_id" | "created_at"
>;

export async function crearMovilidadArticular(clienteId: string, input: NuevaMovilidadArticularInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_movilidad_articular_historial")
    .insert({ client_id: clienteId, ...input })
    .select("*")
    .single<MovilidadArticularEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function eliminarMovilidadArticular(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_movilidad_articular_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Batería adulto mayor -----------------------------------------------------
// 5 tests validados (TUG, 30s sit-to-stand, balance unipodal, step-up,
// velocidad de marcha) — historial por fecha, mismo criterio que el resto.

export type NuevaBateriaAdultoMayorInput = Omit<BateriaAdultoMayorEntry, "id" | "client_id" | "created_at">;

export async function crearBateriaAdultoMayor(clienteId: string, input: NuevaBateriaAdultoMayorInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_bateria_adulto_mayor")
    .insert({ client_id: clienteId, ...input })
    .select("*")
    .single<BateriaAdultoMayorEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function eliminarBateriaAdultoMayor(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_bateria_adulto_mayor").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Pruebas especiales --------------------------------------------------------
// Tobillo (knee-to-wall), hombro (arco doloroso/Neer/Jobe/Hawkins), ASLR de
// pie y rotación torácica — historial por fecha, mismo criterio que FMS.
// Reemplaza a Movilidad articular en la pestaña, visible sin abrir el FMS.

export async function crearPruebaEspecial(clienteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_pruebas_especiales_historial")
    .insert({ client_id: clienteId, fecha: new Date().toISOString().slice(0, 10) })
    .select("*")
    .single<PruebaEspecialEntry>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function actualizarPruebaEspecial(
  clienteId: string,
  id: string,
  patch: Partial<Omit<PruebaEspecialEntry, "id" | "client_id" | "created_at">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pruebas_especiales_historial").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

export async function eliminarPruebaEspecial(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_pruebas_especiales_historial").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
