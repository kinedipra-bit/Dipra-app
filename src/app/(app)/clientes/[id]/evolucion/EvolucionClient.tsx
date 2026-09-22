"use client";

import { useState, useTransition } from "react";
import { deficitExplosivo, isPR, maxDe } from "@/lib/dipra/calc";
import type { PrHistorialEntry } from "@/lib/dipra/types";
import { crearPrHistorial, eliminarPrHistorial, type NuevaMedicionInput } from "./actions";

type MetricKey =
  | "sentadilla"
  | "peso_muerto"
  | "press_banca"
  | "press_militar"
  | "broad_jump"
  | "abalakov_jump"
  | "cmj"
  | "squat_jump"
  | "agarre_der"
  | "agarre_izq"
  | "dead_hang"
  | "pull_ups"
  | "push_up"
  | "plancha_frontal"
  | "plancha_lateral_der"
  | "plancha_lateral_izq"
  | "pararse_del_suelo";

interface MetricDef {
  key: MetricKey;
  label: string;
}

interface GrupoDef {
  titulo: string;
  metrics: MetricDef[];
}

const GRUPOS: GrupoDef[] = [
  {
    titulo: "Fuerza",
    metrics: [
      { key: "sentadilla", label: "Sentadilla" },
      { key: "peso_muerto", label: "Peso muerto" },
      { key: "press_banca", label: "Press banca" },
      { key: "press_militar", label: "Press militar" },
    ],
  },
  {
    titulo: "Saltos",
    metrics: [
      { key: "broad_jump", label: "Broad jump" },
      { key: "abalakov_jump", label: "Abalakov" },
      { key: "cmj", label: "CMJ" },
      { key: "squat_jump", label: "Squat jump (SJ)" },
    ],
  },
  {
    titulo: "Fuerza funcional",
    metrics: [
      { key: "agarre_der", label: "Fuerza de agarre der. (kg)" },
      { key: "agarre_izq", label: "Fuerza de agarre izq. (kg)" },
      { key: "dead_hang", label: "Dead hang (seg)" },
      { key: "pull_ups", label: "Pull ups (reps)" },
      { key: "push_up", label: "Push up (reps)" },
      { key: "plancha_frontal", label: "Plancha frontal (seg)" },
      { key: "plancha_lateral_der", label: "Plancha lateral der. (seg)" },
      { key: "plancha_lateral_izq", label: "Plancha lateral izq. (seg)" },
      { key: "pararse_del_suelo", label: "Pararse del suelo (puntaje, 10=sin apoyos)" },
    ],
  },
];

type NumericHist = Pick<PrHistorialEntry, MetricKey>;

const METRICS: MetricDef[] = GRUPOS.flatMap((g) => g.metrics);

function camposVacios(): Record<MetricKey, string> {
  return Object.fromEntries(METRICS.map((m) => [m.key, ""])) as Record<MetricKey, string>;
}

function nuevoDraft() {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    mesociclo: "",
    objetivo: "",
    ...camposVacios(),
  };
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

export function EvolucionClient({
  clienteId,
  historialInicial,
}: {
  clienteId: string;
  historialInicial: PrHistorialEntry[];
}) {
  const hist = [...historialInicial].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(nuevoDraft());
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const borrar = (id: string) => {
    if (!confirm("¿Eliminar este registro de mesociclo? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await eliminarPrHistorial(clienteId, id);
      setDeletingId(null);
    });
  };

  const inputClass = "rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="dp-bg-brand rounded-xl px-3.5 py-2 text-sm font-medium text-white"
        >
          + Nuevo registro de mesociclo
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

      {hist.length === 0 ? (
        <p className="dp-muted dp-surface rounded-2xl p-8 text-center text-sm shadow-sm">
          Todavía no hay marcas registradas para este cliente.
        </p>
      ) : (
        <div className="dp-surface rounded-2xl p-5 shadow-sm">
          <h3 className="dp-text-heading mb-1 font-medium">Evolución de marcas</h3>
          <p className="dp-muted mb-4 text-xs">
            Cada columna es un mesociclo — pasa el cursor sobre las barras para ver el detalle.
          </p>

          <div
            className="mb-4 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${hist.length}, minmax(0,1fr))` }}
          >
            {hist.map((h) => (
              <div key={h.id} className="text-center">
                <p className="dp-muted font-mono text-[10px]">{fmtFecha(h.fecha)}</p>
                <p className="dp-text-heading truncate text-[11px] font-semibold">{h.mesociclo}</p>
                {h.objetivo && <p className="dp-text-brand truncate text-[10px]">{h.objetivo}</p>}
                <button
                  type="button"
                  onClick={() => borrar(h.id)}
                  disabled={pending && deletingId === h.id}
                  className="dp-muted mt-0.5 text-[10px] hover:dp-alert disabled:opacity-50"
                >
                  {pending && deletingId === h.id ? "…" : "eliminar"}
                </button>
              </div>
            ))}
          </div>

          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-6 last:mb-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="dp-text-brand text-xs font-semibold uppercase tracking-wide">{g.titulo}</p>
                {g.titulo === "Saltos" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hist.map((h) => {
                      const deficit = deficitExplosivo(h.cmj, h.squat_jump);
                      if (deficit === null) return null;
                      const bajo = deficit < 15;
                      return (
                        <span
                          key={h.id}
                          title={`${h.mesociclo}: (CMJ-SJ)/SJ`}
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium text-white ${
                            bajo ? "dp-bg-alert" : "dp-bg-brand"
                          }`}
                        >
                          Déficit expl. {deficit.toFixed(0)}%
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {g.titulo === "Saltos" &&
                hist.some((h) => {
                  const d = deficitExplosivo(h.cmj, h.squat_jump);
                  return d !== null && d < 15;
                }) && (
                  <p className="dp-alert mb-2 text-[11px]">
                    ⚠ Déficit explosivo bajo 15% — el CMJ casi no mejora al SJ, sugiere poco aprovechamiento del
                    ciclo de estiramiento-acortamiento (foco en trabajo pliométrico/reactivo).
                  </p>
                )}
              <div className="flex flex-col gap-4">
                {g.metrics.map((m) => {
                  const max = maxDe<NumericHist>(hist, m.key);
                  return (
                    <div key={m.key}>
                      <p className="dp-muted mb-1 text-xs font-medium">{m.label}</p>
                      <div className="flex h-16 items-end gap-2">
                        {hist.map((h) => {
                          const v = h[m.key] || 0;
                          const pr = isPR<NumericHist>(hist, m.key, v);
                          return (
                            <div key={h.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                              {pr && <span className="dp-text-amber text-[11px]">★</span>}
                              <div
                                className="dp-bg-brand w-full rounded-t-md"
                                style={{ height: `${(v / max) * 100}%`, opacity: pr ? 1 : 0.55 }}
                                title={`${h.mesociclo} · ${fmtFecha(h.fecha)}: ${v}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1 flex gap-2">
                        {hist.map((h) => (
                          <span key={h.id} className="dp-muted flex-1 text-center font-mono text-[10px]">
                            {h[m.key] || "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
