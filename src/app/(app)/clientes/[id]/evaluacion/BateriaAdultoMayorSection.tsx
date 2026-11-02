"use client";

import { useState, useTransition } from "react";
import { crearBateriaAdultoMayor, eliminarBateriaAdultoMayor } from "./actions";
import type { BateriaAdultoMayorEntry } from "@/lib/dipra/types";

type CampoKey =
  | "tug_segundos"
  | "sit_to_stand_reps"
  | "balance_unipodal_der_segundos"
  | "balance_unipodal_izq_segundos"
  | "step_up_reps"
  | "velocidad_marcha_mseg";

type Draft = Record<CampoKey, string> & { fecha: string; notas: string };

const CAMPOS: { key: CampoKey; label: string; unidad: string; ayuda: string }[] = [
  {
    key: "tug_segundos",
    label: "Timed Up and Go (TUG)",
    unidad: "seg",
    ayuda: "Levantarse, caminar 3 m, girar y sentarse. ≥13.5 s = riesgo de caída elevado.",
  },
  {
    key: "sit_to_stand_reps",
    label: "Sit to Stand (30 seg)",
    unidad: "reps",
    ayuda: "Repeticiones completas de sentarse-levantarse en 30 segundos (Senior Fitness Test).",
  },
  {
    key: "balance_unipodal_der_segundos",
    label: "Balance unipodal · derecho",
    unidad: "seg",
    ayuda: "Tiempo parado en un pie sin apoyo. <5 s = riesgo de caída elevado.",
  },
  {
    key: "balance_unipodal_izq_segundos",
    label: "Balance unipodal · izquierdo",
    unidad: "seg",
    ayuda: "Tiempo parado en un pie sin apoyo. <5 s = riesgo de caída elevado.",
  },
  {
    key: "step_up_reps",
    label: "Step up test",
    unidad: "reps",
    ayuda: "Repeticiones de subida a cajón/escalón en tiempo fijo — capacidad funcional de tren inferior.",
  },
  {
    key: "velocidad_marcha_mseg",
    label: "Velocidad de marcha",
    unidad: "m/seg",
    ayuda: "Sobre 4 metros a paso habitual. El predictor individual más validado de mortalidad/movilidad en adultos mayores.",
  },
];

function draftVacio(): Draft {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
    tug_segundos: "",
    sit_to_stand_reps: "",
    balance_unipodal_der_segundos: "",
    balance_unipodal_izq_segundos: "",
    step_up_reps: "",
    velocidad_marcha_mseg: "",
  };
}

function fmtFecha(f: string) {
  const d = new Date(f + "T00:00:00");
  return isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
}

function riesgoDeCaida(e: {
  tug_segundos: number | null;
  balance_unipodal_der_segundos: number | null;
  balance_unipodal_izq_segundos: number | null;
}) {
  return (
    (e.tug_segundos !== null && e.tug_segundos >= 13.5) ||
    (e.balance_unipodal_der_segundos !== null && e.balance_unipodal_der_segundos < 5) ||
    (e.balance_unipodal_izq_segundos !== null && e.balance_unipodal_izq_segundos < 5)
  );
}

export function BateriaAdultoMayorSection({
  clienteId,
  initialItems,
}: {
  clienteId: string;
  initialItems: BateriaAdultoMayorEntry[];
}) {
  const [items, setItems] = useState<BateriaAdultoMayorEntry[]>(
    [...initialItems].sort((a, b) => b.fecha.localeCompare(a.fecha))
  );
  const [abierto, setAbierto] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftVacio());
  const [pending, startTransition] = useTransition();

  const abrirNueva = () => {
    setDraft(draftVacio());
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  const setCampo = (key: CampoKey, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const draftNums = Object.fromEntries(
    CAMPOS.map((c) => [c.key, draft[c.key] === "" ? null : Number(draft[c.key])])
  ) as Record<CampoKey, number | null>;
  const alertaDraft = riesgoDeCaida(draftNums);

  const guardar = () => {
    if (!draft.fecha) return;
    startTransition(async () => {
      const input = {
        fecha: draft.fecha,
        notas: draft.notas,
        ...draftNums,
      } as Omit<BateriaAdultoMayorEntry, "id" | "client_id" | "created_at">;
      const nueva = await crearBateriaAdultoMayor(clienteId, input);
      setItems((prev) => [nueva, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setAbierto(false);
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta batería adulto mayor? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarBateriaAdultoMayor(clienteId, id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    });
  };

  return (
    <section className="dp-surface rounded-2xl p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium dp-text-heading">Batería adulto mayor</h2>
        {!abierto && (
          <button
            type="button"
            onClick={abrirNueva}
            className="dp-bg-brand rounded-lg px-3.5 py-1.5 text-sm font-medium text-white"
          >
            + Nueva batería
          </button>
        )}
      </div>
      <p className="dp-muted mb-3 text-xs">
        TUG, sit-to-stand, balance unipodal, step up y velocidad de marcha — tests funcionales validados
        para riesgo de caída y capacidad física en adultos mayores.
      </p>

      {items.length === 0 && !abierto ? (
        <p className="dp-muted py-3 text-center text-sm">Sin baterías registradas todavía.</p>
      ) : (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {items.map((it) => {
            const alerta = riesgoDeCaida(it);
            return (
              <div key={it.id} className="dp-bg-faint flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px]">
                <span className="dp-muted font-mono">{fmtFecha(it.fecha)}</span>
                {alerta && (
                  <span className="dp-bg-alert rounded-full px-1.5 py-0.5 font-semibold text-white">
                    riesgo caída
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => eliminar(it.id)}
                  disabled={pending}
                  className="dp-muted hover:dp-alert disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {abierto && (
        <div className="border-t border-black/5 pt-4">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <span className="dp-body font-medium">Fecha</span>
            <input
              type="date"
              value={draft.fecha}
              onChange={(e) => setDraft((prev) => ({ ...prev, fecha: e.target.value }))}
              className="rounded-lg border border-black/10 px-2 py-1 font-mono text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <div className="flex flex-col gap-2.5">
            {CAMPOS.map((c) => (
              <div key={c.key} className="border-b border-black/5 pb-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="dp-body text-sm font-medium">{c.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={draft[c.key]}
                      onChange={(e) => setCampo(c.key, e.target.value)}
                      className="w-20 rounded-md border border-black/10 px-1.5 py-0.5 text-center font-mono text-sm outline-none focus:dp-border-brand"
                    />
                    <span className="dp-muted text-xs">{c.unidad}</span>
                  </div>
                </div>
                <p className="dp-muted mt-0.5 text-[11px] leading-snug">{c.ayuda}</p>
              </div>
            ))}
          </div>

          {alertaDraft && (
            <div className="dp-bg-faint dp-card-accent dp-border-alert mt-3 rounded-xl p-3">
              <p className="text-sm font-medium dp-text-heading">Riesgo de caída elevado</p>
              <p className="dp-body mt-1 text-xs leading-relaxed">
                TUG ≥13.5 s y/o balance unipodal &lt;5 s en alguno de los lados. Considerá complementar con un
                cuestionario instrumental de riesgo de caída (tipo FES-I) para dimensionar el miedo a caer y
                priorizar la intervención.
              </p>
            </div>
          )}

          <label className="mt-3 block">
            <span className="dp-muted text-[10px] font-medium uppercase tracking-wide">Notas</span>
            <textarea
              value={draft.notas}
              onChange={(e) => setDraft((prev) => ({ ...prev, notas: e.target.value }))}
              rows={2}
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1 text-sm outline-none focus:dp-border-brand"
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={pending || !draft.fecha}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar batería"}
            </button>
            <button type="button" onClick={cerrar} disabled={pending} className="dp-muted text-sm hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
