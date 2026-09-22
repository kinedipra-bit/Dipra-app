"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaPlan, PlanSemana, EjercicioBiblioteca } from "@/lib/dipra/types";

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
    .update(patch)
    .eq("id", semanaId)
    .eq("client_id", clienteId);

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
