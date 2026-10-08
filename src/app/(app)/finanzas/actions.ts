"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ClienteServicio, Gasto, Pago, Servicio } from "@/lib/dipra/types";

function revalidar(clienteId?: string) {
  revalidatePath("/finanzas");
  if (clienteId) revalidatePath(`/clientes/${clienteId}/finanzas`);
}

// Servicios (catálogo) --------------------------------------------------

export async function crearServicio(input: {
  nombre: string;
  tipo: "sesion" | "plan";
  precio: number;
  periodicidad: string;
  descripcion: string;
}): Promise<Servicio> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("servicios").insert(input).select("*").single<Servicio>();
  if (error) throw new Error(error.message);
  revalidar();
  return data;
}

export async function actualizarServicio(
  id: string,
  patch: Partial<Pick<Servicio, "nombre" | "tipo" | "precio" | "periodicidad" | "descripcion">>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("servicios").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// En vez de borrar (un servicio puede tener clientes/pagos ya asociados),
// se archiva — deja de aparecer para asignar a nuevos clientes, pero no
// rompe el historial de quienes ya lo tienen.
export async function archivarServicio(id: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("servicios").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}

// Servicio/plan por cliente ----------------------------------------------

export async function asignarServicio(
  clienteId: string,
  input: { servicioId: string; precioAcordado: number; fechaInicio: string }
): Promise<ClienteServicio> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cliente_servicios")
    .insert({
      client_id: clienteId,
      servicio_id: input.servicioId,
      precio_acordado: input.precioAcordado,
      fecha_inicio: input.fechaInicio,
    })
    .select("*")
    .single<ClienteServicio>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

// "Terminar" un plan/servicio asignado — no se borra, queda en el
// historial del cliente con su fecha_fin.
export async function finalizarClienteServicio(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cliente_servicios")
    .update({ activo: false, fecha_fin: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Pagos --------------------------------------------------------------------

export async function crearPago(
  clienteId: string,
  input: {
    clienteServicioId: string | null;
    monto: number;
    fecha: string;
    metodo: string;
    periodo: string;
    comentario: string;
  }
): Promise<Pago> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .insert({
      client_id: clienteId,
      cliente_servicio_id: input.clienteServicioId,
      monto: input.monto,
      fecha: input.fecha,
      metodo: input.metodo,
      periodo: input.periodo,
      comentario: input.comentario,
    })
    .select("*")
    .single<Pago>();
  if (error) throw new Error(error.message);
  revalidar(clienteId);
  return data;
}

export async function eliminarPago(clienteId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pagos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar(clienteId);
}

// Gastos ---------------------------------------------------------------------

export async function crearGasto(input: {
  fecha: string;
  categoria: string;
  monto: number;
  descripcion: string;
}): Promise<Gasto> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gastos").insert(input).select("*").single<Gasto>();
  if (error) throw new Error(error.message);
  revalidar();
  return data;
}

export async function eliminarGasto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidar();
}
