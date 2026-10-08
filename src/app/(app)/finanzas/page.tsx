import { createClient } from "@/lib/supabase/server";
import type { ClienteServicio, Gasto, Pago, Servicio } from "@/lib/dipra/types";
import { FinanzasView } from "./FinanzasView";

function limitesDelMes(hoy: Date) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  return { inicio, fin, periodo };
}

export type ClienteServicioConNombres = ClienteServicio & {
  clienteNombre: string;
  servicioNombre: string;
  servicioTipo: "sesion" | "plan";
};

export type PagoConCliente = Pago & { clienteNombre: string };

export default async function FinanzasPage() {
  const supabase = await createClient();
  const hoy = new Date();
  const { inicio, fin, periodo } = limitesDelMes(hoy);

  const [
    { data: servicios },
    { data: clienteServiciosRaw },
    { data: pagosMes },
    { data: gastosMes },
    { data: pagosRecientes },
    { data: gastosRecientes },
    { data: clientes },
  ] = await Promise.all([
    supabase.from("servicios").select("*").order("nombre").returns<Servicio[]>(),
    supabase
      .from("cliente_servicios")
      .select("*, clients(nombre), servicios(nombre, tipo)")
      .eq("activo", true)
      .returns<(ClienteServicio & { clients: { nombre: string } | null; servicios: { nombre: string; tipo: string } | null })[]>(),
    supabase.from("pagos").select("monto").gte("fecha", inicio).lte("fecha", fin).returns<{ monto: number }[]>(),
    supabase.from("gastos").select("monto").gte("fecha", inicio).lte("fecha", fin).returns<{ monto: number }[]>(),
    supabase
      .from("pagos")
      .select("*, clients(nombre)")
      .order("fecha", { ascending: false })
      .limit(30)
      .returns<(Pago & { clients: { nombre: string } | null })[]>(),
    supabase.from("gastos").select("*").order("fecha", { ascending: false }).limit(30).returns<Gasto[]>(),
    supabase.from("clients").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
  ]);

  const clienteServicios: ClienteServicioConNombres[] = (clienteServiciosRaw ?? []).map((cs) => ({
    ...cs,
    clienteNombre: cs.clients?.nombre ?? "—",
    servicioNombre: cs.servicios?.nombre ?? "—",
    servicioTipo: (cs.servicios?.tipo as "sesion" | "plan") ?? "sesion",
  }));

  // Planes activos sin un pago registrado para el período (mes) actual.
  const { data: pagosDelPeriodo } = await supabase
    .from("pagos")
    .select("cliente_servicio_id")
    .eq("periodo", periodo)
    .returns<{ cliente_servicio_id: string | null }[]>();
  const cubiertos = new Set((pagosDelPeriodo ?? []).map((p) => p.cliente_servicio_id).filter(Boolean));
  const pendientesDePago = clienteServicios.filter((cs) => cs.servicioTipo === "plan" && !cubiertos.has(cs.id));

  const ingresosMes = (pagosMes ?? []).reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const gastosDelMes = (gastosMes ?? []).reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

  const pagos: PagoConCliente[] = (pagosRecientes ?? []).map((p) => ({ ...p, clienteNombre: p.clients?.nombre ?? "—" }));

  return (
    <FinanzasView
      serviciosIniciales={servicios ?? []}
      clienteServicios={clienteServicios}
      pendientesDePago={pendientesDePago}
      ingresosMes={ingresosMes}
      gastosMes={gastosDelMes}
      periodoActual={periodo}
      pagosIniciales={pagos}
      gastosIniciales={gastosRecientes ?? []}
      clientes={clientes ?? []}
    />
  );
}
