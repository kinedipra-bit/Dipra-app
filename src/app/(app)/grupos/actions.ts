"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FmsData } from "@/lib/dipra/calc";
import { emptySesionPilares } from "@/lib/dipra/constants";
import type { DiaPlan, EjercicioSesion, Grupo, GrupoPlanSemana } from "@/lib/dipra/types";

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

// Sesión grupal: deja registrado que la clase se hizo, creando una fila en
// `sesiones` por cada asistente — misma tabla que usa Sesiones individual,
// así la clase queda visible en la ficha de cada persona (y en su
// Evolución) igual que si se hubiese cargado una por una. Cada asistente
// trae su propio array de ejercicios (mismo día, pero el peso real puede
// ser distinto persona a persona).
export async function crearSesionGrupal(input: {
  grupoId: string;
  fecha: string;
  diaPlanLabel: string;
  comentarios: string;
  sesionesPorAsistente: { clientId: string; ejercicios: EjercicioSesion[] }[];
}) {
  if (input.sesionesPorAsistente.length === 0) throw new Error("Marcá al menos una persona que asistió.");
  const supabase = await createClient();
  const filas = input.sesionesPorAsistente.map(({ clientId, ejercicios }) => ({
    client_id: clientId,
    fecha: input.fecha,
    tipo: "Entrenamiento grupal",
    dia_plan_label: input.diaPlanLabel,
    es_primera_sesion: false,
    comentarios_pre: "",
    pilares: emptySesionPilares(),
    comentarios: input.comentarios,
    ejercicios,
    registrada_por_cliente: false,
    revisada: true,
  }));
  const { error } = await supabase.from("sesiones").insert(filas);
  if (error) throw new Error(error.message);

  input.sesionesPorAsistente.forEach(({ clientId }) => revalidatePath(`/clientes/${clientId}/sesiones`));
  revalidatePath("/");
  revalidatePath("/clientes");
  revalidar(input.grupoId);
}

// Para precargar la grilla de la sesión grupal con el peso que cada persona
// venía haciendo — trae, por miembro, la última sesión registrada para ese
// mismo día del plan (si existe) y el kg real que quedó por ejercicio. Así
// el profesional ve/recuerda la carga de la semana anterior al cargar la
// de esta semana, en vez de partir siempre del peso planificado.
export async function obtenerUltimosPesosGrupales(
  clientIds: string[],
  diaPlanLabel: string
): Promise<Record<string, Record<string, number>>> {
  if (clientIds.length === 0 || !diaPlanLabel) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sesiones")
    .select("client_id, fecha, ejercicios")
    .in("client_id", clientIds)
    .eq("dia_plan_label", diaPlanLabel)
    .order("fecha", { ascending: false })
    .returns<{ client_id: string; fecha: string; ejercicios: EjercicioSesion[] }[]>();
  if (error) throw new Error(error.message);

  const resultado: Record<string, Record<string, number>> = {};
  (data ?? []).forEach((row) => {
    if (resultado[row.client_id]) return; // ya se guardó la más reciente de esta persona (orden desc)
    resultado[row.client_id] = Object.fromEntries(
      row.ejercicios.map((ex) => [ex.nombre, Number(ex.kgReal) || 0])
    );
  });
  return resultado;
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
