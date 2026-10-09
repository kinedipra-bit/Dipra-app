"use client";

import { useState, useTransition } from "react";
import { crearMetricaExtra, crearPrHistorial, eliminarMetricaExtra, type NuevaMedicionInput } from "./actions";
import { GRUPOS, METRICS, nuevoDraft } from "./metricas";
import type { MetricaExtra } from "@/lib/dipra/types";

const inputClass = "rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand";

/**
 * Formulario de carga de una nueva medición de rendimiento (fuerza, saltos,
 * fuerza funcional). Vive acá porque persiste en la misma tabla
 * (client_pr_historial) que muestra el historial/gráficos de la pestaña
 * Evolución — pero se usa también, sin los gráficos, desde Evaluación
 * (donde solo hace falta cargar el dato, no ver la evolución histórica).
 *
 * Además de las métricas fijas, permite agregar nuevos ejercicios a seguir
 * (ej. "RDL") — quedan disponibles para siempre (ver metricasExtra), acá y
 * en los gráficos de Evolución si el padre escucha onMetricasExtraChange.
 */
export function NuevaMedicionForm({
  clienteId,
  tituloBoton = "+ Nuevo registro de mesociclo",
  metricasExtraIniciales = [],
  onMetricasExtraChange,
}: {
  clienteId: string;
  tituloBoton?: string;
  metricasExtraIniciales?: MetricaExtra[];
  onMetricasExtraChange?: (metricas: MetricaExtra[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ ...nuevoDraft(), extra: {} as Record<string, string> });
  const [metricasExtra, setMetricasExtra] = useState(metricasExtraIniciales);
  const [mostrarNuevoEjercicio, setMostrarNuevoEjercicio] = useState(false);
  const [nuevoEjercicioLabel, setNuevoEjercicioLabel] = useState("");
  const [alcanceNuevoEjercicio, setAlcanceNuevoEjercicio] = useState<"cliente" | "general">("cliente");
  const [pending, startTransition] = useTransition();
  const [creandoEjercicio, startCrearEjercicio] = useTransition();

  const actualizarMetricasExtra = (next: MetricaExtra[]) => {
    setMetricasExtra(next);
    onMetricasExtraChange?.(next);
  };

  const agregarEjercicio = () => {
    if (!nuevoEjercicioLabel.trim()) return;
    startCrearEjercicio(async () => {
      const creada = await crearMetricaExtra(
        clienteId,
        alcanceNuevoEjercicio === "general" ? null : clienteId,
        nuevoEjercicioLabel.trim()
      );
      actualizarMetricasExtra([...metricasExtra, creada]);
      setNuevoEjercicioLabel("");
      setMostrarNuevoEjercicio(false);
    });
  };

  const quitarEjercicio = (m: MetricaExtra) => {
    if (!confirm(`¿Quitar "${m.label}" de la lista? Los valores ya cargados no se borran.`)) return;
    startCrearEjercicio(async () => {
      await eliminarMetricaExtra(clienteId, m.id);
      actualizarMetricasExtra(metricasExtra.filter((x) => x.id !== m.id));
    });
  };

  const agregar = () => {
    if (!draft.mesociclo.trim()) return;
    const entrada: NuevaMedicionInput = {
      fecha: draft.fecha,
      mesociclo: draft.mesociclo.trim(),
      objetivo: draft.objetivo.trim(),
      sentadilla: 0,
      peso_muerto: 0,
      press_banca: 0,
      press_militar: 0,
      broad_jump: 0,
      abalakov_jump: 0,
      cmj: 0,
      squat_jump: 0,
      agarre_der: 0,
      agarre_izq: 0,
      dead_hang: 0,
      pull_ups: 0,
      push_up: 0,
      plancha_frontal: 0,
      plancha_lateral_der: 0,
      plancha_lateral_izq: 0,
      pararse_del_suelo: 0,
      extra: Object.fromEntries(metricasExtra.map((m) => [m.id, Number(draft.extra[m.id]) || 0])),
    };
    METRICS.forEach((m) => {
      entrada[m.key] = Number(draft[m.key]) || 0;
    });
    startTransition(async () => {
      await crearPrHistorial(clienteId, entrada);
      setDraft({ ...nuevoDraft(), extra: {} });
      setShowAdd(false);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          {tituloBoton}
        </button>
      </div>

      {showAdd && (
        <div className="dp-surface flex flex-col gap-3 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Fecha</span>
              <input
                type="date"
                value={draft.fecha}
                onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Mesociclo</span>
              <input
                value={draft.mesociclo}
                onChange={(e) => setDraft({ ...draft, mesociclo: e.target.value })}
                placeholder="Ej. Mesociclo 5"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="dp-body font-medium">Objetivo de la fase</span>
              <input
                value={draft.objetivo}
                onChange={(e) => setDraft({ ...draft, objetivo: e.target.value })}
                placeholder="Ej. Fuerza máxima / Fuerza explosiva / Pliometría"
                className={inputClass}
              />
            </label>
          </div>
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="dp-text-brand mb-1.5 text-xs font-semibold uppercase tracking-wide">{g.titulo}</p>
              <div className="grid grid-cols-4 gap-3">
                {g.metrics.map((m) => (
                  <label key={m.key} className="flex flex-col gap-1 text-[11px]">
                    <span className="dp-body font-medium">{m.label}</span>
                    <input
                      type="number"
                      value={draft[m.key]}
                      onChange={(e) => setDraft({ ...draft, [m.key]: e.target.value })}
                      className={`${inputClass} font-mono`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="dp-text-brand text-xs font-semibold uppercase tracking-wide">Personalizados</p>
              <button
                type="button"
                onClick={() => setMostrarNuevoEjercicio((v) => !v)}
                className="dp-text-brand text-xs font-medium hover:underline"
              >
                + Agregar ejercicio
              </button>
            </div>

            {mostrarNuevoEjercicio && (
              <div className="dp-bg-faint mb-2 flex flex-col gap-2 rounded-xl p-3">
                <input
                  value={nuevoEjercicioLabel}
                  onChange={(e) => setNuevoEjercicioLabel(e.target.value)}
                  placeholder="Ej. RDL (peso muerto rumano)"
                  className={inputClass}
                />
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={alcanceNuevoEjercicio === "cliente"}
                      onChange={() => setAlcanceNuevoEjercicio("cliente")}
                    />
                    Solo para este cliente
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={alcanceNuevoEjercicio === "general"}
                      onChange={() => setAlcanceNuevoEjercicio("general")}
                    />
                    General (disponible para todos)
                  </label>
                </div>
                <button
                  type="button"
                  onClick={agregarEjercicio}
                  disabled={!nuevoEjercicioLabel.trim() || creandoEjercicio}
                  className="dp-bg-brand w-fit rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {creandoEjercicio ? "Agregando…" : "Agregar"}
                </button>
              </div>
            )}

            {metricasExtra.length === 0 ? (
              <p className="dp-muted text-xs">Todavía no agregaste ningún ejercicio personalizado.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {metricasExtra.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1 text-[11px]">
                    <span className="dp-body flex items-center justify-between gap-1 font-medium">
                      <span className="truncate">{m.label}</span>
                      <button
                        type="button"
                        onClick={() => quitarEjercicio(m)}
                        disabled={creandoEjercicio}
                        className="dp-muted hover:dp-alert shrink-0 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </span>
                    <input
                      type="number"
                      value={draft.extra[m.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, extra: { ...draft.extra, [m.id]: e.target.value } })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={agregar}
            disabled={!draft.mesociclo.trim() || pending}
            className="dp-bg-brand w-fit rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "Guardando…" : "Guardar registro"}
          </button>
        </div>
      )}
    </div>
  );
}
