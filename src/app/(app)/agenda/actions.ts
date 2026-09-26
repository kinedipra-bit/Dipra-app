"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Cita, DiaPlan } from "@/lib/dipra/types";

function revalidar() {
  revalidatePath("/agenda");
  // Inicio también muestra las citas de hoy.
  revalidatePath("/");
}

export interface NuevaCitaInput {
  // null cuando se agenda a alguien que todavía no tiene ficha (ej. un
  // entrenamiento grupal con gente nueva) — cliente_nombre queda como
  // único registro de quién es hasta que se le cree la ficha.
  client_id: string | null;
  cliente_nombre: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: Cita["estado"];
  // A qué día del plan corresponde esta cita (ej. "Día 2"), si se asignó —
  // permite cruzar la agenda real con la sugerencia de descanso por grupo
  // muscular (ver tablaIntensidad.ts).
  dia_plan_label?: string | null;
}

export async function crearCita(input: NuevaCitaInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("citas").insert(input);
  if (error) throw new Error(error.message);
  revalidar();
  redirect(`/agenda?fecha=${input.fecha}`);
}

// Para el selector "Día del plan" al agendar: trae los días de la semana
// activa del cliente (solo id + label, no hace falta el resto del plan).
export async function obtenerDiasPlan(clienteId: string): Promise<{ id: string; label: string }[]> {
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
  return (semana?.dias ?? []).map((d) => ({ id: d.id, label: d.label }));
}

// Para el aviso "sería la sesión N° X de kinesiología" al agendar — cuenta
// las citas de kinesiología ya agendadas para ese cliente (sin contar las
// canceladas, que no llegaron a pasar).
export async function contarSesionesKinesiologia(clienteId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("citas")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clienteId)
    .eq("tipo", "Kinesiología")
    .neq("estado", "cancelada");
  return count ?? 0;
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
