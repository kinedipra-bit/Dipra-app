"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BloquePlan, DiaPlan, EjercicioSesion } from "@/lib/dipra/types";
import { obtenerOCrearPlanKine } from "../tareas/actions";

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

// Nicolás no siempre "programa": para varios clientes, el plan se va
// ajustando directo en la sesión (sube un peso, cambia un ejercicio) sin
// pasar antes por Plan — en vivo (crearSesion) o corrigiendo una sesión ya
// guardada (actualizarEjerciciosSesion, ej. "Editar pesos/series"). Sin
// esto, el Plan quedaba pegado en lo que decía la última vez que SÍ se
// editó ahí, aunque hiciera rato que la sesión real fuera otra. Así que al
// guardar/corregir una sesión de un día del plan, lo realmente hecho
// (nombre/series/reps/kg/unilateral/peso c/u) se vuelca de vuelta al
// ejercicio correspondiente de la semana ACTIVA — matcheando por
// planExercicioId (ver EjercicioSesion), no por nombre, porque el nombre es
// justo uno de los campos que puede haber cambiado. Ejercicios extra
// agregados en la sesión (sin planExercicioId), sesiones sin día de plan
// elegido, y sesiones de ANTES de que la semana activa se creara (ver el
// chequeo de `fecha` más abajo) quedan afuera: no tienen un lugar claro en
// el plan al que volcarse. Queda como borrador (cambios_sin_compartir)
// igual que cualquier otro cambio en Plan — si el cliente SÍ usa el
// portal, no ve el cambio hasta que Nicolás comparta.
async function sincronizarPlanConSesion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string,
  diaPlanLabel: string,
  fecha: string,
  ejercicios: EjercicioSesion[]
) {
  if (!diaPlanLabel) return;
  const reales = ejercicios.filter((e) => !e.extra && e.planExercicioId);
  if (reales.length === 0) return;

  const { data: cliente } = await supabase
    .from("clients")
    .select("semana_activa_id")
    .eq("id", clienteId)
    .single<{ semana_activa_id: string | null }>();
  if (!cliente?.semana_activa_id) return;

  const { data: semana } = await supabase
    .from("plan_semanas")
    .select("dias, created_at")
    .eq("id", cliente.semana_activa_id)
    .single<{ dias: DiaPlan[]; created_at: string }>();
  if (!semana) return;
  // Si la sesión que se está corrigiendo es de ANTES de que esta semana se
  // creara (ej. se editó una sesión vieja de una semana anterior que
  // reutilizó la misma etiqueta "Día 1"), no debe pisar el ejercicio de la
  // semana ACTUAL con un dato de otra época — mismo criterio que
  // SesionesPorDia/alertasProgramacion para acotar sesiones a la semana
  // vigente.
  if (fecha < semana.created_at.slice(0, 10)) return;

  const porId = new Map(reales.map((e) => [e.planExercicioId, e]));
  let cambio = false;
  const dias = semana.dias.map((d) => {
    if (d.label !== diaPlanLabel) return d;
    return {
      ...d,
      bloques: d.bloques.map((b) => ({
        ...b,
        exercises: b.exercises.map((ex) => {
          const real = porId.get(ex.id);
          if (!real) return ex;
          cambio = true;
          return {
            ...ex,
            nombre: real.nombre,
            series: real.seriesReal,
            reps: real.repsReal,
            kg: real.kgReal,
            pesosSeries: real.pesosSeriesReal,
            repsSeries: real.repsSeriesReal,
            unilateral: real.unilateral,
            pesoCadaUno: real.pesoCadaUno,
          };
        }),
      })),
    };
  });
  if (!cambio) return;

  const { error } = await supabase
    .from("plan_semanas")
    .update({ dias, cambios_sin_compartir: true })
    .eq("id", cliente.semana_activa_id);
  if (error) return;

  revalidatePath(`/clientes/${clienteId}/plan`);
}

export async function crearSesion(clienteId: string, input: NuevaSesionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .insert({ client_id: clienteId, ...input, registrada_por_cliente: false, revisada: true });
  if (error) throw new Error(error.message);
  await sincronizarPlanConSesion(supabase, clienteId, input.dia_plan_label, input.fecha, input.ejercicios);
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

// Nota interna del profesional sobre una sesión puntual (ver Sesion.
// comentario_profesional) — privada, nunca se muestra en el portal del
// cliente, así que alcanza con revalidar las rutas del profesional.
export async function guardarComentarioProfesional(clienteId: string, sesionId: string, comentario: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .update({ comentario_profesional: comentario })
    .eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Nuevos ids en todo el árbol — evita que choquen con los que ya existen
// en el plan destino (mismo criterio que clonarBloques en PlanView).
function clonarBloquesConNuevosIds(bloques: BloquePlan[]): BloquePlan[] {
  return bloques.map((b) => ({
    ...b,
    id: crypto.randomUUID(),
    exercises: b.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
  }));
}

// Pasa los bloques armados en "Ejercicios planificados en esta sesión"
// (mismo formato EjercicioPlan que Plan/Tareas, sin pérdida de datos) a una
// nueva sesión del plan de Tareas — para cuando el profesional usa
// Sesiones para preparar de antemano una sesión de kine: acá queda solo
// como registro, nunca se comparte con el cliente (eso solo pasa desde
// Tareas con su propio "Compartir"), así que hace falta este puente para
// que lo planificado termine siendo visible. Mismo criterio de numeración
// que "+ Agregar sesión" en Tareas (primer "Sesión N" libre).
export async function copiarSesionATareas(
  clienteId: string,
  bloques: BloquePlan[]
): Promise<{ error?: string; label?: string }> {
  if (bloques.every((b) => b.exercises.length === 0)) return { error: "No hay ejercicios para copiar." };

  const supabase = await createClient();
  const planKine = await obtenerOCrearPlanKine(clienteId);

  const usados = new Set(
    planKine.dias.map((d) => Number(d.label.match(/^Sesión (\d+)$/)?.[1])).filter((n) => !Number.isNaN(n))
  );
  let numero = 1;
  while (usados.has(numero)) numero++;

  const nuevaSesion: DiaPlan = {
    id: crypto.randomUUID(),
    label: `Sesión ${numero}`,
    foco: "",
    bloques: clonarBloquesConNuevosIds(bloques),
  };

  const { error } = await supabase
    .from("plan_kine")
    .update({ dias: [...planKine.dias, nuevaSesion], cambios_sin_compartir: true })
    .eq("client_id", clienteId);
  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/tareas`);
  return { label: nuevaSesion.label };
}

// Mismo puente que copiarSesionATareas pero hacia la semana ACTIVA del plan
// de fuerza — ej. una rutina armada acá en Sesiones que terminó gustando y
// se quiere dejar de "Día 2". Mismo criterio de numeración que "+ Agregar
// día" en Plan (primer "Día N" libre).
export async function copiarSesionAPlanFuerza(
  clienteId: string,
  bloques: BloquePlan[]
): Promise<{ error?: string; label?: string }> {
  if (bloques.every((b) => b.exercises.length === 0)) return { error: "No hay ejercicios para copiar." };

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clients")
    .select("semana_activa_id")
    .eq("id", clienteId)
    .single<{ semana_activa_id: string | null }>();
  if (!cliente?.semana_activa_id) {
    return {
      error: "Este cliente todavía no tiene una semana de plan de fuerza activa — creá una primero en Plan.",
    };
  }

  const { data: semana, error: errorLectura } = await supabase
    .from("plan_semanas")
    .select("dias")
    .eq("id", cliente.semana_activa_id)
    .single<{ dias: DiaPlan[] }>();
  if (errorLectura || !semana) return { error: errorLectura?.message ?? "No se encontró la semana activa." };

  const usados = new Set(
    semana.dias.map((d) => Number(d.label.match(/^Día (\d+)$/)?.[1])).filter((n) => !Number.isNaN(n))
  );
  let numero = 1;
  while (usados.has(numero)) numero++;

  const nuevoDia: DiaPlan = {
    id: crypto.randomUUID(),
    label: `Día ${numero}`,
    foco: "",
    bloques: clonarBloquesConNuevosIds(bloques),
  };

  const { error } = await supabase
    .from("plan_semanas")
    .update({ dias: [...semana.dias, nuevoDia], cambios_sin_compartir: true })
    .eq("id", cliente.semana_activa_id);
  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/plan`);
  return { label: nuevoDia.label };
}

// Corrige tipo y/o autoría de una sesión ya cargada — ej. una sesión que el
// profesional registró él mismo pero quedó marcada "por el cliente" (o al
// revés), o un tipo mal elegido al cargarla. Si pasa a "por vos", también
// queda como revisada (no tiene sentido que el profesional se marque a sí
// mismo el aviso de "sin revisar").
export async function actualizarTipoYAutoriaSesion(
  clienteId: string,
  sesionId: string,
  tipo: string,
  registradaPorCliente: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .update({
      tipo,
      registrada_por_cliente: registradaPorCliente,
      revisada: registradaPorCliente ? false : true,
    })
    .eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Corrige los pesos/series/reps de una sesión YA registrada — ej. cuando se
// anotaron en papel durante la sesión y se cargan después. No se podía
// editar nada de una sesión pasada salvo tipo/autoría.
export async function actualizarEjerciciosSesion(clienteId: string, sesionId: string, ejercicios: EjercicioSesion[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sesiones")
    .update({ ejercicios })
    .eq("id", sesionId)
    .select("dia_plan_label, fecha")
    .single<{ dia_plan_label: string; fecha: string }>();
  if (error) throw new Error(error.message);
  // Corregir pesos/series de una sesión pasada es otra forma de "lo
  // realmente hecho cambió" — mismo criterio que crearSesion, para que el
  // Plan no quede pegado si la corrección se hizo acá en vez de en vivo.
  await sincronizarPlanConSesion(supabase, clienteId, data.dia_plan_label, data.fecha, ejercicios);
  revalidar(clienteId);
}
