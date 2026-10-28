"use client";

import { useState } from "react";

export interface EntradaEjercicioHistorico {
  fecha: string;
  diaPlanLabel: string | null;
  seriesReal: number;
  repsReal: number;
  kgReal: number;
  repsSeriesReal?: (number | string)[];
  pesosSeriesReal?: (number | string)[];
}

export interface EjercicioHistorico {
  nombre: string;
  entradas: EntradaEjercicioHistorico[];
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime()) ? f : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function repsTexto(e: EntradaEjercicioHistorico) {
  if (e.repsSeriesReal && e.repsSeriesReal.some((r) => Number(r) > 0)) {
    return e.repsSeriesReal.map((r) => Number(r) || 0).join("/");
  }
  return String(e.repsReal);
}

function kgTexto(e: EntradaEjercicioHistorico) {
  if (e.pesosSeriesReal && e.pesosSeriesReal.some((p) => Number(p) > 0)) {
    return e.pesosSeriesReal.map((p) => Number(p) || 0).join("/");
  }
  return String(e.kgReal);
}

// Selector de ejercicio + tabla cronológica de lo que de verdad se hizo
// (series/reps/kg reales por sesión) — para poder comparar semana a semana
// en UN ejercicio puntual, cosa que "Progresión semanal — volumen" (arriba,
// en esta misma pestaña) no permite porque solo suma todo junto.
export function ProgresionPorEjercicio({ ejercicios }: { ejercicios: EjercicioHistorico[] }) {
  const [nombreElegido, setNombreElegido] = useState(ejercicios[0]?.nombre ?? "");
  const elegido = ejercicios.find((e) => e.nombre === nombreElegido);

  if (ejercicios.length === 0) return null;

  return (
    <section className="dp-scope-dark rounded-2xl p-5 shadow-sm">
      <h2 className="dp-text-brand mb-1 font-[family-name:var(--font-display)] font-semibold">
        Progresión por ejercicio
      </h2>
      <p className="dp-muted mb-3 text-xs">
        Para comparar semana a semana cuánto hiciste de verdad en un ejercicio puntual.
      </p>
      <select
        value={nombreElegido}
        onChange={(e) => setNombreElegido(e.target.value)}
        className="dp-body mb-3 w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm outline-none sm:w-72"
      >
        {ejercicios.map((e) => (
          <option key={e.nombre} value={e.nombre} className="text-black">
            {e.nombre} ({e.entradas.length})
          </option>
        ))}
      </select>
      {elegido && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="dp-muted text-left text-[10px] font-medium tracking-wide uppercase">
                <th className="pb-1 pr-3">Fecha</th>
                <th className="pb-1 pr-3">Día</th>
                <th className="pb-1 pr-3">Series</th>
                <th className="pb-1 pr-3">Reps</th>
                <th className="pb-1">Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {elegido.entradas.map((e, i) => (
                <tr key={i} className="dp-body font-mono text-xs">
                  <td className="py-1.5 pr-3">{fmtFecha(e.fecha)}</td>
                  <td className="py-1.5 pr-3">{e.diaPlanLabel ?? "—"}</td>
                  <td className="py-1.5 pr-3">{e.seriesReal}</td>
                  <td className="py-1.5 pr-3">{repsTexto(e)}</td>
                  <td className="py-1.5">{kgTexto(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
