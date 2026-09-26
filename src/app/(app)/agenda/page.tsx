import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Cita } from "@/lib/dipra/types";
import { CitaRow } from "./CitaRow";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDias(fecha: string, delta: number) {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

// Grilla de horarios del día — de 07:00 a 21:00 cada 30 min. Si hay una
// cita ya agendada en un horario que no cae justo en esa grilla, igual se
// agrega como slot propio (no se pierde ni se reacomoda).
function generarSlots(inicio: string, fin: string, pasoMin: number): string[] {
  const slots: string[] = [];
  const [hFin, mFin] = fin.split(":").map(Number);
  let [h, m] = inicio.split(":").map(Number);
  while (h < hFin || (h === hFin && m <= mFin)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += pasoMin;
    if (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return slots;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : toISODate(new Date());

  const supabase = await createClient();
  const { data: citas } = await supabase
    .from("citas")
    .select("*")
    .eq("fecha", fecha)
    .order("hora")
    .returns<Cita[]>();

  const dateLabel = new Date(fecha + "T00:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const citasPorHora = new Map<string, Cita[]>();
  (citas ?? []).forEach((c) => {
    const h = c.hora.slice(0, 5);
    const lista = citasPorHora.get(h) ?? [];
    lista.push(c);
    citasPorHora.set(h, lista);
  });

  const slots = [...new Set([...generarSlots("07:00", "21:00", 30), ...citasPorHora.keys()])].sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">Agenda</h1>
        <Link
          href={`/agenda/nueva?fecha=${fecha}`}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          + Agendar sesión
        </Link>
      </div>

      <div className="dp-surface flex items-center justify-between rounded-2xl p-3 shadow-sm">
        <Link
          href={`/agenda?fecha=${addDias(fecha, -1)}`}
          className="dp-muted rounded-lg p-1.5 text-sm hover:dp-bg-faint"
        >
          ‹
        </Link>
        <span className="dp-text-heading text-sm font-medium capitalize">{dateLabel}</span>
        <Link
          href={`/agenda?fecha=${addDias(fecha, 1)}`}
          className="dp-muted rounded-lg p-1.5 text-sm hover:dp-bg-faint"
        >
          ›
        </Link>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((h) => {
          const citasHora = citasPorHora.get(h) ?? [];
          const ocupado = citasHora.length > 0;
          return (
            <div key={h} className={ocupado ? "dp-surface overflow-hidden rounded-xl shadow-sm" : "rounded-xl"}>
              <div className={`flex items-center justify-between px-4 py-2 ${ocupado ? "dp-bg-faint" : ""}`}>
                <span className={`font-mono text-sm ${ocupado ? "dp-text-heading font-medium" : "dp-muted"}`}>
                  {h}
                </span>
                <Link
                  href={`/agenda/nueva?fecha=${fecha}&hora=${h}`}
                  className="dp-text-brand text-xs font-medium hover:underline"
                >
                  {ocupado ? "+ Agregar a esta hora" : "+ Agregar"}
                </Link>
              </div>
              {ocupado && (
                <div className="divide-y divide-black/5">
                  {citasHora.map((c) => (
                    <CitaRow key={c.id} cita={c} mostrarHora={false} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
