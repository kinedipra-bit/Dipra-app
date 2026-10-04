"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FmsData } from "@/lib/dipra/calc";
import type { DiaPlan, Grupo, GrupoPlanSemana } from "@/lib/dipra/types";

function revalidar(grupoId?: string) {
  revalidatePath("/grupos");
  if (grupoId) revalidatePath(`/grupos/${grupoId}`);
}

export async function crearGrupo(nombre: string, miembros: string[]): Promise<Grupo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grupos")
    .insert({ nombre: nombre.trim() })
    .select("*")
    .single<Grupo>();
  if (error) throw new Error(error.message);

  if (miembros.length > 0) {
    const { error: miembrosError } = await supabase
      .from("grupo_miembros")
      .insert(miembros.map((clientId) => ({ grupo_id: data.id, client_id: clientId })));
    if (miembrosError) throw new Error(miembrosError.message);
  }

  revalidar();
  return data;
}

export async function actualizarMiembros(grupoId: string, miembros: string[]) {
  const supabase = await createClient();
  const { error: delError } = await supabase.from("grupo_miembros").delete().eq("grupo_id", grupoId);
  if (delError) throw new Error(delError.message);

  if (miembros.length > 0) {
    const { error } = await supabase
      .from("grupo_miembros")
      .insert(miembros.map((clientId) => ({ grupo_id: grupoId, client_id: clientId })));
    if (error) throw new Error(error.message);
  }

  revalidar(grupoId);
}

export async function renombrarGrupo(grupoId: string, nombre: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grupos").update({ nombre: nombre.trim() }).eq("id", grupoId);
  if (error) throw new Error(error.message);
  revalidar(grupoId);
}

export async function eliminarGrupo(grupoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grupos").delete().eq("id", grupoId);
  if (error) throw new Error(error.message);
  revalidar();
}

// Planificación grupal — mismo mecanismo que crearSemana/guardarSemana del
// plan individual (ver clientes/[id]/plan/actions.ts), pero sin "compartir"
// (no hay portal grupal: el profesional la abre directo desde la agenda).
export async function crearSemanaGrupo(
  grupoId: string,
  semana: { id: string; numero: number; mesociclo: string; objetivo: string; dias: DiaPlan[] }
): Promise<GrupoPlanSemana> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grupo_plan_semanas")
    .insert({ grupo_id: grupoId, ...semana })
    .select("*")
    .single<GrupoPlanSemana>();
  if (error) throw new Error(error.message);

  const { error: grupoError } = await supabase
    .from("grupos")
    .update({ semana_activa_id: semana.id })
    .eq("id", grupoId);
  if (grupoError) throw new Error(grupoError.message);

  revalidar(grupoId);
  return data;
}

export async function setSemanaActivaGrupo(grupoId: string, semanaId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grupos").update({ semana_activa_id: semanaId }).eq("id", grupoId);
  if (error) throw new Error(error.message);
  revalidar(grupoId);
}

export async function guardarSemanaGrupo(
  grupoId: string,
  semanaId: string,
  patch: { mesociclo: string; objetivo: string; dias: DiaPlan[] }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("grupo_plan_semanas")
    .update(patch)
    .eq("id", semanaId)
    .eq("grupo_id", grupoId);
  if (error) throw new Error(error.message);
  revalidar(grupoId);
}

// Evaluación grupal — FMS: trae el fms ACTUAL de cada miembro (para
// mergear solo los campos que se tocan en la grilla grupal, sin pisar el
// resto de su FMS individual, ej. pasoValla/estocada/clearings).
export async function obtenerFmsDeMiembros(clientIds: string[]): Promise<Record<string, FmsData>> {
  if (clientIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, fms")
    .in("id", clientIds)
    .returns<{ id: string; fms: FmsData }[]>();
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((c) => [c.id, c.fms]));
}
