import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alertasCliente, citasSinSeguimiento, esClienteRemoto } from "@/lib/dipra/alertasProgramacion";
import { diasHastaCumpleanos } from "@/lib/dipra/cumpleanos";
import type { Cita, Cliente, PlanSemana, Sesion } from "@/lib/dipra/types";

function labelTipoCita(tipo: string) {
  return tipo === "Entrenamiento grupal" ? "grupal" : tipo.toLowerCase();
}

export default async function InicioPage() {
  const supabase = await createClient();
  const hoyDate = new Date();
  const today = hoyDate.toISOString().slice(0, 10);
  const hace14Dias = new Date(hoyDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ count: totalClientes }, { data: citasHoy }, { count: sesionesHoy }, { data: clientes }] =
    await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase
        .from("citas")
        .select("id, hora, tipo, estado, cliente_nombre, client_id")
        .eq("fecha", today)
        .order("hora"),
      supabase.from("sesiones").select("id", { count: "exact", head: true }).eq("fecha", today),
      supabase
        .from("clients")
        .select("id, nombre, semana_activa_id")
        .returns<Pick<Cliente, "id" | "nombre" | "semana_activa_id">[]>(),
    ]);

  const clienteIds = (clientes ?? []).map((c) => c.id);
  const semanaIds = (clientes ?? []).map((c) => c.semana_activa_id).filter((id): id is string => !!id);

  const [{ data: semanas }, { data: sesiones }] = await Promise.all([
    semanaIds.length > 0
      ? supabase.from("plan_semanas").select("id, dias, created_at").in("id", semanaIds).returns<
          Pick<PlanSemana, "id" | "dias" | "created_at">[]
        >()
      : Promise.resolve({ data: [] as Pick<PlanSemana, "id" | "dias" | "created_at">[] }),
    clienteIds.length > 0
      ? supabase
          .from("sesiones")
          .select("client_id, fecha, dia_plan_label, registrada_por_cliente, revisada")
          .in("client_id", clienteIds)
          .returns<Pick<Sesion, "client_id" | "fecha" | "dia_plan_label" | "registrada_por_cliente" | "revisada">[]>()
      : Promise.resolve({ data: [] as Pick<Sesion, "client_id" | "fecha" | "dia_plan_label" | "registrada_por_cliente" | "revisada">[] }),
  ]);

  const semanaPorId = new Map((semanas ?? []).map((s) => [s.id, s]));
  const clientesConAlerta = (clientes ?? []).flatMap((c) => {
    const sesionesCliente = (sesiones ?? []).filter((s) => s.client_id === c.id);
    if (!esClienteRemoto(sesionesCliente)) return [];
    const semana = c.semana_activa_id ? semanaPorId.get(c.semana_activa_id) : undefined;
    const alertas = alertasCliente({
      dias: semana?.dias ?? [],
      semanaCreatedAt: semana?.created_at,
      sesiones: sesionesCliente,
    });
    return alertas.length > 0 ? [{ id: c.id, nombre: c.nombre, alertas }] : [];
  });

  // Citas de kine/entrenamiento ya pasadas (últimos 14 días) que nadie
  // marcó "Cancelada"/"No asistió" y que tampoco tienen una sesión
  // registrada para ese día — probable atención sin evolución cargada.
  const { data: citasPasadas } = await supabase
    .from("citas")
    .select("id, client_id, cliente_nombre, fecha, tipo, estado")
    .gte("fecha", hace14Dias)
    .lt("fecha", today)
    .returns<Pick<Cita, "id" | "client_id" | "cliente_nombre" | "fecha" | "tipo" | "estado">[]>();

  const clienteIdsPasadas = [...new Set((citasPasadas ?? []).map((c) => c.client_id).filter((id): id is string => !!id))];
  const { data: sesionesPasadas } =
    clienteIdsPasadas.length > 0
      ? await supabase
          .from("sesiones")
          .select("client_id, fecha")
          .in("client_id", clienteIdsPasadas)
          .gte("fecha", hace14Dias)
          .returns<Pick<Sesion, "client_id" | "fecha">[]>()
      : { data: [] as Pick<Sesion, "client_id" | "fecha">[] };

  const sinSeguimiento = citasSinSeguimiento(citasPasadas ?? [], sesionesPasadas ?? []);

  // Cumpleaños en los próximos 7 días (hoy incluido).
  const { data: clientesConFecha } = await supabase
    .from("clients")
    .select("id, nombre, fecha_nacimiento")
    .not("fecha_nacimiento", "is", null)
    .returns<Pick<Cliente, "id" | "nombre" | "fecha_nacimiento">[]>();

  const proximosCumpleanos = (clientesConFecha ?? [])
    .flatMap((c) => {
      const dias = diasHastaCumpleanos(c.fecha_nacimiento as string, hoyDate);
      return dias !== null && dias <= 7 ? [{ id: c.id, nombre: c.nombre, dias }] : [];
    })
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">
          Inicio
        </h1>
        <p className="dp-body mt-1">Resumen del día</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Clientes</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{totalClientes ?? 0}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Citas hoy</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{citasHoy?.length ?? 0}</p>
        </div>
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <p className="dp-muted text-sm">Sesiones hoy</p>
          <p className="mt-1 text-3xl font-semibold dp-text-heading">{sesionesHoy ?? 0}</p>
        </div>
      </div>

      <div className="dp-surface rounded-2xl p-5 shadow-sm">
        <h2 className="mb-3 font-medium dp-text-heading">Citas de hoy</h2>
        {!citasHoy || citasHoy.length === 0 ? (
          <p className="dp-muted text-sm">No hay citas agendadas para hoy.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {citasHoy.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="dp-body">
                  <span className="dp-text-heading font-mono font-medium">{c.hora}</span> —{" "}
                  {c.client_id ? (
                    <Link href={`/clientes/${c.client_id}/ficha`} className="dp-text-brand hover:underline">
                      {c.cliente_nombre}
                    </Link>
                  ) : (
                    c.cliente_nombre
                  )}{" "}
                  <span className="dp-text-faint">({c.tipo})</span>
                </span>
                <span className="dp-muted text-xs capitalize">{c.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {clientesConAlerta.length > 0 && (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <h2 className="mb-3 font-medium dp-text-heading">Necesitan tu atención</h2>
          <ul className="flex flex-col divide-y divide-black/5">
            {clientesConAlerta.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/clientes/${c.id}/ficha`} className="dp-text-brand hover:underline">
                  {c.nombre}
                </Link>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {c.alertas.map((a) => (
                    <span
                      key={a.tipo}
                      className="dp-bg-alert-soft dp-alert rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      ⚠ {a.detalle}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sinSeguimiento.length > 0 && (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <h2 className="mb-1 font-medium dp-text-heading">Citas sin seguimiento</h2>
          <p className="dp-muted mb-3 text-xs">
            Ya pasó la fecha, nadie marcó cancelada/no asistió, y no hay una sesión registrada ese día.
          </p>
          <ul className="flex flex-col divide-y divide-black/5">
            {sinSeguimiento.map((c) => (
              <li key={c.citaId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="dp-body">
                  <Link href={`/clientes/${c.clienteId}/ficha`} className="dp-text-brand hover:underline">
                    {c.clienteNombre}
                  </Link>{" "}
                  <span className="dp-text-faint">
                    — {c.fecha.slice(8, 10)}/{c.fecha.slice(5, 7)} ({labelTipoCita(c.tipo)})
                  </span>
                </span>
                <Link href={`/agenda/dia?fecha=${c.fecha}`} className="dp-muted text-xs hover:dp-text-brand">
                  Ver cita →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proximosCumpleanos.length > 0 && (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <h2 className="mb-3 font-medium dp-text-heading">🎂 Cumpleaños</h2>
          <ul className="flex flex-col divide-y divide-black/5">
            {proximosCumpleanos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/clientes/${c.id}/ficha`} className="dp-text-brand hover:underline">
                  {c.nombre}
                </Link>
                <span className="dp-muted text-xs">
                  {c.dias === 0 ? "¡Hoy!" : c.dias === 1 ? "Mañana" : `En ${c.dias} días`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
