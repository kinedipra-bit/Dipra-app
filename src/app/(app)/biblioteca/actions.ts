"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EjercicioBiblioteca } from "@/lib/dipra/types";

// Evita duplicados por nombre (sin mayúsculas/espacios de más) — si ya
// existe, avisa en vez de crear una segunda fila con el mismo ejercicio.
export async function crearEjercicioBiblioteca(nombre: string, link: string): Promise<EjercicioBiblioteca> {
  const supabase = await createClient();
  const nombreLimpio = nombre.trim();

  const { data: existentes } = await supabase
    .from("biblioteca_ejercicios")
    .select("id, nombre, link")
    .ilike("nombre", nombreLimpio)
    .returns<EjercicioBiblioteca[]>();
  if (existentes && existentes.length > 0) {
    throw new Error(`Ya existe "${existentes[0].nombre}" en la biblioteca — editalo en vez de crear otro.`);
  }

  const { data, error } = await supabase
    .from("biblioteca_ejercicios")
    .insert({ nombre: nombreLimpio, link: link.trim() })
    .select("id, nombre, link")
    .single<EjercicioBiblioteca>();

  if (error) throw new Error(error.message);

  revalidatePath("/biblioteca");
  return data;
}

export async function actualizarEjercicioBiblioteca(
  id: string,
  patch: Partial<Pick<EjercicioBiblioteca, "nombre" | "link">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("biblioteca_ejercicios").update(patch).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/biblioteca");
}

export async function eliminarEjercicioBiblioteca(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("biblioteca_ejercicios").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/biblioteca");
}
