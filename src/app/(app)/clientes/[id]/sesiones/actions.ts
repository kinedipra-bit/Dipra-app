"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { agruparPorBloque } from "@/lib/dipra/agruparEjercicios";
import type { BloquePlan, DiaPlan, EjercicioPlan, EjercicioSesion } from "@/lib/dipra/types";
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

function ejercicioPlanDesdeSesion(ex: EjercicioSesion): EjercicioPlan {
  return {
    id: crypto.randomUUID(),
    nombre: ex.nombre,
    series: ex.seriesReal,
    reps: ex.repsReal,
    kg: ex.kgReal,
    pesosSeries: ex.pesosSeriesReal,
    repsSeries: ex.repsSeriesReal,
    notaReps: ex.notaReps,
    tiempoSerie: ex.tiempoSerie,
    tipoCarga: ex.tipoCarga,
    unilateral: ex.unilateral,
    pesoCadaUno: ex.pesoCadaUno,
    link: ex.link ?? "",
    rpe: "",
    rir: "",
    tut: "",
    descanso: "",
    comentarioCliente: "",
  };
}

// Pasa lo cargado acá (los valores "real" de cada ejercicio, que es lo
// único editable en esta pantalla) a una nueva sesión del plan de Tareas —
// para cuando el profesional usa Sesiones para preparar de antemano una
// sesión de kine: acá queda solo como registro, nunca se comparte con el
// cliente (eso solo pasa desde Tareas con su propio "Compartir"), así que
// hace falta este puente para que lo planificado termine siendo visible.
// Mismo criterio de numeración que "+ Agregar sesión" en Tareas (primer
// "Sesión N" libre).
export async function copiarSesionATareas(
  clienteId: string,
  ejercicios: EjercicioSesion[]
): Promise<{ error?: string; label?: string }> {
  if (ejercicios.length === 0) return { error: "No hay ejercicios para copiar." };

  const supabase = await createClient();
  const planKine = await obtenerOCrearPlanKine(clienteId);

  const usados = new Set(
    planKine.dias.map((d) => Number(d.label.match(/^Sesión (\d+)$/)?.[1])).filter((n) => !Number.isNaN(n))
  );
  let numero = 1;
  while (usados.has(numero)) numero++;

  const bloques: BloquePlan[] = agruparPorBloque(ejercicios).map((grupo) => ({
    id: crypto.randomUUID(),
    title: grupo.bloqueTitle || "Bloque",
    exercises: grupo.items.map(({ ejercicio }) => ejercicioPlanDesdeSesion(ejercicio)),
  }));

  const nuevaSesion: DiaPlan = { id: crypto.randomUUID(), label: `Sesión ${numero}`, foco: "", bloques };

  const { error } = await supabase
    .from("plan_kine")
    .update({ dias: [...planKine.dias, nuevaSesion], cambios_sin_compartir: true })
    .eq("client_id", clienteId);
  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}/tareas`);
  return { label: nuevaSesion.label };
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
