"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cita } from "@/lib/dipra/types";

function revalidar() {
  revalidatePath("/agenda");
  // Inicio también muestra las citas de hoy.
  revalidatePath("/");
}

export interface NuevaCitaInput {
  client_id: string;
  cliente_nombre: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: Cita["estado"];
}

export async function crearCita(input: NuevaCitaInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").insert(input);
  if (error) throw new Error(error.message);
  revalidar();
  redirect(`/agenda?fecha=${input.fecha}`);
}

export async function actualizarEstadoCita(citaId: string, estado: Cita["estado"]) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").update({ estado }).eq("id", citaId);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function eliminarCita(citaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").delete().eq("id", citaId);
  if (error) throw new Error(error.message);
  revalidar();
}
