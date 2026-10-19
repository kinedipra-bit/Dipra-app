"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HorarioCliente } from "@/lib/dipra/types";

function revalidar() {
  revalidatePath("/agenda");
  revalidatePath("/agenda/horarios");
}

export type HorarioConCliente = HorarioCliente & { cliente_nombre: string };

export async function listarHorarios(): Promise<HorarioConCliente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("horarios_cliente")
    .select("*, clients(nombre)")
    .eq("activo", true)
    .order("dia_semana")
    .order("hora")
    .returns<(HorarioCliente & { clients: { nombre: string } | null })[]>();
  return (data ?? []).map((h) => ({ ...h, cliente_nombre: h.clients?.nombre ?? "" }));
}

export async function crearHorario(input: {
  clientId: string;
  diaSemana: number;
  hora: string;
  tipo: string;
}): Promise<HorarioConCliente> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("horarios_cliente")
    .insert({ client_id: input.clientId, dia_semana: input.diaSemana, hora: input.hora, tipo: input.tipo })
    .select("*, clients(nombre)")
    .single<HorarioCliente & { clients: { nombre: string } | null }>();
  if (error) throw new Error(error.message);
  revalidar();
  return { ...data, cliente_nombre: data.clients?.nombre ?? "" };
}

export async function actualizarHorario(
  id: string,
  patch: Partial<Pick<HorarioCliente, "dia_semana" | "hora" | "tipo" | "activo">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("horarios_cliente").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

export async function eliminarHorario(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("horarios_cliente").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// Carga inicial masiva — ver /agenda/horarios/importar, que ya trae
// precargados día/hora/tipo desde el Excel y solo pide confirmar a qué
// cliente de la base corresponde cada nombre.
export async function crearHorariosEnLote(
  entries: { clientId: string; diaSemana: number; hora: string; tipo: string }[]
) {
  if (entries.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("horarios_cliente")
    .insert(entries.map((e) => ({ client_id: e.clientId, dia_semana: e.diaSemana, hora: e.hora, tipo: e.tipo })));
  if (error) throw new Error(error.message);
  revalidar();
}

export interface ResultadoGeneracion {
  creadas: number;
  saltadasFeriado: number;
  yaExistian: number;
}

// Crea las citas reales de las próximas `semanas` a partir de los horarios
// activos — salta feriados (ver public.feriados) y nunca duplica una cita
// que ya exista para el mismo cliente+fecha+hora, así se puede re-correr
// sin miedo (ej. después de agregar un horario nuevo a mitad de mes).
export async function generarCitasDesdeHorarios(semanas: number): Promise<ResultadoGeneracion> {
  const supabase = await createClient();

  const [{ data: horarios }, { data: feriados }] = await Promise.all([
    supabase
      .from("horarios_cliente")
      .select("*, clients(nombre)")
      .eq("activo", true)
      .returns<(HorarioCliente & { clients: { nombre: string } | null })[]>(),
    supabase.from("feriados").select("fecha").returns<{ fecha: string }[]>(),
  ]);
  if (!horarios || horarios.length === 0) return { creadas: 0, saltadasFeriado: 0, yaExistian: 0 };

  const feriadosSet = new Set((feriados ?? []).map((f) => f.fecha));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyISO = hoy.toISOString().slice(0, 10);
  const diaSemanaHoy = hoy.getDay(); // 0=domingo..6=sábado
  const deltaLunes = diaSemanaHoy === 0 ? -6 : 1 - diaSemanaHoy;
  const lunes = new Date(hoy);
  lunes.setDate(lunes.getDate() + deltaLunes);

  type Candidata = { client_id: string; cliente_nombre: string; fecha: string; hora: string; tipo: string };
  const candidatas: Candidata[] = [];
  for (let semana = 0; semana < semanas; semana++) {
    for (const h of horarios) {
      const fechaDate = new Date(lunes);
      fechaDate.setDate(fechaDate.getDate() + semana * 7 + h.dia_semana);
      const fecha = fechaDate.toISOString().slice(0, 10);
      if (fecha < hoyISO) continue;
      candidatas.push({
        client_id: h.client_id,
        cliente_nombre: h.clients?.nombre ?? "",
        fecha,
        hora: h.hora,
        tipo: h.tipo,
      });
    }
  }

  let saltadasFeriado = 0;
  const noFeriado = candidatas.filter((c) => {
    if (!feriadosSet.has(c.fecha)) return true;
    saltadasFeriado++;
    return false;
  });

  const fechas = [...new Set(noFeriado.map((c) => c.fecha))];
  const { data: existentes } =
    fechas.length > 0
      ? await supabase.from("citas").select("client_id, fecha, hora").in("fecha", fechas).returns<
          { client_id: string; fecha: string; hora: string }[]
        >()
      : { data: [] as { client_id: string; fecha: string; hora: string }[] };
  const existentesSet = new Set((existentes ?? []).map((e) => `${e.client_id}|${e.fecha}|${e.hora}`));

  let yaExistian = 0;
  const aInsertar = noFeriado.filter((c) => {
    const key = `${c.client_id}|${c.fecha}|${c.hora}`;
    if (!existentesSet.has(key)) return true;
    yaExistian++;
    return false;
  });

  if (aInsertar.length > 0) {
    const { error } = await supabase.from("citas").insert(
      aInsertar.map((c) => ({
        client_id: c.client_id,
        cliente_nombre: c.cliente_nombre,
        fecha: c.fecha,
        hora: c.hora,
        tipo: c.tipo,
        estado: "pendiente",
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidar();
  return { creadas: aInsertar.length, saltadasFeriado, yaExistian };
}
