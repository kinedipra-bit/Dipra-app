"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mandarPushACliente } from "@/lib/push";
import type { DiaPlan, PlanKine } from "@/lib/dipra/types";

// Aviso push al compartir — best-effort, ver la misma nota en
// clientes/[id]/plan/actions.ts (avisarSemanaProgramada): nunca debe
// romper el compartir en sí.
async function avisarTareasProgramadas(supabase: Awaited<ReturnType<typeof createClient>>, clienteId: string) {
  try {
    const { data: cliente } = await supabase
      .from("clients")
      .select("nombre, portal_token")
      .eq("id", clienteId)
      .single<{ nombre: string; portal_token: string }>();
    if (!cliente) return;
    const primerNombre = cliente.nombre.trim().split(" ")[0] || cliente.nombre;
    await mandarPushACliente(clienteId, {
      title: "Tus tareas fueron actualizadas 💪",
      body: `${primerNombre}, tu profesional actualizó tu plan de kinesiología — entrá a verlo.`,
      url: `/portal/${cliente.portal_token}/tareas`,
    });
  } catch {
    // Silencioso a propósito.
  }
}

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

// Para "Copiar desde el plan de fuerza": trae los días del borrador actual
// de la semana activa de fuerza (no hace falta que esté compartida — el
// profesional está copiando su propio trabajo, no lo que ve el cliente).
export async function obtenerDiasFuerza(clienteId: string): Promise<DiaPlan[]> {
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clients")
    .select("semana_activa_id")
    .eq("id", clienteId)
    .single<{ semana_activa_id: string | null }>();
  if (!cliente?.semana_activa_id) return [];

  const { data: semana } = await supabase
    .from("plan_semanas")
    .select("dias")
    .eq("id", cliente.semana_activa_id)
    .single<{ dias: DiaPlan[] }>();
  return semana?.dias ?? [];
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
  await avisarTareasProgramadas(supabase, clienteId);
}

// Indicaciones para el cliente (texto + PDF opcional) — independiente del
// borrador/compartir de `dias`: se guarda y se ve de inmediato en el
// portal, no hace falta "Compartir" (es contenido informativo, no el plan
// de ejercicios en sí).
export async function actualizarIndicacionesTexto(clienteId: string, texto: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_kine")
    .update({ indicaciones_texto: texto })
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/tareas`);
}

const INDICACIONES_PDF_MAX_BYTES = 4 * 1024 * 1024;

export async function subirIndicacionesPdf(clienteId: string, formData: FormData) {
  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) throw new Error("No se seleccionó ningún archivo.");
  if (file.type !== "application/pdf") throw new Error("Solo se puede subir un PDF.");
  if (file.size > INDICACIONES_PDF_MAX_BYTES) throw new Error("El PDF no puede pesar más de 4 MB.");

  const supabase = await createClient();
  const path = `${clienteId}/indicaciones.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("indicaciones")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from("plan_kine")
    .update({ indicaciones_pdf_path: path, indicaciones_pdf_nombre: file.name })
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/tareas`);
}

export async function eliminarIndicacionesPdf(clienteId: string, path: string) {
  const supabase = await createClient();
  await supabase.storage.from("indicaciones").remove([path]);

  const { error } = await supabase
    .from("plan_kine")
    .update({ indicaciones_pdf_path: null, indicaciones_pdf_nombre: null })
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/tareas`);
}
