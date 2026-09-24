"use client";

import { useState, useTransition } from "react";
import { crearPrHistorial, type NuevaMedicionInput } from "./actions";
import { GRUPOS, METRICS, nuevoDraft } from "./metricas";

const inputClass = "rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand";

/**
 * Formulario de carga de una nueva medición de rendimiento (fuerza, saltos,
 * fuerza funcional). Vive acá porque persiste en la misma tabla
 * (client_pr_historial) que muestra el historial/gráficos de la pestaña
 * Evolución — pero se usa también, sin los gráficos, desde Evaluación
 * (donde solo hace falta cargar el dato, no ver la evolución histórica).
 */
export function NuevaMedicionForm({
  clienteId,
  tituloBoton = "+ Nuevo registro de mesociclo",
}: {
  clienteId: string;
  tituloBoton?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(nuevoDraft());
  const [pending, startTransition] = useTransition();

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
    };
    METRICS.forEach((m) => {
      entrada[m.key] = Number(draft[m.key]) || 0;
    });
    startTransition(async () => {
      await crearPrHistorial(clienteId, entrada);
      setDraft(nuevoDraft());
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
