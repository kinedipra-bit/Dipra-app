import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClienteServicio, Pago, Servicio } from "@/lib/dipra/types";
import { ClienteFinanzasView } from "./ClienteFinanzasView";

export default async function ClienteFinanzasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: serviciosActivos }, { data: clienteServicios }, { data: pagos }] =
    await Promise.all([
      supabase.from("clients").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
      supabase.from("servicios").select("*").eq("activo", true).order("nombre").returns<Servicio[]>(),
      supabase
        .from("cliente_servicios")
        .select("*, servicios(nombre, tipo)")
        .eq("client_id", id)
        .order("fecha_inicio", { ascending: false })
        .returns<(ClienteServicio & { servicios: { nombre: string; tipo: string } | null })[]>(),
      supabase.from("pagos").select("*").eq("client_id", id).order("fecha", { ascending: false }).returns<Pago[]>(),
    ]);

  if (!cliente) notFound();

  const clienteServiciosConNombre = (clienteServicios ?? []).map((cs) => ({
    ...cs,
    servicioNombre: cs.servicios?.nombre ?? "—",
    servicioTipo: (cs.servicios?.tipo as "sesion" | "plan") ?? "sesion",
  }));

  return (
    <ClienteFinanzasView
      clienteId={cliente.id}
      serviciosActivos={serviciosActivos ?? []}
      clienteServiciosIniciales={clienteServiciosConNombre}
      pagosIniciales={pagos ?? []}
    />
  );
}
