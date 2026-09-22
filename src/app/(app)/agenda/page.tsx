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

      <div className="dp-surface divide-y divide-black/5 rounded-2xl shadow-sm">
        {!citas || citas.length === 0 ? (
          <p className="dp-muted p-10 text-center text-sm">
            No hay sesiones agendadas este día. Usa &quot;Agendar sesión&quot; para sumar una.
          </p>
        ) : (
          citas.map((c) => <CitaRow key={c.id} cita={c} />)
        )}
      </div>
    </div>
  );
}
