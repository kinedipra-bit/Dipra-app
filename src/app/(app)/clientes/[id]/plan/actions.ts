"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mandarPushACliente } from "@/lib/push";
import type { DiaPlan, PlanSemana, EjercicioBiblioteca, PlantillaRutina } from "@/lib/dipra/types";

// Inicio calcula la alerta "semana completa" (ver alertasProgramacion.ts) a
// partir de los días/fecha de creación de la semana ACTIVA de cada cliente
// — crear, guardar, compartir o cambiar de semana activa puede cambiar esa
// alerta, así que las cuatro acciones de esta semana necesitan revalidar
// "/" además de la página de Plan (antes solo revalidaban Plan, por eso la
// alerta se quedaba pegada después de programar la semana siguiente).
function revalidarInicio() {
  revalidatePath("/");
  revalidatePath("/clientes");
}

// Aviso push de "tu semana ya está programada" al compartir — best-effort:
// si el cliente no activó notificaciones, o la infraestructura de push
// todavía no está configurada (VAPID / tabla de suscripciones), NO debe
// romper el compartir en sí (lo importante es que la rutina quedó
// compartida; el aviso es un plus). Por eso va en su propio try/catch,
// separado del resto de compartirSemana.
async function avisarSemanaProgramada(supabase: Awaited<ReturnType<typeof createClient>>, clienteId: string) {
  try {
    const { data: cliente } = await supabase
      .from("clients")
      .select("nombre, portal_token")
      .eq("id", clienteId)
      .single<{ nombre: string; portal_token: string }>();
    if (!cliente) return;
    const primerNombre = cliente.nombre.trim().split(" ")[0] || cliente.nombre;
    await mandarPushACliente(clienteId, {
      title: "Tu semana ya está programada 💪",
      body: `${primerNombre}, tu profesional actualizó tu rutina — entrá a verla.`,
      url: `/portal/${cliente.portal_token}/plan`,
    });
  } catch {
    // Silencioso a propósito — ver nota arriba.
  }
}

// Crea una semana nueva (clon de la semana activa, o plantilla en blanco si
// es la primera) y la marca como semana activa del cliente. El id, número y
// días ya vienen resueltos desde el cliente (ver PlanView.crearNuevaSemana)
// porque ahí es donde se decide si se clona o se arranca de nuevosDias().
export async function crearSemana(
  clienteId: string,
  semana: { id: string; numero: number; mesociclo: string; objetivo: string; dias: DiaPlan[] }
): Promise<PlanSemana> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plan_semanas")
    .insert({
      id: semana.id,
      client_id: clienteId,
      numero: semana.numero,
      mesociclo: semana.mesociclo,
      objetivo: semana.objetivo,
      dias: semana.dias,
      // Nueva semana, todavía nada compartido — el cliente sigue sin ver
      // esto hasta que el profesional apriete "Compartir rutina".
      cambios_sin_compartir: true,
    })
    .select("*")
    .single<PlanSemana>();

  if (error) throw new Error(error.message);

  const { error: clienteError } = await supabase
    .from("clients")
    .update({ semana_activa_id: semana.id })
    .eq("id", clienteId);

  if (clienteError) throw new Error(clienteError.message);

  revalidatePath(`/clientes/${clienteId}/plan`);
  revalidarInicio();
  return data;
}

export async function setSemanaActiva(clienteId: string, semanaId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ semana_activa_id: semanaId })
    .eq("id", clienteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/plan`);
  revalidarInicio();
}

// Persiste mesociclo/objetivo y el árbol `dias` completo de una semana en un
// solo update (ver nota del esquema: `dias` siempre se lee/escribe entero).
export async function guardarSemana(
  clienteId: string,
  semanaId: string,
  patch: { mesociclo: string; objetivo: string; dias: DiaPlan[] }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_semanas")
    // Cualquier guardado es un cambio de borrador — el cliente sigue viendo
    // la última versión que se le compartió hasta que se comparta de nuevo.
    .update({ ...patch, cambios_sin_compartir: true })
    .eq("id", semanaId)
    .eq("client_id", clienteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/plan`);
  revalidarInicio();
}

// "Compartir rutina": copia el borrador actual (`dias`) a la versión que
// realmente ve el cliente (`dias_publicado`). Se lee `dias` primero en vez
// de referenciarlo dentro del mismo update porque el cliente de Supabase
// no soporta expresiones tipo "columna = otra_columna" en un solo update.
export async function compartirSemana(clienteId: string, semanaId: string) {
  const supabase = await createClient();
  const { data: actual, error: errorLectura } = await supabase
    .from("plan_semanas")
    .select("dias")
    .eq("id", semanaId)
    .eq("client_id", clienteId)
    .single<{ dias: DiaPlan[] }>();
  if (errorLectura || !actual) throw new Error(errorLectura?.message ?? "Semana no encontrada");

  const { error } = await supabase
    .from("plan_semanas")
    .update({
      dias_publicado: actual.dias,
      publicado_at: new Date().toISOString(),
      cambios_sin_compartir: false,
    })
    .eq("id", semanaId)
    .eq("client_id", clienteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clientes/${clienteId}/plan`);
  revalidarInicio();
  await avisarSemanaProgramada(supabase, clienteId);
}

// Guarda la semana actual como plantilla reutilizable ("biblioteca de
// rutinas") — `alcanceClienteId` null la deja disponible para cualquier
// cliente; con valor, queda solo para seguir la línea de ese cliente en
// mesociclos futuros. `clienteId` es siempre el cliente desde el que se
// guarda (para revalidar su página de plan), sea o no el mismo que el
// alcance de la plantilla.
export async function crearPlantilla(
  clienteId: string,
  alcanceClienteId: string | null,
  plantilla: { titulo: string; mesociclo: string; objetivo: string; dias: DiaPlan[] }
): Promise<PlantillaRutina> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plantillas_rutina")
    .insert({ cliente_id: alcanceClienteId, ...plantilla })
    .select("*")
    .single<PlantillaRutina>();

  if (error) throw new Error(error.message);

  revalidatePath(`/clientes/${clienteId}/plan`);
  return data;
}

export async function eliminarPlantilla(clienteId: string, plantillaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plantillas_rutina").delete().eq("id", plantillaId);

  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/plan`);
}

// Alta rápida de un ejercicio a la biblioteca desde el botón "+ Guardar en
// biblioteca" de ExerciseRow. Vive acá (en vez de importar desde el módulo
// de /biblioteca, que es carpeta de otro agente en paralelo) para no cruzar
// carpetas asignadas; igual revalida /biblioteca para que esa vista quede
// al día si alguien la tiene abierta.
export async function guardarEnBiblioteca(nombre: string, link: string): Promise<EjercicioBiblioteca> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("biblioteca_ejercicios")
    .insert({ nombre: nombre.trim(), link: link.trim() })
    .select("id, nombre, link")
    .single<EjercicioBiblioteca>();

  if (error) throw new Error(error.message);

  revalidatePath("/biblioteca");
  return data;
}
