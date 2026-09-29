"use client";

import { useState, useTransition } from "react";
import { blockTemplate } from "@/lib/dipra/constants";
import type { BloquePlan, DiaPlan, EjercicioBiblioteca, EjercicioPlan, PlanKine } from "@/lib/dipra/types";
import { compartirPlanKine, guardarPlanKine } from "./actions";
import { ExerciseRow } from "../plan/ExerciseRow";
import { ResumenDia } from "../plan/ResumenDia";
import { guardarEnBiblioteca } from "../plan/actions";

type Vista = "editar" | "resumen";

function nuevoEjercicio(): EjercicioPlan {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    series: 3,
    reps: 10,
    kg: 0,
    link: "",
    rpe: "",
    rir: "",
    tut: "",
    descanso: "",
    comentarioCliente: "",
  };
}

function nuevoDia(numero: number): DiaPlan {
  return { id: crypto.randomUUID(), label: `Sesión ${numero}`, foco: "", bloques: blockTemplate() };
}

/**
 * Plan de kinesiología/rehabilitación — pestaña "Tareas". Independiente del
 * plan de fuerza y sin el concepto de semanas: un solo set de días en curso
 * que se va editando directo (a diferencia del plan de fuerza, acá no hay
 * "Semana 2", "Semana 3"...). Mismo mecanismo de "Compartir" que el plan de
 * fuerza: el cliente solo ve `dias_publicado`, nunca el borrador en vivo.
 */
export function KinePlanView({
  clienteId,
  planInicial,
  bibliotecaInicial,
}: {
  clienteId: string;
  planInicial: PlanKine;
  bibliotecaInicial: EjercicioBiblioteca[];
}) {
  const [plan, setPlan] = useState(planInicial);
  const [dias, setDias] = useState<DiaPlan[]>(planInicial.dias);
  const [diaIdx, setDiaIdx] = useState(0);
  const [vista, setVista] = useState<Vista>("editar");
  const [biblioteca, setBiblioteca] = useState<EjercicioBiblioteca[]>(bibliotecaInicial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [sharedAt, setSharedAt] = useState<number | null>(null);

  const [guardando, startGuardar] = useTransition();
  const [compartiendo, startCompartir] = useTransition();

  const dia = dias[diaIdx];

  const updateDia = (nextDia: DiaPlan) => {
    setDias((prev) => prev.map((d, i) => (i === diaIdx ? nextDia : d)));
  };

  const addDia = () => {
    const nextDias = [...dias, nuevoDia(dias.length + 1)];
    setDias(nextDias);
    setDiaIdx(nextDias.length - 1);
  };
  const removeDia = (idx: number) => {
    if (dias.length <= 1) return;
    if (!window.confirm(`¿Eliminar "${dias[idx].label}"? Se van a perder todos sus bloques y ejercicios.`)) return;
    const nextDias = dias.filter((_, i) => i !== idx);
    setDias(nextDias);
    setDiaIdx((prev) => Math.min(prev, nextDias.length - 1));
  };
  const renameDia = (idx: number, label: string) => {
    setDias((prev) => prev.map((d, i) => (i === idx ? { ...d, label } : d)));
  };

  const addBloque = () => {
    if (!dia) return;
    updateDia({ ...dia, bloques: [...dia.bloques, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] }] });
  };
  const insertBloqueAfter = (bIdx: number) => {
    if (!dia) return;
    const nextBloques = [...dia.bloques];
    nextBloques.splice(bIdx + 1, 0, { id: crypto.randomUUID(), title: "Nuevo bloque", exercises: [] });
    updateDia({ ...dia, bloques: nextBloques });
  };
  const renameBloque = (bIdx: number, title: string) => {
    if (!dia) return;
    updateDia({ ...dia, bloques: dia.bloques.map((b, i) => (i === bIdx ? { ...b, title } : b)) });
  };
  const removeBloque = (bIdx: number) => {
    if (!dia) return;
    updateDia({ ...dia, bloques: dia.bloques.filter((_, i) => i !== bIdx) });
  };

  const addExercise = (bIdx: number) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b, i) => (i === bIdx ? { ...b, exercises: [...b.exercises, nuevoEjercicio()] } : b));
    updateDia({ ...dia, bloques: nextBloques });
  };
  const changeExercise = (bIdx: number, eIdx: number, nextEx: EjercicioPlan) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b: BloquePlan, i) =>
      i === bIdx ? { ...b, exercises: b.exercises.map((e, j) => (j === eIdx ? nextEx : e)) } : b
    );
    updateDia({ ...dia, bloques: nextBloques });
  };
  const removeExercise = (bIdx: number, eIdx: number) => {
    if (!dia) return;
    const nextBloques = dia.bloques.map((b, i) => (i === bIdx ? { ...b, exercises: b.exercises.filter((_, j) => j !== eIdx) } : b));
    updateDia({ ...dia, bloques: nextBloques });
  };

  const guardarEjercicioEnBiblioteca = async (ex: { nombre: string; link: string }) => {
    const creado = await guardarEnBiblioteca(ex.nombre, ex.link);
    setBiblioteca((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const guardarCambios = () => {
    startGuardar(async () => {
      await guardarPlanKine(clienteId, dias);
      setPlan((prev) => ({ ...prev, dias, cambios_sin_compartir: true }));
      setSavedAt(Date.now());
    });
  };

  const compartir = () => {
    startCompartir(async () => {
      await compartirPlanKine(clienteId);
      setPlan((prev) => ({ ...prev, dias_publicado: dias, cambios_sin_compartir: false }));
      setSharedAt(Date.now());
    });
  };

  if (dias.length === 0) {
    return (
      <div className="dp-surface flex flex-col items-center gap-3 rounded-2xl p-8 text-center shadow-sm">
        <p className="dp-muted text-sm">
          Todavía no hay tareas/ejercicios de kine cargados para este cliente.
        </p>
        <button
          type="button"
          onClick={addDia}
          className="dp-bg-brand rounded-lg px-4 py-2 text-sm font-medium text-white"
        >
          + Agregar primera sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="dp-muted -mt-1 text-xs">
        Plan de kinesiología/rehabilitación — independiente de la rutina de fuerza. El cliente lo ve en la pestaña
        &quot;Tareas&quot; de su portal, recién cuando lo compartís.
      </p>

      <datalist id="biblioteca-datalist-kine">
        {biblioteca.map((b) => (
          <option key={b.id} value={b.nombre} />
        ))}
      </datalist>

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "editar", label: "Editar" },
            { id: "resumen", label: "Resumen" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVista(v.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v.id ? "dp-bg-brand text-white" : "dp-bg-faint dp-body"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vista === "resumen" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {dias.map((d) => (
            <div key={d.id} className="w-72 shrink-0">
              <ResumenDia dia={d} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {dias.map((d, i) => (
              <div key={d.id} className={`flex items-center gap-0.5 rounded-lg ${i === diaIdx ? "dp-bg-ink" : "dp-bg-faint"}`}>
                <button
                  type="button"
                  onClick={() => setDiaIdx(i)}
                  className={`rounded-lg py-1.5 pl-3 text-sm font-medium transition-colors ${
                    i === diaIdx ? "text-white" : "dp-body"
                  } ${dias.length > 1 ? "pr-1" : "pr-3"}`}
                >
                  {d.label}
                </button>
                {dias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDia(i)}
                    title="Eliminar sesión"
                    className={`pr-2 text-xs ${i === diaIdx ? "text-white/70 hover:text-white" : "dp-muted hover:dp-alert"}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDia}
              className="dp-text-brand rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-xs font-medium"
            >
              + Agregar sesión
            </button>
          </div>

          {dia && (
            <div className="dp-surface rounded-2xl p-5 shadow-sm">
              <input
                value={dia.label}
                onChange={(e) => renameDia(diaIdx, e.target.value)}
                placeholder="Nombre (ej. Sesión 2, Rodilla fase 1)"
                className="dp-ink mb-2 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold outline-none focus:dp-border-brand"
              />
              <input
                value={dia.foco}
                onChange={(e) => updateDia({ ...dia, foco: e.target.value })}
                placeholder="Foco (ej. Movilidad de tobillo / Control motor rodilla)"
                className="mb-4 w-full rounded-lg border border-black/10 px-3 py-1.5 text-sm outline-none focus:dp-border-brand"
              />

              <div className="flex flex-col gap-3">
                {dia.bloques.map((b, bIdx) => (
                  <div key={b.id}>
                    <div className="dp-bg-faint dp-border-brand rounded-xl border-l-4 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <input
                          value={b.title}
                          onChange={(e) => renameBloque(bIdx, e.target.value)}
                          className="dp-ink border-none bg-transparent text-lg font-semibold tracking-wide uppercase outline-none focus:underline"
                          style={{ minWidth: 120 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeBloque(bIdx)}
                          title="Eliminar bloque"
                          className="dp-muted hover:dp-alert text-sm"
                        >
                          ✕
                        </button>
                      </div>

                      {b.exercises.length > 0 && (
                        <div
                          className="dp-muted grid gap-2 pb-1 text-[10px] font-medium tracking-wide uppercase"
                          style={{ gridTemplateColumns: "1.6fr 0.55fr 0.55fr 0.6fr 0.7fr auto" }}
                        >
                          <span>Ejercicio</span>
                          <span className="text-center">Ser.</span>
                          <span className="text-center">Rep.</span>
                          <span className="text-center">Kg</span>
                          <span className="text-right">Vol.</span>
                          <span />
                        </div>
                      )}

                      <div className="divide-y divide-black/5">
                        {b.exercises.map((ex, eIdx) => (
                          <ExerciseRow
                            key={ex.id}
                            ex={ex}
                            onChange={(next) => changeExercise(bIdx, eIdx, next)}
                            onRemove={() => removeExercise(bIdx, eIdx)}
                            biblioteca={biblioteca}
                            onSaveToBiblioteca={guardarEjercicioEnBiblioteca}
                            datalistId="biblioteca-datalist-kine"
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addExercise(bIdx)}
                        className="dp-text-brand mt-2 flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        + Agregar ejercicio
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => insertBloqueAfter(bIdx)}
                      className="dp-muted hover:dp-text-brand mt-1.5 flex w-full items-center justify-center gap-1 py-1 text-[11px] font-medium"
                    >
                      + Insertar bloque aquí
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addBloque}
                className="dp-text-brand mt-5 flex items-center gap-1.5 text-sm font-medium hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={guardarCambios}
              disabled={guardando}
              className="dp-bg-brand rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {savedAt && !guardando && <span className="dp-muted text-xs">Guardado.</span>}

            <button
              type="button"
              onClick={compartir}
              disabled={compartiendo || !plan.cambios_sin_compartir}
              className="dp-bg-ink rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              title="El cliente solo ve cambios cuando compartís"
            >
              {compartiendo ? "Compartiendo…" : "Compartir"}
            </button>
            {sharedAt && !compartiendo ? (
              <span className="dp-text-brand text-xs">✓ Compartido — el cliente ya lo ve.</span>
            ) : plan.cambios_sin_compartir ? (
              <span className="dp-alert text-xs">⚠ Cambios sin compartir</span>
            ) : (
              <span className="dp-muted text-xs">✓ El cliente ve esta versión</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
