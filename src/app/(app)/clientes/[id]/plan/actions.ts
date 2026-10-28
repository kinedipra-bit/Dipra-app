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
  semana: {
    id: string;
    numero: number;
    mesociclo: string;
    objetivo: string;
    duracion_semanas: number;
    dias: DiaPlan[];
  }
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
      duracion_semanas: semana.duracion_semanas,
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
  revalidatePath(`/clientes/${clienteId}/sesiones`);
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
  revalidatePath(`/clientes/${clienteId}/sesiones`);
  revalidarInicio();
}

// Borra una semana (ej. quedó una semana vacía por un corrimiento de
// numeración) y renumera el resto 1..N para no dejar huecos. `clients.
// semana_activa_id` tiene "on delete set null" — si se borra justo la
// semana activa, se reasigna a la que quede con el número más alto para
// que el cliente no se quede sin semana activa en su portal.
export async function eliminarSemana(clienteId: string, semanaId: string) {
  const supabase = await createClient();

  const { data: restantes, error: errorLectura } = await supabase
    .from("plan_semanas")
    .select("id, numero")
    .eq("client_id", clienteId)
    .neq("id", semanaId)
    .order("numero", { ascending: true })
    .returns<{ id: string; numero: number }[]>();
  if (errorLectura) throw new Error(errorLectura.message);

  const { error } = await supabase.from("plan_semanas").delete().eq("id", semanaId).eq("client_id", clienteId);
  if (error) throw new Error(error.message);

  await Promise.all(
    (restantes ?? []).map((s, i) =>
      s.numero === i + 1 ? null : supabase.from("plan_semanas").update({ numero: i + 1 }).eq("id", s.id)
    )
  );

  const { data: cliente } = await supabase
    .from("clients")
    .select("semana_activa_id")
    .eq("id", clienteId)
    .single<{ semana_activa_id: string | null }>();
  if (!cliente?.semana_activa_id && restantes && restantes.length > 0) {
    const ultima = restantes[restantes.length - 1];
    await supabase.from("clients").update({ semana_activa_id: ultima.id }).eq("id", clienteId);
  }

  revalidatePath(`/clientes/${clienteId}/plan`);
  revalidatePath(`/clientes/${clienteId}/sesiones`);
  revalidarInicio();
}

// Persiste mesociclo/objetivo y el árbol `dias` completo de una semana en un
// solo update (ver nota del esquema: `dias` siempre se lee/escribe entero).
export async function guardarSemana(
  clienteId: string,
  semanaId: string,
  patch: { mesociclo: string; objetivo: string; duracion_semanas: number; dias: DiaPlan[] }
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
  // Sesiones lee `dias` (el borrador) directo para armar la "Ejecución real
  // vs. planificado" de una sesión nueva — sin esto, el caché de navegación
  // de Next podía seguir mostrando el plan de antes de este guardado si se
  // entraba a Sesiones por un link en vez de recargar la página.
  revalidatePath(`/clientes/${clienteId}/sesiones`);
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
// Idempotente a propósito: el botón "+ Guardar en biblioteca" de
// ExerciseRow se oculta cuando el nombre ya está en la biblioteca, pero esa
// comparación corre en el navegador con el estado que tenga cargado en ese
// momento — un clic doble, o dos filas con el mismo ejercicio guardadas
// casi al mismo tiempo desde pantallas distintas, podían terminar
// insertando el mismo ejercicio dos veces (así se juntaron ~15 duplicados
// en la biblioteca real). Antes de insertar, busca un nombre igual
// (sin mayúsculas/espacios de más) y si ya existe actualiza su link en vez
// de crear uno nuevo.
export async function guardarEnBiblioteca(nombre: string, link: string): Promise<EjercicioBiblioteca> {
  const supabase = await createClient();
  const nombreLimpio = nombre.trim();
  const linkLimpio = link.trim();

  const { data: existentes } = await supabase
    .from("biblioteca_ejercicios")
    .select("id, nombre, link")
    .ilike("nombre", nombreLimpio)
    .returns<EjercicioBiblioteca[]>();
  const existente = existentes?.[0];

  if (existente) {
    if (existente.link !== linkLimpio) {
      const { data, error } = await supabase
        .from("biblioteca_ejercicios")
        .update({ link: linkLimpio })
        .eq("id", existente.id)
        .select("id, nombre, link")
        .single<EjercicioBiblioteca>();
      if (error) throw new Error(error.message);
      revalidatePath("/biblioteca");
      return data;
    }
    return existente;
  }

  const { data, error } = await supabase
    .from("biblioteca_ejercicios")
    .insert({ nombre: nombreLimpio, link: linkLimpio })
    .select("id, nombre, link")
    .single<EjercicioBiblioteca>();

  if (error) throw new Error(error.message);

  revalidatePath("/biblioteca");
  return data;
}
