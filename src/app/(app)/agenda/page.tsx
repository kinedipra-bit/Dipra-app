import Link from "next/link";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_CITA } from "@/lib/dipra/constants";
import type { Cita } from "@/lib/dipra/types";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDias(fecha: string, delta: number) {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

// Lunes de la semana que contiene `fecha` (semana de lunes a viernes).
function lunesDeLaSemana(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  const dia = d.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
  const delta = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

function generarHoras(inicio: number, fin: number): string[] {
  const horas: string[] = [];
  for (let h = inicio; h <= fin; h++) horas.push(`${String(h).padStart(2, "0")}:00`);
  return horas;
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie"];

// Color por tipo de cita — así de un vistazo se distingue un entrenamiento
// grupal (varias personas a la misma hora) de una sesión individual
// (kinesiología/rendimiento), igual que Nicolás lo maneja con colores en
// su planilla.
const TIPO_BG: Record<string, string> = {
  Kinesiología: "dp-bg-amber-soft",
  Rendimiento: "dp-bg-brand-soft",
  Evaluación: "dp-bg-faint",
  "Entrenamiento grupal": "dp-bg-lime-soft",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const fechaRef = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : toISODate(new Date());
  const lunes = lunesDeLaSemana(fechaRef);
  const diasFechas = Array.from({ length: 5 }, (_, i) => addDias(lunes, i));
  const viernes = diasFechas[4];

  const supabase = await createClient();
  const { data: citas } = await supabase
    .from("citas")
    .select("*")
    .gte("fecha", lunes)
    .lte("fecha", viernes)
    .order("hora")
    .returns<Cita[]>();

  const horas = generarHoras(7, 20);

  const citasPorCelda = new Map<string, Map<string, Cita[]>>();
  diasFechas.forEach((f) => citasPorCelda.set(f, new Map()));
  (citas ?? []).forEach((c) => {
    const horaCelda = `${c.hora.slice(0, 2)}:00`;
    const porFecha = citasPorCelda.get(c.fecha);
    if (!porFecha) return;
    const lista = porFecha.get(horaCelda) ?? [];
    lista.push(c);
    porFecha.set(horaCelda, lista);
  });

  const fmt = (f: string) => new Date(f + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  const rangoLabel = `${fmt(lunes)} – ${fmt(viernes)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold dp-text-heading">Agenda</h1>
        <Link
          href={`/agenda/nueva?fecha=${fechaRef}`}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          + Agendar sesión
        </Link>
      </div>

      <div className="dp-surface flex items-center justify-between rounded-2xl p-3 shadow-sm">
        <Link
          href={`/agenda?fecha=${addDias(lunes, -7)}`}
          className="dp-muted rounded-lg p-1.5 text-sm hover:dp-bg-faint"
        >
          ‹
        </Link>
        <span className="dp-text-heading text-sm font-medium capitalize">{rangoLabel}</span>
        <Link
          href={`/agenda?fecha=${addDias(lunes, 7)}`}
          className="dp-muted rounded-lg p-1.5 text-sm hover:dp-bg-faint"
        >
          ›
        </Link>
      </div>

      <div className="dp-surface overflow-x-auto rounded-2xl shadow-sm">
        <div className="grid min-w-[680px]" style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}>
          <div className="border-b border-black/5" />
          {diasFechas.map((f, i) => (
            <Link
              key={f}
              href={`/agenda/dia?fecha=${f}`}
              className="dp-bg-faint border-b border-l border-black/5 p-2 text-center hover:dp-bg-white-5"
            >
              <p className="dp-muted text-[10px] font-medium uppercase">{DIAS_SEMANA[i]}</p>
              <p className="dp-text-heading font-mono text-sm font-semibold">{f.slice(8, 10)}</p>
            </Link>
          ))}

          {horas.map((h) => (
            <Fragment key={h}>
              <div className="dp-muted border-b border-black/5 p-1.5 text-right font-mono text-[11px]">{h}</div>
              {diasFechas.map((f) => {
                const citasCelda = citasPorCelda.get(f)?.get(h) ?? [];
                const href =
                  citasCelda.length > 0 ? `/agenda/dia?fecha=${f}` : `/agenda/nueva?fecha=${f}&hora=${h}`;
                return (
                  <Link
                    key={`${f}-${h}`}
                    href={href}
                    className="flex min-h-11 flex-col gap-0.5 border-b border-l border-black/5 p-1 hover:dp-bg-faint"
                  >
                    {citasCelda.map((c) => (
                      <span
                        key={c.id}
                        className={`dp-text-heading truncate rounded px-1 py-0.5 text-[10px] font-medium ${TIPO_BG[c.tipo] ?? "dp-bg-faint"}`}
                      >
                        {c.cliente_nombre}
                      </span>
                    ))}
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {TIPOS_CITA.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${TIPO_BG[t] ?? "dp-bg-faint"}`} />
            <span className="dp-muted">{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
