"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ejerciciosDesdeDia } from "@/lib/dipra/agruparEjercicios";
import type { DiaPlan, EjercicioSesion } from "@/lib/dipra/types";
import { crearSesionGrupal, obtenerUltimosPesosGrupales } from "../actions";

const inputClass =
  "w-full rounded-md border border-black/10 px-1.5 py-1 text-center font-mono text-xs outline-none focus:dp-border-brand";

// Registra que la clase grupal se hizo: crea una Sesion por cada asistente
// (misma tabla que usa Sesiones individual), copiando los ejercicios del
// día elegido de la planificación grupal — así queda registrado en la
// ficha de cada persona, igual que una sesión individual. La grilla deja
// anotar el peso real de cada uno (precargado con lo que venía haciendo la
// última vez que se hizo este mismo día), para ir recordándoles/subiéndoles
// la carga semana a semana.
export function SesionGrupalForm({
  grupoId,
  miembros,
  diasPlan,
}: {
  grupoId: string;
  miembros: { id: string; nombre: string }[];
  diasPlan: DiaPlan[];
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [diaLabel, setDiaLabel] = useState("");
  const [asistentes, setAsistentes] = useState<string[]>(miembros.map((m) => m.id));
  const [comentarios, setComentarios] = useState("");
  const [pesos, setPesos] = useState<Record<string, Record<string, string>>>({});
  const [ultimosPesos, setUltimosPesos] = useState<Record<string, Record<string, number>>>({});
  const [pending, startTransition] = useTransition();
  const [guardadoAt, setGuardadoAt] = useState<number | null>(null);

  const dia = diasPlan.find((d) => d.label === diaLabel);
  // Ids nuevos en cada recálculo (ver ejerciciosDesdeDia) — alcanza para que
  // los pesos editados de un día ya no se mezclen con los de otro, sin
  // necesidad de limpiar `pesos` a mano.
  const ejercicios = useMemo(() => (dia ? ejerciciosDesdeDia(dia) : []), [dia]);

  useEffect(() => {
    if (!diaLabel) return;
    let cancelado = false;
    obtenerUltimosPesosGrupales(miembros.map((m) => m.id), diaLabel).then((data) => {
      if (!cancelado) setUltimosPesos(data);
    });
    return () => {
      cancelado = true;
    };
  }, [diaLabel, miembros]);

  const toggleAsistente = (id: string) => {
    setAsistentes((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const pesoCelda = (miembroId: string, ex: EjercicioSesion) => {
    const editado = pesos[miembroId]?.[ex.id];
    if (editado !== undefined) return editado;
    const ultimo = ultimosPesos[miembroId]?.[ex.nombre];
    return String(ultimo ?? ex.kgReal);
  };

  const cambiarPeso = (miembroId: string, exId: string, value: string) => {
    setPesos((prev) => ({ ...prev, [miembroId]: { ...prev[miembroId], [exId]: value } }));
  };

  const registrar = () => {
    if (!diaLabel || asistentes.length === 0) return;
    const sesionesPorAsistente = asistentes.map((clientId) => ({
      clientId,
      ejercicios: ejercicios.map((ex) => {
        const kgReal = Number(pesoCelda(clientId, ex)) || 0;
        return { ...ex, kgReal, pesosSeriesReal: [] };
      }),
    }));
    startTransition(async () => {
      await crearSesionGrupal({
        grupoId,
        fecha,
        diaPlanLabel: diaLabel,
        comentarios: comentarios.trim(),
        sesionesPorAsistente,
      });
      setComentarios("");
      setPesos({});
      setGuardadoAt(Date.now());
    });
  };

  if (miembros.length === 0) {
    return (
      <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
        Este grupo todavía no tiene miembros — agregalos en la pestaña &quot;Miembros&quot;.
      </p>
    );
  }

  return (
    <div className="dp-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm">
      <p className="dp-muted text-xs">
        Deja registrado que la clase se hizo: cada persona marcada como asistente recibe esta sesión en su
        propia ficha (pestaña Sesiones), con el peso real que anotes acá — así queda de referencia para la
        próxima semana.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-mono outline-none focus:dp-border-brand"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="dp-body font-medium">Día del plan</span>
          <select
            value={diaLabel}
            onChange={(e) => setDiaLabel(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
          >
            <option value="">Selecciona…</option>
            {diasPlan.map((d) => (
              <option key={d.id} value={d.label}>
                {d.label}
                {d.foco ? ` — ${d.foco}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="dp-body mb-1.5 text-sm font-medium">¿Quién asistió?</p>
        <div className="flex flex-wrap gap-2">
          {miembros.map((m) => {
            const asistio = asistentes.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAsistente(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  asistio ? "dp-bg-brand text-white" : "dp-bg-faint dp-muted line-through"
                }`}
              >
                {m.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {diaLabel && (
        <div className="overflow-x-auto">
          {ejercicios.length === 0 ? (
            <p className="dp-muted text-xs">Este día no tiene ejercicios cargados en la planificación todavía.</p>
          ) : (
            <>
              <p className="dp-muted mb-1 text-[11px]">
                Precargado con el peso de la última vez que se hizo este día (si lo tenés) — ajustalo según lo
                que haga cada uno hoy.
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="dp-muted sticky left-0 bg-inherit px-2 py-1 text-left text-[10px] font-medium uppercase">
                      Persona
                    </th>
                    {ejercicios.map((ex) => (
                      <th key={ex.id} className="dp-muted min-w-20 px-1 py-1 text-[10px] font-medium">
                        {ex.nombre} (kg)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {miembros.map((m) => {
                    const asistio = asistentes.includes(m.id);
                    return (
                      <tr key={m.id} className={`border-t border-black/5 ${asistio ? "" : "opacity-40"}`}>
                        <td className="dp-text-heading sticky left-0 bg-inherit px-2 py-1 text-sm font-medium whitespace-nowrap">
                          {m.nombre}
                        </td>
                        {ejercicios.map((ex) => (
                          <td key={ex.id} className="px-1 py-1">
                            <input
                              type="number"
                              disabled={!asistio}
                              value={pesoCelda(m.id, ex)}
                              onChange={(e) => cambiarPeso(m.id, ex.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className={inputClass}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="dp-body font-medium">Comentarios de la clase (opcional)</span>
        <textarea
          rows={2}
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          placeholder="Ej: grupo rindió bien, bajamos intensidad por calor, etc."
          className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:dp-border-brand"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={registrar}
          disabled={!diaLabel || asistentes.length === 0 || pending}
          className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Registrando…" : "Registrar sesión grupal"}
        </button>
        {guardadoAt && !pending && (
          <span className="dp-muted text-xs">Guardado en la ficha de cada asistente.</span>
        )}
      </div>
    </div>
  );
}
