"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EjercicioBiblioteca } from "@/lib/dipra/types";

export async function crearEjercicioBiblioteca(nombre: string, link: string): Promise<EjercicioBiblioteca> {
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
