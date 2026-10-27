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

export async function crearSesion(clienteId: string, input: NuevaSesionInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sesiones")
    .insert({ client_id: clienteId, ...input, registrada_por_cliente: false, revisada: true });
  if (error) throw new Error(error.message);
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
  const { error } = await supabase.from("sesiones").update({ ejercicios }).eq("id", sesionId);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}
